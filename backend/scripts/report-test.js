/**
 * report-test.js
 * Reporting a player, voting, and being removed from the room.
 *
 *   docker exec backend npm run test:report
 */

const { io } = require('socket.io-client');

const URL = process.env.DEMO_URL || 'http://localhost:4000';
const PASSWORD = 'TestPass123';
const runTag = Date.now().toString(36).slice(-6);
const testUsers = {
	ana: `testana_${runTag}`,
	bruno: `testbruno_${runTag}`,
	carla: `testcarla_${runTag}`,
};

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
		throw new Error(`sem sessao para ${username}: ${response.status}`);

	return response.headers.getSetCookie().find((c) => c.startsWith('token=')).split(';')[0];
}

const connect = (cookie) => new Promise((resolve, reject) =>
{
	const socket = io(URL, { transports: ['websocket'], extraHeaders: { Cookie: cookie } });
	socket.on('connect', () => resolve(socket));
	socket.on('connect_error', reject);
});

const ask = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));

function waitFor(socket, event, ms)
{
	return new Promise((resolve) =>
	{
		const timer = setTimeout(() => { socket.off(event, on); resolve(null); }, ms);
		function on(payload) { clearTimeout(timer); socket.off(event, on); resolve(payload ?? true); }
		socket.once(event, on);
	});
}

function step(title)
{
	console.log(`\n${title}`);
}

async function main()
{
	const ana = await connect(await session(testUsers.ana));
	const bruno = await connect(await session(testUsers.bruno));
	const carla = await connect(await session(testUsers.carla));

	const created = await ask(ana, 'room:create', {});
	const { code } = created.room;
	await ask(bruno, 'room:join', { code });
	await ask(carla, 'room:join', { code });
	console.log(`sala ${code} com tres jogadores`);

	step('1. Nao se pode denunciar a si proprio');
	const self = await ask(ana, 'report:start', { targetId: ana.id });
	check('recusado', self.code, 'CANNOT_REPORT_SELF');

	step('2. A Ana denuncia a Carla');
	const flagged = waitFor(carla, 'report:flagged', 2000);
	const opened = waitFor(bruno, 'report:open', 2000);

	const started = await ask(ana, 'report:start', { targetId: carla.id });
	check('a votacao abre', started.ok, true);

	const aviso = await opened;
	check('o Bruno ve a votacao', aviso.name, testUsers.carla);
	check('denunciar ja conta como um voto', aviso.votes, 1);
	check('com dois votantes, precisa de 2', aviso.needed, 2);
	check('a Carla so sabe que foi denunciada', await flagged, true);

	step('3. Podem existir votacoes diferentes ao mesmo tempo');
	const second = await ask(bruno, 'report:start', { targetId: ana.id });
	check('a segunda votacao abre', second.ok, true);

	step('4. Quem e denunciado nao vota');
	const ownVote = await ask(carla, 'report:vote', { targetId: carla.id });
	check('recusado', ownVote.code, 'CANNOT_VOTE_ON_SELF');

	step('5. O segundo voto expulsa');
	const expelled = waitFor(carla, 'report:expelled', 2000);
	const closed = waitFor(ana, 'report:closed', 2000);
	// O expel manda report:closed e room:state seguidos, por isso a escuta
	// tem de estar montada antes de votar e nao depois.
	const after = waitFor(ana, 'room:state', 2000);

	await ask(bruno, 'report:vote', { targetId: carla.id });

	check('a Carla e avisada de que saiu', await expelled, true);
	check('a sala sabe que foi expulsa', (await closed).expelled, true);
	check('ficam a Ana e o Bruno', (await after).members.map((m) => m.name), [testUsers.ana, testUsers.bruno]);

	step('6. Sem votacao aberta nao se vota');
	const noVote = await ask(ana, 'report:vote', { targetId: carla.id });
	check('recusado', noVote.code, 'NO_VOTE_OPEN');

	step('7. Com dois na sala nao se abre votacao');
	const tooFew = await ask(ana, 'report:start', { targetId: bruno.id });
	check('recusado', tooFew.code, 'NEED_MORE_PLAYERS');

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
