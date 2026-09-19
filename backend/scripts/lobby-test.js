/**
 * lobby-test.js
 * Drives three socket clients through the waiting-lobby lifecycle. The rules
 * live on the server (sockets/lobby.socket.js), so they are verifiable
 * without a browser — same pattern as rooms-test.js.
 *
 * Rule: a minimum of 3 to START; mid-game it can continue with 2; if only 1
 * remains, round.socket closes the room immediately and nobody keeps points.
 *
 * The 5-minute expiry is tested separately, in unit mode: the module exports
 * sweepOnce(io, now) precisely so the clock can be advanced without waiting
 * 5 minutes.
 *
 *   docker exec backend npm run test:lobby
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
		failures.push(`${label}\n      expected: ${JSON.stringify(expected)}\n      received: ${JSON.stringify(actual)}`);

	console.log(`   ${ok ? 'OK  ' : 'FAIL'} ${label}`);
	return ok;
}

const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));

/** Resolves with the payload of the next `event`, or with `fallback` after ms. */
function nextEvent(socket, event, ms = 2500, fallback = null)
{
	return new Promise((resolve) =>
	{
		const timer = setTimeout(() => resolve(fallback), ms);
		socket.once(event, (payload) =>
		{
			clearTimeout(timer);
			resolve(payload === undefined ? true : payload);
		});
	});
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
		throw new Error(`could not get a session for ${username}: ${response.status}`);

	const cookie = response.headers.getSetCookie().find((c) => c.startsWith('token='));
	if (!cookie)
		throw new Error(`no cookie for ${username}`);

	return cookie.split(';')[0];
}

function connect(cookie)
{
	return new Promise((resolve, reject) =>
	{
		const socket = io(URL, { extraHeaders: { Cookie: cookie }, forceNew: true });
		socket.on('connect', () => resolve(socket));
		socket.on('connect_error', reject);
	});
}

async function cleanup(cookie)
{
	await fetch(`${URL}/auth/account`, { method: 'DELETE', headers: { Cookie: cookie } })
		.catch(() => {});
}

const ask = (socket, event, payload = {}) =>
	new Promise((resolve) => socket.emit(event, payload, resolve));

async function socketSuite()
{
	console.log('\n== lobby via real sockets ==');

	const cookies = await Promise.all(['lobby_ana', 'lobby_bea', 'lobby_carla', 'lobby_dida'].map(session));
	const [A, B, C, D] = await Promise.all(cookies.map(connect));

	// A creates the room and opens it in waiting mode.
	const created = await ask(A, 'room:create', { settings: { language: 'pt' } });
	check('creator opens the room', created.ok, true);
	const code = created.room.code;
	A.emit('lobby:open');

	const phaseAlone = await nextEvent(A, 'lobby:phase');
	check('initial phase is "waiting_players"', phaseAlone && phaseAlone.phase, 'waiting_players');

	// Alone, starting cannot work: nobody receives room:start.
	A.emit('lobby:start', {}, () => {});
	check('the room does not start with 1 player', await nextEvent(A, 'room:start', 1500, 'nada'), 'nada');

	// B joins: 2 is still below the minimum of 3.
	const phaseToB = nextEvent(B, 'lobby:phase', 4000);
	const readyEarly = nextEvent(A, 'lobby:ready', 2500, 'nada');
	await ask(B, 'room:join', { code });
	check('with 2 the phase stays "waiting_players"', (await phaseToB).phase, 'waiting_players');
	check('with 2 the creator still does NOT receive lobby:ready', await readyEarly, 'nada');

	A.emit('lobby:start', {}, () => {});
	check('the room does not start with 2 players', await nextEvent(A, 'room:start', 1500, 'nada'), 'nada');

	// C joins: reaches 3 -> phase changes for everyone and the creator is notified.
	const phaseToAll = nextEvent(B, 'lobby:phase', 4000);
	const readyToA = nextEvent(A, 'lobby:ready', 4000);
	const readyToB = nextEvent(B, 'lobby:ready', 4000, 'nada');
	await ask(C, 'room:join', { code });

	check('at the 3rd, everyone receives the "waiting_creator" phase', (await phaseToAll).phase, 'waiting_creator');
	check('the creator receives lobby:ready on reaching 3', Boolean(await readyToA), true);
	check('lobby:ready does NOT go to the rest', await readyToB, 'nada');

	// D joins to serve as the kick target (leaving 3 to start afterwards).
	await ask(D, 'room:join', { code });
	await wait(300);

	// lobby:start only works when it comes from the creator.
	B.emit('lobby:start', {}, () => {});
	check('lobby:start from a non-creator does not start', await nextEvent(B, 'room:start', 1500, 'nada'), 'nada');

	// lobby:kick only from the creator, and never against oneself.
	const kickByB = await ask(B, 'lobby:kick', { memberId: D.id });
	check('a kick by a non-creator is refused', kickByB.ok, false);

	const kickSelf = await ask(A, 'lobby:kick', { memberId: A.id });
	check('the creator cannot expel themselves', kickSelf.ok, false);

	const kickedD = nextEvent(D, 'lobby:kicked', 3000, 'nada');
	const kickByA = await ask(A, 'lobby:kick', { memberId: D.id });
	check('a kick by the creator works', kickByA.ok, true);
	check('the expelled member receives lobby:kicked', await kickedD, true);

	// Starting by the creator (3 remain) reaches everyone.
	const startToB = nextEvent(B, 'room:start', 3000, 'nada');
	A.emit('lobby:start', {}, () => {});
	check('lobby:start from the creator emits room:start to everyone', await startToB, true);

	A.disconnect(); B.disconnect(); C.disconnect(); D.disconnect();
	await Promise.all(cookies.map(cleanup));
}

async function expirySuite()
{
	console.log('\n== 5-minute expiry (unit mode, with the clock advanced) ==');

	// Fresh modules in THIS process: they do not touch the running server.
	const rooms = require('../src/game/rooms');
	const lobby = require('../src/sockets/lobby.socket');

	const emitted = [];
	const fakeIo = {
		to: (target) => ({ emit: (event) => emitted.push(`${target}:${event}`) }),
		emit: (event) => emitted.push(`*:${event}`),
		sockets: { sockets: new Map() },
	};

	const room = rooms.createRoom('sock-x', { id: 901, username: 'expira_x' });
	rooms.joinRoom('sock-y', room.code, { id: 902, username: 'expira_y' });
	lobby._lobbies.set(room.code, {
		creatorUserId: 901,
		roomName: 'Sala expira',
		waiting: true,
		started: false,
		promptAt: null,
		phase: null,
	});
	room.lobbyWaiting = true;

	// At 4m59s the room is still alive.
	lobby.sweepOnce(fakeIo, room.createdAt.getTime() + 299 * 1000);
	check('at 4m59s the room still exists', Boolean(rooms.getRoom(room.code)), true);

	// At 5m00s it expires: notice emitted and room emptied.
	lobby.sweepOnce(fakeIo, room.createdAt.getTime() + 300 * 1000);
	check('at 5m00s it emits lobby:expired', emitted.includes(`${room.code}:lobby:expired`), true);
	check('the room was emptied and deleted', rooms.getRoom(room.code) ?? 'apagada', 'apagada');
}

(async () =>
{
	await socketSuite();
	await expirySuite();

	console.log(`\n${checks - failures.length}/${checks} checks passed`);
	if (failures.length)
	{
		console.log('\nFailures:');
		failures.forEach((f) => console.log(`   ${f}`));
		process.exit(1);
	}
	process.exit(0);
})().catch((err) =>
{
	console.error('test error:', err.message);
	process.exit(1);
});
