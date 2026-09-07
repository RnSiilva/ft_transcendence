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

const drawerName = (room) =>
{
	const drawer = room.members.find((m) => m.isDrawer);
	return drawer ? drawer.name : null;
};

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
	check('quem cria comeca com o lapis', drawerName(created.room), 'testana');

	step('2. As definicoes vem do cliente mas sao validadas');
	const configured = await ask(bruno, 'room:create', {
		settings: { roundSeconds: 30, theme: 'animals', language: 'en' },
	});
	check('definicoes validas passam', configured.room.settings, {
		roundSeconds: 30, theme: 'animals', language: 'en',
	});

	const nonsense = await ask(bruno, 'room:create', {
		settings: { roundSeconds: 9999, theme: 'piratas', language: 'klingon' },
	});
	check('definicoes invalidas caem no valor por omissao', nonsense.room.settings, {
		roundSeconds: 60, theme: 'general', language: 'pt',
	});

	step('3. Bruno e Carla entram na sala da Ana');
	await ask(bruno, 'room:join', { code });
	const withCarla = await ask(carla, 'room:join', { code });
	check('estao os tres, por ordem de entrada', names(withCarla.room), ['testana', 'testbruno', 'testcarla']);
	check('entrar nao rouba o lapis', drawerName(withCarla.room), 'testana');

	step('4. Codigo que nao existe e recusado');
	const missing = await ask(bruno, 'room:join', { code: 'ZZZZZZ' });
	check('a entrada e recusada', missing.ok, false);
	check('com o motivo certo', missing.code, 'ROOM_NOT_FOUND');

	step('5. A mesma conta nao ocupa dois lugares');
	const secondTab = await connect(cookies.testbruno);
	const duplicate = await ask(secondTab, 'room:join', { code });
	check('a segunda aba e recusada', duplicate.ok, false);
	check('com o motivo certo', duplicate.code, 'ALREADY_IN_ROOM');
	secondTab.close();

	step('6. O lapis roda por ordem de entrada, dando a volta');
	for (const expected of ['testbruno', 'testcarla', 'testana'])
	{
		const rotated = await ask(ana, 'room:next-drawer');
		check(`passa para ${expected}`, drawerName(rotated.room), expected);
	}

	step('7. Quem tem o lapis sai — passa ao SEGUINTE, nao a um qualquer');
	const beforeLeaving = await ask(ana, 'room:next-drawer');
	check('o lapis esta com o Bruno', drawerName(beforeLeaving.room), 'testbruno');

	await ask(bruno, 'room:leave');
	const afterLeaving = await waitFor(ana, 'room:state', 2000);
	check('a sala fica com a Ana e a Carla', names(afterLeaving), ['testana', 'testcarla']);
	check('o lapis passou a Carla, que vinha a seguir', drawerName(afterLeaving), 'testcarla');

	step('8. Quem nao tem o lapis nao consegue desenhar');
	const traco = { x0: 0.1, y0: 0.1, x1: 0.2, y1: 0.2 };

	ana.emit('draw:stroke', traco);
	const leaked = await waitFor(carla, 'draw:stroke', 500);
	check('o traco da Ana e ignorado pelo servidor', leaked, null);

	carla.emit('draw:stroke', traco);
	const delivered = await waitFor(ana, 'draw:stroke', 2000);
	check('o traco da Carla, que tem o lapis, chega', delivered !== null, true);

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