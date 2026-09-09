/**
 * room.socket.js
 * Socket.IO transport for rooms. Only translates events into calls on
 * game/rooms.js every decision about who may do what lives there.
 */

const rooms = require('../game/rooms');
const { forgetMember } = require('./round.socket');

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
		socket.join(reclaimed.code);
		socket.emit('room:state', rooms.serialiseRoom(reclaimed));
		announce(reclaimed);
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
			const previous = rooms.getRoomOf(socket.id);
			const room = rooms.joinRoom(socket.id, payload.code, socket.user);

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

	/** Manual rotation until the round timer exists to do it. */
	socket.on('room:next-drawer', (_payload, ack) =>
	{
		const room = rooms.getRoomOf(socket.id);

		if (!room)
		{
			const err = new Error('Not in a room');
			err.code = 'NOT_IN_ROOM';
			return error(ack, err);
		}

		rooms.passPencil(room);

		ok(ack, room);
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