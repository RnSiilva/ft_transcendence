/**
 * rooms-demo.js
 * Walks three clients through a room's lifecycle and prints what the server
 * reports. No browser involved: the rules live on the server, so they should
 * be demonstrable without one.
 *
 *   docker exec backend npm run demo:rooms
 */

const { io } = require('socket.io-client');

const URL = process.env.DEMO_URL || 'http://localhost:4000';

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

function connect(label)
{
	return new Promise((resolve, reject) =>
	{
		const socket = io(URL, { transports: ['websocket'] });

		socket.on('connect', () => resolve(socket));
		socket.on('connect_error', reject);

		// Everyone in the room learns about a change without asking.
		socket.on('room:state', (room) =>
		{
			const who = room.members.map((m) => (m.isDrawer ? `${m.name} (lapis)` : m.name));
			console.log(`   -> ${label} recebeu room:state  [${room.code}]  ${who.join(', ')}`);
		});
	});
}

function step(title)
{
	console.log(`\n${title}`);
}

async function main()
{
	console.log(`A ligar a ${URL}`);

	const ana = await connect('Ana');
	const bruno = await connect('Bruno');
	const carla = await connect('Carla');

	step('1. Ana cria a sala');
	const created = await ask(ana, 'room:create', { name: 'Ana' });
	if (!created.ok)
		throw new Error(created.error);

	const { code } = created.room;
	console.log(`   codigo da sala: ${code}`);

	step('2. Bruno e Carla entram');
	const brunoIn = await ask(bruno, 'room:join', { code, name: 'Bruno' });
	console.log('  ', brunoIn.ok ? 'Bruno entrou' : brunoIn.error);
	const carlaIn = await ask(carla, 'room:join', { code, name: 'Carla' });
	console.log('  ', carlaIn.ok ? 'Carla entrou' : carlaIn.error);

	step('3. Codigo que nao existe');
	const missing = await ask(bruno, 'room:join', { code: 'ZZZZZZ', name: 'Bruno' });
	console.log('  ', missing.ok ? 'entrou (errado!)' : `recusado: ${missing.error} [${missing.code}]`);

	step('4. O lapis roda por ordem de entrada');
	for (let i = 0; i < 3; i += 1)
	{
		const rotated = await ask(ana, 'room:next-drawer');
		const drawer = rotated.room.members.find((m) => m.isDrawer);
		console.log(`   passagem ${i + 1}: lapis com ${drawer.name}`);
	}

	step('5. Quem tem o lapis sai — passa ao seguinte');
	const before = await ask(ana, 'room:next-drawer');
	const holder = before.room.members.find((m) => m.isDrawer);
	console.log(`   lapis esta com ${holder.name}, que vai sair`);

	const leaver = { Ana: ana, Bruno: bruno, Carla: carla }[holder.name];
	await ask(leaver, 'room:leave');

	step('6. Sala noutro codigo nao ve esta');
	const other = await ask(bruno, 'room:create', { name: 'Bruno' });
	console.log(`   Bruno criou a sala ${other.room.code}, sozinho`);

	await new Promise((resolve) => setTimeout(resolve, 300));

	console.log('\nFeito.');
	[ana, bruno, carla].forEach((s) => s.close());
	process.exit(0);
}

main().catch((err) =>
{
	console.error('\nFalhou:', err.message);
	process.exit(1);
});