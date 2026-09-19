/**
 * room.socket.js
 * Socket.IO transport for rooms. Only translates events into calls on
 * game/rooms.js every decision about who may do what lives there.
 */

const rooms = require('../game/rooms');
const { forgetMember, reclaimInGame } = require('./round.socket');
const { removeMemberFromVotes } = require('./report.socket');

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
			removeMemberFromVotes(io, room, memberId);
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

	// We do NOT auto-reclaim the held seat on connect. A socket can reconnect on
	// ANY page (e.g. the profile), and reclaiming here would count the player as
	// "back in the game" without them actually returning to the room. The seat is
	// reclaimed only when the player really re-enters the room — the game page
	// emits 'room:join' (which calls seizeSeat) on mount, reload and reconnect.
	// Until that happens, the 15s reconnect grace keeps running as it should.

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
			// The account reclaims its own seat (rooms.seizeSeat): if this user
			// already has a seat in the room through ANOTHER connection (a phone
			// zombie, an old tab), the new connection takes it over — points and
			// turn preserved — and the old one is dropped. Without this, the seat's
			// owner was locked out with 'ALREADY_IN_ROOM'.
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
			removeMemberFromVotes(io, room, socket.id);
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
		const room = rooms.markAbsent(socket.id);
		if (room)
			removeMemberFromVotes(io, room, socket.id);
		announce(room);
	});
}

module.exports = { registerRoomHandlers, startAbsenceSweeper };
