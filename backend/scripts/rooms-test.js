/**
 * rooms-test.js
 * Drives three socket clients through a room's lifecycle. The rules live on
 * the server, so they are verifiable without a browser.
 *
 *   docker exec backend npm run test:rooms
 */

const { io } = require('socket.io-client');

const URL = process.env.DEMO_URL || 'http://localhost:4000';

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

function connect()
{
	return new Promise((resolve, reject) =>
	{
		const socket = io(URL, { transports: ['websocket'] });

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

	const ana = await connect();
	const bruno = await connect();
	const carla = await connect();

	step('1. Ana cria a sala');
	const created = await ask(ana, 'room:create', { name: 'Ana' });
	if (!created.ok)
		throw new Error(created.error);

	const { code } = created.room;
	console.log(`   codigo: ${code}`);
	check('o codigo tem 6 caracteres', code.length, 6);
	check('quem cria fica sozinho', names(created.room), ['Ana']);
	check('quem cria comeca com o lapis', drawerName(created.room), 'Ana');

	step('2. Bruno e Carla entram');
	await ask(bruno, 'room:join', { code, name: 'Bruno' });
	const withCarla = await ask(carla, 'room:join', { code, name: 'Carla' });
	check('estao os tres, por ordem de entrada', names(withCarla.room), ['Ana', 'Bruno', 'Carla']);
	check('entrar nao rouba o lapis', drawerName(withCarla.room), 'Ana');

	step('3. Codigo que nao existe e recusado');
	const missing = await ask(bruno, 'room:join', { code: 'ZZZZZZ', name: 'Bruno' });
	check('a entrada e recusada', missing.ok, false);
	check('com o motivo certo', missing.code, 'ROOM_NOT_FOUND');

	step('4. O lapis roda por ordem de entrada, dando a volta');
	for (const expected of ['Bruno', 'Carla', 'Ana'])
	{
		const rotated = await ask(ana, 'room:next-drawer');
		check(`passa para ${expected}`, drawerName(rotated.room), expected);
	}

	step('5. Quem tem o lapis sai — passa ao SEGUINTE, nao a um qualquer');
	const beforeLeaving = await ask(ana, 'room:next-drawer');
	check('o lapis esta com o Bruno', drawerName(beforeLeaving.room), 'Bruno');

	await ask(bruno, 'room:leave');
	const afterLeaving = await waitFor(ana, 'room:state', 2000);
	check('a sala fica com Ana e Carla', names(afterLeaving), ['Ana', 'Carla']);
	check('o lapis passou a Carla, que vinha a seguir', drawerName(afterLeaving), 'Carla');

	step('6. Quem nao tem o lapis nao consegue desenhar');
	const traco = { x0: 0.1, y0: 0.1, x1: 0.2, y1: 0.2 };

	ana.emit('draw:stroke', traco);
	const leaked = await waitFor(carla, 'draw:stroke', 500);
	check('o traco da Ana e ignorado pelo servidor', leaked, null);

	carla.emit('draw:stroke', traco);
	const delivered = await waitFor(ana, 'draw:stroke', 2000);
	check('o traco da Carla, que tem o lapis, chega', delivered !== null, true);

	step('7. Uma sala nao ve a outra');
	const outra = await ask(bruno, 'room:create', { name: 'Bruno' });
	check('o Bruno esta sozinho na sala nova', names(outra.room), ['Bruno']);
	check('e o codigo e diferente', outra.room.code !== code, true);

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