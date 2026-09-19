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
		failures.push(`${label}\n      expected: ${JSON.stringify(expected)}\n      received: ${JSON.stringify(actual)}`);

	console.log(`   ${ok ? 'OK  ' : 'FAIL'} ${label}`);
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
		throw new Error(`could not get a session for ${username}: ${response.status}`);

	const cookie = response.headers.getSetCookie().find((c) => c.startsWith('token='));
	if (!cookie)
		throw new Error(`no session cookie for ${username}`);

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
	console.log(`Connecting to ${URL}`);

	const cookies = {
		testana: await session('testana'),
		testbruno: await session('testbruno'),
		testcarla: await session('testcarla'),
	};

	step('0. No session, no entry');
	const anonymous = await connect('').catch((err) => err);
	check('a connection without a cookie is refused', anonymous instanceof Error, true);

	const ana = await connect(cookies.testana);
	const bruno = await connect(cookies.testbruno);
	const carla = await connect(cookies.testcarla);

	step('1. Ana creates the room');
	const created = await ask(ana, 'room:create', {});
	if (!created.ok)
		throw new Error(created.error);

	const { code } = created.room;
	console.log(`   code: ${code}`);
	check('the code has 6 characters', code.length, 6);
	check('the name comes from the session, not the client', names(created.room), ['testana']);
	check('Ana is the room creator', created.room.creatorId, ana.id);

	step('2. Settings come from the client but are validated');
	const configured = await ask(bruno, 'room:create', {
		settings: { roundSeconds: 30, theme: 'animals', language: 'en' },
	});
	check('valid settings pass', configured.room.settings, {
		rounds: 3, roundSeconds: 30, theme: 'animals', language: 'en', maxPlayers: 6,
	});

	const nonsense = await ask(bruno, 'room:create', {
		settings: { roundSeconds: 9999, theme: 'piratas', language: 'klingon' },
	});
	check('invalid settings fall back to the defaults', nonsense.room.settings, {
		rounds: 3, roundSeconds: 60, theme: 'general', language: 'pt', maxPlayers: 6,
	});

	step('3. Bruno and Carla join Ana\'s room');
	await ask(bruno, 'room:join', { code });
	const withCarla = await ask(carla, 'room:join', { code });
	check('all three are present, in join order', names(withCarla.room), ['testana', 'testbruno', 'testcarla']);

	step('4. A code that does not exist is refused');
	const missing = await ask(bruno, 'room:join', { code: 'ZZZZZZ' });
	check('entry is refused', missing.ok, false);
	check('with the right reason', missing.code, 'ROOM_NOT_FOUND');

	step('5. The same account does not hold two seats: the new connection takes over the seat');
	// The new connection KEEPS the seat (room:replaced dismisses the old one),
	// which clears the phone "zombies" that used to lock the owner out of the
	// room. There is still a single seat per account.
	// room:replaced carries no payload, so the generic waitFor (which resolves
	// with the payload) does not fit — mark true/false by hand.
	const replacedFlag = (socket) => new Promise((resolve) =>
	{
		const timer = setTimeout(() => resolve(false), 2000);
		socket.once('room:replaced', () => { clearTimeout(timer); resolve(true); });
	});

	const replacedPromise = replacedFlag(bruno);
	const secondTab = await connect(cookies.testbruno);
	const duplicate = await ask(secondTab, 'room:join', { code });
	check('the second connection joins', duplicate.ok, true);
	check('no duplicated seat', names(duplicate.room), ['testana', 'testbruno', 'testcarla']);
	check('the old connection is dismissed (room:replaced)', await replacedPromise, true);
	// Give the seat back to the original connection for the next steps.
	const seatBackPromise = replacedFlag(secondTab);
	await ask(bruno, 'room:join', { code });
	await seatBackPromise;
	secondTab.close();
	// Let the room:state broadcasts from the seat swaps settle before step 6,
	// otherwise Ana's waitFor catches a late broadcast from step 5.
	await new Promise((resolve) => setTimeout(resolve, 500));

	step('6. Leaving the room updates who remains for everyone');
	const afterLeavingPromise = waitFor(ana, 'room:state', 2000);
	await ask(bruno, 'room:leave');
	const afterLeaving = await afterLeavingPromise;
	check('the room is left with Ana and Carla', names(afterLeaving), ['testana', 'testcarla']);

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
