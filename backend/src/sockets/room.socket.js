/**
 * room.socket.js
 * Socket.IO transport for rooms. Only translates events into calls on
 * game/rooms.js — every decision about who may do what lives there.
 */

const rooms = require('../game/rooms');

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

function registerRoomHandlers(io, socket)
{
	/** Tells everyone still in the room what it looks like now. */
	const announce = (room) =>
	{
		if (room)
			io.to(room.code).emit('room:state', rooms.serialiseRoom(room));
	};

	socket.on('room:create', (payload = {}, ack) =>
	{
		try
		{
			const room = rooms.createRoom(socket.id, payload.name);
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
			const room = rooms.joinRoom(socket.id, payload.code, payload.name);

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
			socket.leave(room.code);

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

	socket.on('disconnect', () =>
	{
		const room = rooms.leaveRoom(socket.id);
		announce(room);
	});
}

module.exports = { registerRoomHandlers };