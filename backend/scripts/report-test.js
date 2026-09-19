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
		failures.push(`${label}\n      expected: ${JSON.stringify(expected)}\n      received: ${JSON.stringify(actual)}`);

	console.log(`   ${ok ? 'OK  ' : 'FAIL'} ${label}`);
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
		throw new Error(`no session for ${username}: ${response.status}`);

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
	console.log(`room ${code} with three players`);

	step('1. You cannot report yourself');
	const self = await ask(ana, 'report:start', { targetId: ana.id });
	check('refused', self.code, 'CANNOT_REPORT_SELF');

	step('2. Ana reports Carla');
	const flagged = waitFor(carla, 'report:flagged', 2000);
	const opened = waitFor(bruno, 'report:open', 2000);

	const started = await ask(ana, 'report:start', { targetId: carla.id });
	check('the vote opens', started.ok, true);

	const aviso = await opened;
	check('Bruno sees the vote', aviso.name, testUsers.carla);
	check('reporting already counts as one vote', aviso.votes, 1);
	check('with two voters, it needs 2', aviso.needed, 2);
	check('Carla only knows she was reported', await flagged, true);

	step('3. Different votes can exist at the same time');
	const second = await ask(bruno, 'report:start', { targetId: ana.id });
	check('the second vote opens', second.ok, true);

	step('4. The reported player does not vote');
	const ownVote = await ask(carla, 'report:vote', { targetId: carla.id });
	check('refused', ownVote.code, 'CANNOT_VOTE_ON_SELF');

	step('5. The second vote expels');
	const expelled = waitFor(carla, 'report:expelled', 2000);
	const closed = waitFor(ana, 'report:closed', 2000);
	// The expel emits report:closed and room:state back to back, so the listener
	// must be set up before voting, not after.
	const after = waitFor(ana, 'room:state', 2000);

	await ask(bruno, 'report:vote', { targetId: carla.id });

	check('Carla is told she left', await expelled, true);
	check('the room knows she was expelled', (await closed).expelled, true);
	check('Ana and Bruno remain', (await after).members.map((m) => m.name), [testUsers.ana, testUsers.bruno]);

	step('6. With no open vote, there is no voting');
	const noVote = await ask(ana, 'report:vote', { targetId: carla.id });
	check('refused', noVote.code, 'NO_VOTE_OPEN');

	step('7. With two in the room no vote opens');
	const tooFew = await ask(ana, 'report:start', { targetId: bruno.id });
	check('refused', tooFew.code, 'NEED_MORE_PLAYERS');

	console.log(`\n${checks} checks, ${failures.length} failures.`);

	if (failures.length > 0)
	{
		console.error('\nFailed:');
		failures.forEach((f) => console.error(`   - ${f}`));
	}

	[ana, bruno, carla].forEach((s) => s.close());
	process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((err) =>
{
	console.error('\nCrashed:', err.message);
	process.exit(1);
});
