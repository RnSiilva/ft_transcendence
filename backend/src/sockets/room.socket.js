/**
 * room.socket.js
 * Socket.IO transport for rooms. Only translates events into calls on
 * game/rooms.js every decision about who may do what lives there.
 */

const rooms = require('../game/rooms');
const { forgetMember, reclaimInGame } = require('./round.socket');

/** Clients pass a callback to learn whether their request worked. */
function reply(ack, payload)
{
	if (typeof ack === 'function')
		ack(payload);
}

function ok(ack, room)
{
	reply(ack, { ok: true, room: rooms.serialiseRoom(room) });
}

function error(ack, err)
{
	reply(ack,
	{
		ok: false,
		error: err.message,
		code: err.code || 'ROOM_ERROR',
	});
}

/** Tells everyone still in the room what it looks like now. */
function announceTo(io, room)
{
	if (room)
		io.to(room.code).emit('room:state', rooms.serialiseRoom(room));
}

/**
 * Removes the people whose grace period ran out, and keeps the countdown
 * moving for the ones still away. Runs on a timer because nobody sends an
 * event when someone simply stops coming back.
 */
function startAbsenceSweeper(io, everyMs = 1000)
{
	return setInterval(() =>
	{
		const dropped = rooms.dropAbsent();

		dropped.forEach(({ room, memberId }) =>
		{
			forgetMember(room, memberId);
			announceTo(io, room);
		});

		// Without this the seconds shown to everyone else would sit still.
		const settled = dropped.map(({ room }) => room);
		rooms.roomsWithAbsentees()
			.filter((room) => !settled.includes(room))
			.forEach((room) => announceTo(io, room));
	}, everyMs);
}

function registerRoomHandlers(io, socket)
{
	const announce = (room) => announceTo(io, room);

	// A reload arrives as a new connection. If a seat is being held for this
	// account, take it back instead of starting over.
	const reclaimed = rooms.reclaimSeat(socket.id, socket.user);
	if (reclaimed)
	{
		reclaimInGame(io, reclaimed.room, reclaimed.oldMemberId, socket.id);
		socket.join(reclaimed.room.code);
		socket.emit('room:state', rooms.serialiseRoom(reclaimed.room));
		announce(reclaimed.room);
	}

	socket.on('room:create', (payload = {}, ack) =>
	{
		try
		{
			// The name comes from the session, not from the payload.
			const room = rooms.createRoom(socket.id, socket.user, payload.settings);
			socket.join(room.code);

			ok(ack, room);
			announce(room);
		}
		catch (err)
		{
			error(ack, err);
		}
	});

	socket.on('room:join', (payload = {}, ack) =>
	{
		try
		{
			// A conta retoma o próprio lugar (rooms.seizeSeat): se este
			// utilizador já tem lugar na sala por OUTRA ligação (zombie de
			// telemóvel, separador antigo), a ligação nova fica com ele —
			// pontos e vez preservados — e a antiga é dispensada. Sem isto,
			// o dono do lugar ficava trancado fora com 'ALREADY_IN_ROOM'.
			const seized = rooms.seizeSeat(socket.id, payload.code, socket.user);
			if (seized)
			{
				reclaimInGame(io, seized.room, seized.oldMemberId, socket.id);
				const old = io.sockets.sockets.get(seized.oldMemberId);
				old?.emit('room:replaced');
				old?.leave(seized.room.code);
				socket.join(seized.room.code);
				ok(ack, seized.room);
				announce(seized.room);
				return;
			}

			const previous = rooms.getRoomOf(socket.id);
			const room = rooms.joinRoom(socket.id, payload.code, socket.user, payload.password);

			// Otherwise strokes from the previous room keep arriving.
			if (previous && previous.code !== room.code)
			{
				socket.leave(previous.code);
				announce(previous);
			}

			socket.join(room.code);

			ok(ack, room);
			announce(room);
		}
		catch (err)
		{
			error(ack, err);
		}
	});

	socket.on('room:leave', (_payload, ack) =>
	{
		const room = rooms.leaveRoom(socket.id);

		if (room)
		{
			forgetMember(room, socket.id);
			socket.leave(room.code);
		}

		reply(ack, { ok: true });
		announce(room);
	});

	// Losing the socket is not the same as leaving: the seat is held for a
	// while so a reload does not cost the pencil. room:leave is the deliberate
	// exit, and that one removes them at once.
	socket.on('disconnect', () =>
	{
		announce(rooms.markAbsent(socket.id));
	});
}

module.exports = { registerRoomHandlers, startAbsenceSweeper };
