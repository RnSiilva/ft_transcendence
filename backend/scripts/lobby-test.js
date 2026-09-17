/**
 * lobby-test.js
 * Drives three socket clients through the waiting-lobby lifecycle. The rules
 * live on the server (sockets/lobby.socket.js), so they are verifiable
 * without a browser — same pattern as rooms-test.js.
 *
 * REGRA FINAL da equipa (2026-09-16): mínimo de 3 para INICIAR; a meio da
 * partida pode continuar-se com 2; se ficar só 1, o round.socket fecha a
 * sala de imediato e ninguém guarda pontos.
 *
 * A expiração dos 5 minutos é testada à parte, em modo unitário: o módulo
 * exporta sweepOnce(io, now) exatamente para se poder avançar o relógio
 * sem esperar 5 minutos.
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
		failures.push(`${label}\n      esperado: ${JSON.stringify(expected)}\n      recebido: ${JSON.stringify(actual)}`);

	console.log(`   ${ok ? 'OK  ' : 'FALHA'} ${label}`);
	return ok;
}

const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));

/** Resolve com o payload do próximo `event`, ou com `fallback` após ms. */
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
		throw new Error(`nao consegui sessao para ${username}: ${response.status}`);

	const cookie = response.headers.getSetCookie().find((c) => c.startsWith('token='));
	if (!cookie)
		throw new Error(`sem cookie para ${username}`);

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
	console.log('\n== lobby via sockets reais ==');

	const cookies = await Promise.all(['lobby_ana', 'lobby_bea', 'lobby_carla', 'lobby_dida'].map(session));
	const [A, B, C, D] = await Promise.all(cookies.map(connect));

	// A cria a sala e abre-a em modo de espera.
	const created = await ask(A, 'room:create', { settings: { language: 'pt' } });
	check('criador abre a sala', created.ok, true);
	const code = created.room.code;
	A.emit('lobby:open');

	const phaseAlone = await nextEvent(A, 'lobby:phase');
	check('fase inicial e "waiting_players"', phaseAlone && phaseAlone.phase, 'waiting_players');

	// Sozinho, iniciar nao pode funcionar: ninguem recebe room:start.
	A.emit('lobby:start', {}, () => {});
	check('sala nao inicia com 1 jogador', await nextEvent(A, 'room:start', 1500, 'nada'), 'nada');

	// B entra: 2 ainda e abaixo do minimo de 3.
	const phaseToB = nextEvent(B, 'lobby:phase', 4000);
	const readyEarly = nextEvent(A, 'lobby:ready', 2500, 'nada');
	await ask(B, 'room:join', { code });
	check('com 2 a fase continua "waiting_players"', (await phaseToB).phase, 'waiting_players');
	check('com 2 o criador ainda NAO recebe lobby:ready', await readyEarly, 'nada');

	A.emit('lobby:start', {}, () => {});
	check('sala nao inicia com 2 jogadores', await nextEvent(A, 'room:start', 1500, 'nada'), 'nada');

	// C entra: atinge os 3 -> fase muda para todos e o criador e avisado.
	const phaseToAll = nextEvent(B, 'lobby:phase', 4000);
	const readyToA = nextEvent(A, 'lobby:ready', 4000);
	const readyToB = nextEvent(B, 'lobby:ready', 4000, 'nada');
	await ask(C, 'room:join', { code });

	check('ao 3.o todos recebem a fase "waiting_creator"', (await phaseToAll).phase, 'waiting_creator');
	check('criador recebe lobby:ready ao atingir os 3', Boolean(await readyToA), true);
	check('lobby:ready NAO vai aos restantes', await readyToB, 'nada');

	// D entra para servir de alvo do kick (sobrando 3 para iniciar depois).
	await ask(D, 'room:join', { code });
	await wait(300);

	// lobby:start so funciona vindo do criador.
	B.emit('lobby:start', {}, () => {});
	check('lobby:start de nao-criador nao inicia', await nextEvent(B, 'room:start', 1500, 'nada'), 'nada');

	// lobby:kick so do criador, e nunca contra si mesmo.
	const kickByB = await ask(B, 'lobby:kick', { memberId: D.id });
	check('kick por nao-criador e recusado', kickByB.ok, false);

	const kickSelf = await ask(A, 'lobby:kick', { memberId: A.id });
	check('criador nao se pode expulsar a si mesmo', kickSelf.ok, false);

	const kickedD = nextEvent(D, 'lobby:kicked', 3000, 'nada');
	const kickByA = await ask(A, 'lobby:kick', { memberId: D.id });
	check('kick pelo criador funciona', kickByA.ok, true);
	check('expulso recebe lobby:kicked', await kickedD, true);

	// Iniciar pelo criador (ficaram 3) chega a toda a gente.
	const startToB = nextEvent(B, 'room:start', 3000, 'nada');
	A.emit('lobby:start', {}, () => {});
	check('lobby:start do criador emite room:start a todos', await startToB, true);

	A.disconnect(); B.disconnect(); C.disconnect(); D.disconnect();
	await Promise.all(cookies.map(cleanup));
}

async function expirySuite()
{
	console.log('\n== expiracao dos 5 minutos (unitario, com o relogio avancado) ==');

	// Modulos frescos NESTE processo: nao mexem no servidor que esta a correr.
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

	// Aos 4m59s a sala ainda vive.
	lobby.sweepOnce(fakeIo, room.createdAt.getTime() + 299 * 1000);
	check('aos 4m59s a sala ainda existe', Boolean(rooms.getRoom(room.code)), true);

	// Aos 5m00s expira: aviso emitido e sala esvaziada.
	lobby.sweepOnce(fakeIo, room.createdAt.getTime() + 300 * 1000);
	check('aos 5m00s emite lobby:expired', emitted.includes(`${room.code}:lobby:expired`), true);
	check('a sala foi esvaziada e apagada', rooms.getRoom(room.code) ?? 'apagada', 'apagada');
}

(async () =>
{
	await socketSuite();
	await expirySuite();

	console.log(`\n${checks - failures.length}/${checks} verificacoes passaram`);
	if (failures.length)
	{
		console.log('\nFalhas:');
		failures.forEach((f) => console.log(`   ${f}`));
		process.exit(1);
	}
	process.exit(0);
})().catch((err) =>
{
	console.error('erro no teste:', err.message);
	process.exit(1);
});
