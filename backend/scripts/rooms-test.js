/**
 * rooms-test.js
 * Drives three socket clients through a room's lifecycle. The rules live on
 * the server, so they are verifiable without a browser.
 *
 * Rooms are for registered users, so the test registers three throwaway
 * accounts through the real API and connects with their session cookies —
 * the same path a browser takes. They are deleted again at the end, so no
 * account with a password from the repository is left behind.
 *
 *   docker exec backend npm run test:rooms
 */

const { io } = require('socket.io-client');

const URL = process.env.DEMO_URL || 'http://localhost:4000';
const PASSWORD = 'TestPass123';

let checks = 0;
const failures = [];

function check(label, actual, expected)
{
	checks += 1;

	const ok = JSON.stringify(actual) === JSON.stringify(expected);
	if (!ok)
		failures.push(`${label}\n      esperado: ${JSON.stringify(expected)}\n      recebido: ${JSON.stringify(actual)}`);

	console.log(`   ${ok ? 'OK  ' : 'FALHA'} ${label}`);
	return ok;
}

/**
 * Registers the account, or logs in if it already exists from an earlier run.
 * Returns the session cookie to hand to the socket.
 */
async function session(username)
{
	const email = `${username}@test.local`;

	const registered = await fetch(`${URL}/auth/register`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, username, password: PASSWORD, confirmPassword: PASSWORD }),
	});

	const response = registered.status === 409
		? await fetch(`${URL}/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ login: username, password: PASSWORD }),
		})
		: registered;

	if (!response.ok)
		throw new Error(`nao consegui sessao para ${username}: ${response.status}`);

	const cookie = response.headers.getSetCookie().find((c) => c.startsWith('token='));
	if (!cookie)
		throw new Error(`sem cookie de sessao para ${username}`);

	return cookie.split(';')[0];
}

function ask(socket, event, payload)
{
	return new Promise((resolve, reject) =>
	{
		const timer = setTimeout(() => reject(new Error(`${event} timed out`)), 5000);

		socket.emit(event, payload, (response) =>
		{
			clearTimeout(timer);
			resolve(response);
		});
	});
}

function connect(cookie)
{
	return new Promise((resolve, reject) =>
	{
		const socket = io(URL, {
			transports: ['websocket'],
			extraHeaders: { Cookie: cookie },
		});

		socket.on('connect', () => resolve(socket));
		socket.on('connect_error', reject);
	});
}

/** Resolves with the payload, or null if nothing arrives — used to prove absence. */
function waitFor(socket, event, ms)
{
	return new Promise((resolve) =>
	{
		const timer = setTimeout(() =>
		{
			socket.off(event, onEvent);
			resolve(null);
		}, ms);

		function onEvent(payload)
		{
			clearTimeout(timer);
			socket.off(event, onEvent);
			resolve(payload);
		}

		socket.once(event, onEvent);
	});
}

/** Tolerates a missing room so a timeout reports a failed check, not a crash. */
const names = (room) => room.members.map((m) => m.name);

function step(title)
{
	console.log(`\n${title}`);
}

async function main()
{
	console.log(`A ligar a ${URL}`);

	const cookies = {
		testana: await session('testana'),
		testbruno: await session('testbruno'),
		testcarla: await session('testcarla'),
	};

	step('0. Sem sessao nao se entra');
	const anonymous = await connect('').catch((err) => err);
	check('a ligacao sem cookie e recusada', anonymous instanceof Error, true);

	const ana = await connect(cookies.testana);
	const bruno = await connect(cookies.testbruno);
	const carla = await connect(cookies.testcarla);

	step('1. A Ana cria a sala');
	const created = await ask(ana, 'room:create', {});
	if (!created.ok)
		throw new Error(created.error);

	const { code } = created.room;
	console.log(`   codigo: ${code}`);
	check('o codigo tem 6 caracteres', code.length, 6);
	check('o nome vem da sessao, nao do cliente', names(created.room), ['testana']);
	check('a Ana e a criadora da sala', created.room.creatorId, ana.id);

	step('2. As definicoes vem do cliente mas sao validadas');
	const configured = await ask(bruno, 'room:create', {
		settings: { roundSeconds: 30, theme: 'animals', language: 'en' },
	});
	check('definicoes validas passam', configured.room.settings, {
		rounds: 3, roundSeconds: 30, theme: 'animals', language: 'en',
	});

	const nonsense = await ask(bruno, 'room:create', {
		settings: { roundSeconds: 9999, theme: 'piratas', language: 'klingon' },
	});
	check('definicoes invalidas caem no valor por omissao', nonsense.room.settings, {
		rounds: 3, roundSeconds: 60, theme: 'general', language: 'pt',
	});

	step('3. Bruno e Carla entram na sala da Ana');
	await ask(bruno, 'room:join', { code });
	const withCarla = await ask(carla, 'room:join', { code });
	check('estao os tres, por ordem de entrada', names(withCarla.room), ['testana', 'testbruno', 'testcarla']);

	step('4. Codigo que nao existe e recusado');
	const missing = await ask(bruno, 'room:join', { code: 'ZZZZZZ' });
	check('a entrada e recusada', missing.ok, false);
	check('com o motivo certo', missing.code, 'ROOM_NOT_FOUND');

	step('5. A mesma conta nao ocupa dois lugares: a ligacao nova retoma o lugar');
	// Regra atualizada (2026-09-17, autorizada pelo Thiago): a ligacao nova
	// FICA com o lugar (room:replaced dispensa a antiga) — resolve os
	// "zombies" de telemovel que trancavam o dono fora da sala. Continua a
	// haver um unico lugar por conta.
	// room:replaced nao traz payload, por isso o waitFor generico (que
	// resolve com o payload) nao serve — marca-se true/false a mao.
	const replacedFlag = (socket) => new Promise((resolve) =>
	{
		const timer = setTimeout(() => resolve(false), 2000);
		socket.once('room:replaced', () => { clearTimeout(timer); resolve(true); });
	});

	const replacedPromise = replacedFlag(bruno);
	const secondTab = await connect(cookies.testbruno);
	const duplicate = await ask(secondTab, 'room:join', { code });
	check('a segunda ligacao entra', duplicate.ok, true);
	check('sem lugar duplicado', names(duplicate.room), ['testana', 'testbruno', 'testcarla']);
	check('a ligacao antiga e dispensada (room:replaced)', await replacedPromise, true);
	// Devolve o lugar a ligacao original para os passos seguintes.
	const seatBackPromise = replacedFlag(secondTab);
	await ask(bruno, 'room:join', { code });
	await seatBackPromise;
	secondTab.close();
	// Deixa assentar os room:state das trocas de lugar antes do passo 6,
	// senao o waitFor da Ana apanha um broadcast atrasado do passo 5.
	await new Promise((resolve) => setTimeout(resolve, 500));

	step('6. Sair da sala atualiza quem fica pra todos');
	const afterLeavingPromise = waitFor(ana, 'room:state', 2000);
	await ask(bruno, 'room:leave');
	const afterLeaving = await afterLeavingPromise;
	check('a sala fica com a Ana e a Carla', names(afterLeaving), ['testana', 'testcarla']);

	console.log(`\n${checks} verificacoes, ${failures.length} falhas.`);

	if (failures.length > 0)
	{
		console.error('\nFalhou:');
		failures.forEach((f) => console.error(`   - ${f}`));
	}

	[ana, bruno, carla].forEach((s) => s.close());
	process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((err) =>
{
	console.error('\nRebentou:', err.message);
	process.exit(1);
});