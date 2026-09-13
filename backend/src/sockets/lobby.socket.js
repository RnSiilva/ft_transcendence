/**
 * lobby.socket.js  (módulo do frontend/Thiago — não altera os da equipa)
 *
 * O que este código faz: a sala de espera antes da partida.
 *  - 'rooms:list' — devolve as salas públicas em espera e é reemitido a
 *    todos sempre que uma sala nasce, muda ou fecha (a página /rooms
 *    atualiza-se sozinha, sem botão de refresh);
 *  - guarda quem CRIOU cada sala (ouvindo 'room:create' num listener
 *    próprio) e só a esse aceita expulsar ('lobby:kick'), encerrar
 *    ('lobby:close') e iniciar ('lobby:start' → 'room:start' a todos);
 *  - relógio no servidor: uma sala em espera vive no máximo 5 minutos
 *    ('lobby:tick' com os segundos a cada segundo; no fim 'lobby:expired'
 *    e a sala é esvaziada);
 *  - com 3+ jogadores avisa o criador ('lobby:ready'); se ele adiar
 *    ('lobby:wait'), volta a avisar de 60 em 60 segundos.
 *
 * Usa apenas a API pública de game/rooms.js e o forgetMember exportado por
 * round.socket.js. NOTA para a equipa: o arranque automático provisório do
 * round.socket.js (MIN_PLAYERS = 2, marcado lá como temporário à espera
 * deste lobby) deve passar a esperar pelo 'lobby:start'.
 */

const rooms = require('../game/rooms');
const { forgetMember } = require('./round.socket');

const LOBBY_LIFETIME_MS = 5 * 60 * 1000;
const READY_MIN_PLAYERS = 3;
const READY_REPEAT_MS = 60 * 1000;

/**
 * roomCode -> { creatorUserId, roomName, started, promptAt }
 * promptAt: null = avisa assim que houver 3; timestamp = avisa a essa hora;
 * Infinity = modal está aberto no ecrã do criador, não repetir.
 */
const lobbies = new Map();

function lobbyOf(socketId)
{
	const room = rooms.getRoomOf(socketId);
	if (!room)
		return {};

	return { room, lobby: lobbies.get(room.code) };
}

function isCreator(socket, lobby)
{
	return Boolean(lobby && socket.user && socket.user.id === lobby.creatorUserId);
}

/** O socket atual do criador (muda a cada reload; procura-se pelo userId). */
function creatorSocketId(room, lobby)
{
	for (const member of room.members.values())
	{
		if (member.userId === lobby.creatorUserId)
			return member.id;
	}
	return null;
}

/** Só salas ainda em espera entram na lista pública. */
function publicRooms()
{
	return rooms.activeRooms()
		.filter((room) =>
		{
			const lobby = lobbies.get(room.code);
			return lobby && !lobby.started;
		})
		.map((room) =>
		{
			const lobby = lobbies.get(room.code);
			return {
				code: room.code,
				name: lobby.roomName,
				players: room.members.size,
				max: rooms.MAX_MEMBERS,
				lang: room.settings.language,
			};
		});
}

function broadcastList(io)
{
	io.emit('rooms:list', publicRooms());
}

/** Tira toda a gente da sala, avisando primeiro com o evento dado. */
function emptyRoom(io, room, event)
{
	io.to(room.code).emit(event);

	for (const member of [...room.members.values()])
	{
		rooms.leaveRoom(member.id);
		forgetMember(room, member.id);
		io.sockets.sockets.get(member.id)?.leave(room.code);
	}

	lobbies.delete(room.code);
}

/**
 * Um relógio para todas as salas (o tempo vive AQUI, nunca no browser):
 * conta os 5 minutos, manda o tick, expira salas e repete o aviso de
 * "já dá para começar" ao criador.
 */
