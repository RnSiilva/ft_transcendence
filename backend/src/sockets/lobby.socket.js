/**
 * lobby.socket.js
 *
 * What this code does: the waiting room before a match starts.
 *  - 'rooms:list' — returns the public rooms that are waiting and is re-emitted
 *    to everyone whenever a room is created, changes or closes (the /rooms
 *    page refreshes itself, with no refresh button);
 *  - remembers who CREATED each room (listening for 'room:create' in its own
 *    listener) and lets only that person kick ('lobby:kick'), close
 *    ('lobby:close') and start ('lobby:start' → 'room:start' to everyone);
 *  - server-side clock: a waiting room lives for at most 5 minutes
 *    ('lobby:tick' with the seconds every second; at the end 'lobby:expired'
 *    and the room is emptied);
 *  - with 3+ players it prompts the creator ('lobby:ready'); if they postpone
 *    ('lobby:wait'), it prompts again every 60 seconds.
 *
 * Uses only the public API of game/rooms.js and the forgetMember exported by
 * round.socket.js.
 */

const rooms = require('../game/rooms');
const { forgetMember } = require('./round.socket');

const LOBBY_LIFETIME_MS = 5 * 60 * 1000;
// 3 players are needed to START; a match can carry on with 2 once it is
// under way (round.socket only aborts below 2, and then the room closes
// immediately with no points for anyone).
const READY_MIN_PLAYERS = 3;
const READY_REPEAT_MS = 60 * 1000;

/**
 * roomCode -> { creatorUserId, roomName, waiting, started, promptAt }
 * waiting: true only for rooms opened from the rooms page ('lobby:open') —
 * those sit in a waiting room (room.lobbyWaiting blocks the round engine)
 * until 'lobby:start'. Rooms created directly from /game keep starting on
 * their own with 2 players, as before.
 * promptAt: null = prompt as soon as there are 3; timestamp = prompt at that
 * time; Infinity = the modal is open on the creator's screen, do not repeat.
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

/** The creator's current socket (changes on each reload; found by userId). */
function creatorSocketId(room, lobby)
{
	for (const member of room.members.values())
	{
		if (member.userId === lobby.creatorUserId)
			return member.id;
	}
	return null;
}

/** Only rooms still waiting appear in the public list. */
function publicRooms()
{
	return rooms.activeRooms()
		.filter((room) =>
		{
			const lobby = lobbies.get(room.code);
			if (!lobby)
				return false;
			
			const max = room.settings.maxPlayers || rooms.MAX_MEMBERS;
			const isFull = room.members.size >= max;
			
			// Show rooms that are waiting, or rooms that started but still have slots
			return lobby.waiting || (lobby.started && !isFull);
		})
		.map((room) =>
		{
			const lobby = lobbies.get(room.code);
			return {
				code: room.code,
				name: lobby.roomName,
				players: room.members.size,
				max: room.settings.maxPlayers || rooms.MAX_MEMBERS,
				lang: room.settings.language,
				// A padlock in the list; the password itself never leaves the server.
				locked: Boolean(room.password),
				started: lobby.started,
			};
		});
}

function broadcastList(io)
{
	io.emit('rooms:list', publicRooms());
}

/** Removes everyone from the room, first notifying them with the given event. */
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
 * Waiting-room phase, always computed on the server:
 * 'waiting_players'  — there are not enough players to start yet;
 * 'waiting_creator'  — it can start now; waiting on the creator's decision.
 * It is emitted to ALL members ('lobby:phase') whenever it changes.
 */
function computePhase(room)
{
	return room.members.size >= READY_MIN_PLAYERS
		? 'waiting_creator'
		: 'waiting_players';
}

function announcePhase(io, room, lobby)
{
	const phase = computePhase(room);
	if (lobby.phase === phase)
		return;

	lobby.phase = phase;
	io.to(room.code).emit('lobby:phase', { phase });
}

/**
 * One pass of the rooms clock (time lives HERE, never in the browser):
 * counts the 5 minutes, sends the tick, announces the phase, expires rooms
 * and repeats the "you can start now" prompt to the creator. Extracted from
 * the setInterval so tests can call it with a `now` of their choice.
 */