function startLobbySweeper(io, everyMs = 1000)
{
	return setInterval(() =>
	{
		const now = Date.now();

		// Salas que morreram por outras vias (toda a gente saiu).
		for (const code of [...lobbies.keys()])
		{
			if (!rooms.getRoom(code))
			{
				lobbies.delete(code);
				broadcastList(io);
			}
		}

		for (const room of rooms.activeRooms())
		{
			const lobby = lobbies.get(room.code);
			if (!lobby || lobby.started)
				continue;

			const secondsLeft = Math.max(
				0,
				Math.ceil((room.createdAt.getTime() + LOBBY_LIFETIME_MS - now) / 1000),
			);
			io.to(room.code).emit('lobby:tick', { secondsLeft });

			if (secondsLeft === 0)
			{
				emptyRoom(io, room, 'lobby:expired');
				broadcastList(io);
				continue;
			}

			if (room.members.size < READY_MIN_PLAYERS)
			{
				// Voltou a ficar abaixo de 3: o próximo 3.º volta a avisar.
				lobby.promptAt = null;
				continue;
			}

			const due = lobby.promptAt === null
				|| (lobby.promptAt !== Infinity && now >= lobby.promptAt);
			if (due)
			{
				lobby.promptAt = Infinity;
				const creator = creatorSocketId(room, lobby);
				if (creator)
					io.to(creator).emit('lobby:ready', { players: room.members.size });
			}
		}
	}, everyMs);
}

function registerLobbyHandlers(io, socket)
{
	// Corre DEPOIS do handler da equipa (registado antes no index.js), por
	// isso a sala já existe quando este listener é chamado.
	socket.on('room:create', () =>
	{
		const room = rooms.getRoomOf(socket.id);
		if (!room || lobbies.has(room.code))
			return;

		lobbies.set(room.code, {
			creatorUserId: socket.user.id,
			roomName: `Sala de ${socket.user.username}`,
			started: false,
			promptAt: null,
		});
		broadcastList(io);
	});

	// Entradas e saídas mudam a lotação mostrada na lista.
	socket.on('room:join', () => broadcastList(io));
	socket.on('room:leave', () => broadcastList(io));
	socket.on('disconnect', () => broadcastList(io));

	socket.on('rooms:list', (_payload, ack) =>
	{
		if (typeof ack === 'function')
			ack(publicRooms());
	});

	socket.on('lobby:kick', (payload = {}, ack) =>
	{
		const { room, lobby } = lobbyOf(socket.id);
		const target = payload.memberId;

		if (!room || !isCreator(socket, lobby) || !room.members.has(target)
			|| target === socket.id)
		{
			if (typeof ack === 'function')
				ack({ ok: false });
			return;
		}

		rooms.leaveRoom(target);
		forgetMember(room, target);

		const kicked = io.sockets.sockets.get(target);
		kicked?.emit('lobby:kicked');
		kicked?.leave(room.code);

		io.to(room.code).emit('room:state', rooms.serialiseRoom(room));
		broadcastList(io);
		if (typeof ack === 'function')
			ack({ ok: true });
	});

	socket.on('lobby:wait', () =>
	{
		const { lobby } = lobbyOf(socket.id);
		if (isCreator(socket, lobby))
			lobby.promptAt = Date.now() + READY_REPEAT_MS;
	});

	socket.on('lobby:start', (_payload, ack) =>
	{
		const { room, lobby } = lobbyOf(socket.id);
		const allowed = room && isCreator(socket, lobby)
			&& room.members.size >= READY_MIN_PLAYERS;

		if (!allowed)
		{
			if (typeof ack === 'function')
				ack({ ok: false });
			return;
		}

		lobby.started = true;
		io.to(room.code).emit('room:start');
		broadcastList(io);
		if (typeof ack === 'function')
			ack({ ok: true });
	});

	socket.on('lobby:close', (_payload, ack) =>
	{
		const { room, lobby } = lobbyOf(socket.id);

		if (!room || !isCreator(socket, lobby))
		{
			if (typeof ack === 'function')
				ack({ ok: false });
			return;
		}

		emptyRoom(io, room, 'lobby:closed');
		broadcastList(io);
		if (typeof ack === 'function')
			ack({ ok: true });
	});
}

module.exports = { registerLobbyHandlers, startLobbySweeper };