function sweepOnce(io, now = Date.now())
{
	// Rooms that died by other means (everyone left).
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
		if (!lobby || !lobby.waiting)
			continue;

		const secondsLeft = Math.max(
			0,
			Math.ceil((room.createdAt.getTime() + LOBBY_LIFETIME_MS - now) / 1000),
		);
		// creatorUserId included: the front end tags the "Creator" in the list.
		io.to(room.code).emit('lobby:tick', {
			secondsLeft,
			creatorUserId: lobby.creatorUserId,
		});

		announcePhase(io, room, lobby);

		if (secondsLeft === 0)
		{
			emptyRoom(io, room, 'lobby:expired');
			broadcastList(io);
			continue;
		}

		// A waiting room WITHOUT a creator makes no sense: nobody can start,
		// and the others would hang on until the 5 minutes are up. It happens
		// when the creator leaves/drops by some path other than 'lobby:close'.
		// Note: a merely absent creator (reload/locked screen) still counts as
		// a member during the grace period — the room survives a refresh.
		if (!creatorSocketId(room, lobby))
		{
			emptyRoom(io, room, 'lobby:closed');
			broadcastList(io);
			continue;
		}

		if (room.members.size < READY_MIN_PLAYERS)
		{
			// Below the minimum again: the next player to join prompts once more.
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
}

function startLobbySweeper(io, everyMs = 1000)
{
	return setInterval(() => sweepOnce(io), everyMs);
}

function registerLobbyHandlers(io, socket)
{
	// Runs AFTER the room:create handler registered earlier in index.js, so
	// the room already exists when this listener is called.
	socket.on('room:create', (payload = {}) =>
	{
		const room = rooms.getRoomOf(socket.id);
		if (!room || lobbies.has(room.code))
			return;

		const settings = payload.settings || {};
		const customName = typeof settings.name === 'string' ? settings.name.trim().slice(0, 30) : '';
		const roomName = customName || `${socket.user.username}'s room`;

		lobbies.set(room.code, {
			creatorUserId: socket.user.id,
			roomName,
			waiting: false,
			started: false,
			promptAt: null,
		});
		broadcastList(io);
	});

	// The rooms page opens the room in waiting mode: it enters the public
	// list and the round engine stays blocked until lobby:start.
	socket.on('lobby:open', () =>
	{
		const { room, lobby } = lobbyOf(socket.id);
		if (!room || !isCreator(socket, lobby) || lobby.started)
			return;

		lobby.waiting = true;
		room.lobbyWaiting = true;
		broadcastList(io);
		announcePhase(io, room, lobby);
	});

	// Joins and leaves change both the list count AND the room phase; whoever
	// just joined gets the current phase right away without waiting for the clock.
	socket.on('room:join', () =>
	{
		broadcastList(io);
		const { room, lobby } = lobbyOf(socket.id);
		if (room && lobby && lobby.waiting)
		{
			announcePhase(io, room, lobby);
			socket.emit('lobby:phase', { phase: computePhase(room) });
		}
	});
	socket.on('room:leave', () => broadcastList(io));
	socket.on('disconnect', () => broadcastList(io));

	socket.on('rooms:list', (_payload, ack) =>
	{
		if (typeof ack === 'function')
			ack(publicRooms());
	});

	// A snapshot of the current waiting-room state, on request. It serves to:
	// (1) let the lobby modal show the list AS SOON AS it mounts — the join's
	// room:state broadcast arrives before the listeners exist and was lost;
	// (2) let a phone that woke from standby find out whether it is still in
	// the room (the socket died and the server may have removed it meanwhile).
	socket.on('lobby:sync', (_payload, ack) =>
	{
		if (typeof ack !== 'function')
			return;

		const { room, lobby } = lobbyOf(socket.id);
		if (!room || !lobby)
		{
			ack({ ok: false });
			return;
		}

		ack({
			ok: true,
			room: rooms.serialiseRoom(room),
			phase: computePhase(room),
			creatorUserId: lobby.creatorUserId,
		});
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
			&& room.members.size >= READY_MIN_PLAYERS
			&& lobby.waiting && !lobby.started;

		if (!allowed)
		{
			if (typeof ack === 'function')
				ack({ ok: false });
			return;
		}

		lobby.started = true;
		lobby.waiting = false;
		// Releases the round engine: the match begins on the next tick.
		room.lobbyWaiting = false;
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

module.exports = {
	registerLobbyHandlers,
	startLobbySweeper,
	// Exported for tests: run one pass of the clock with a `now` of your
	// choice (testing the 5-minute expiry without waiting 5 minutes) and
	// inspect the state of the waiting rooms.
	sweepOnce,
	_lobbies: lobbies,
};
