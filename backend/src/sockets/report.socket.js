/**
 * report.socket.js
 * Reporting a player opens a vote in the room. Passing it removes them.
 *
 * Being voted out is the same as walking out: the points are forfeited,
 * because they are only written to a profile once a game finishes.
 */

const rooms = require('../game/rooms');
const { gameOf, forgetMember } = require('./round.socket');

const VOTE_WINDOW_MS = 30000;

/** roomCode -> Map<targetId, { targetId, targetName, voters, deadline }> */
const votes = new Map();

/**
 * A strict majority of the room: with four players it takes three votes.
 * Never below two: a vote is only available from three players onward.
 */
const connectedMemberCount = (room) =>
	[...room.members.values()].filter((member) => !member.disconnectedAt).length;

const threshold = (room) => Math.max(2, Math.floor(connectedMemberCount(room) / 2) + 1);

function announce(io, room, vote)
{
	const payload = {
		targetId: vote.targetId,
		name: vote.targetName,
		votes: vote.voters.size,
		needed: threshold(room),
		secondsLeft: Math.max(0, Math.ceil((vote.deadline - Date.now()) / 1000)),
	};

	// The person being voted on is told they were reported, not the tally.
	room.members.forEach((member) =>
	{
		if (member.id === vote.targetId)
			io.to(member.id).emit('report:flagged');
		else
			io.to(member.id).emit('report:open', payload);
	});
}

function announceTick(io, room, vote, now = Date.now())
{
	const secondsLeft = Math.max(0, Math.ceil((vote.deadline - now) / 1000));
	room.members.forEach((member) =>
	{
		if (member.id !== vote.targetId)
			io.to(member.id).emit('report:tick', { targetId: vote.targetId, secondsLeft });
	});
}

/** Remove a member from every active vote after they leave or disconnect. */
function removeMemberFromVotes(io, room, memberId, skipTargetId = null)
{
	const roomVotes = votes.get(room.code);
	if (!roomVotes)
		return;

	for (const vote of [...roomVotes.values()])
	{
		if (vote.targetId === memberId && vote.targetId !== skipTargetId)
		{
			close(io, room, vote.targetId, false);
			continue;
		}

		if (vote.targetId === memberId || !vote.voters.delete(memberId))
			continue;

		if (vote.voters.size === 0)
			close(io, room, vote.targetId, false);
		else
			announce(io, room, vote);
	}
}

/**
 * If they were drawing, only their turn ends: a round is everybody drawing
 * once, and the others still have their go.
 */
function expel(io, room, targetId)
{
	const game = gameOf(room);

	// Running the clock out lets the game loop close the turn as it always does.
	if (game && game.drawerId === targetId)
		game.startedAt = Date.now() - game.roundSeconds * 1000;

	const targetMember = room.members.get(targetId);
	if (targetMember)
	{
		room.bannedUserIds = room.bannedUserIds || new Set();
		room.bannedUserIds.add(targetMember.userId);
	}

	forgetMember(room, targetId);
	rooms.leaveRoom(targetId);

	const kicked = io.sockets.sockets.get(targetId);
	kicked?.emit('report:expelled');
	kicked?.leave(room.code);

	const roomVotes = votes.get(room.code);
	roomVotes?.delete(targetId);
	if (roomVotes?.size === 0)
		votes.delete(room.code);
	removeMemberFromVotes(io, room, targetId, targetId);
	io.to(room.code).emit('report:closed', { targetId, targetName: targetMember?.name || '', expelled: true });
	io.to(room.code).emit('room:state', rooms.serialiseRoom(room));
}

function close(io, room, targetId, expelled)
{
	const roomVotes = votes.get(room.code);
	const vote = roomVotes?.get(targetId);
	if (!vote)
		return;

	if (expelled)
		expel(io, room, vote.targetId);
	else
	{
		roomVotes.delete(vote.targetId);
		if (roomVotes.size === 0)
			votes.delete(room.code);
		io.to(room.code).emit('report:closed', { targetId: vote.targetId, targetName: vote.targetName, expelled: false });
	}
}

/** Closes the votes nobody finished. */
function startReportSweeper(io, everyMs = 1000)
{
	return setInterval(() =>
	{
		const now = Date.now();

		votes.forEach((roomVotes, code) =>
		{
			const room = rooms.getRoom(code);

			if (!room)
			{
				votes.delete(code);
				return;
			}

			roomVotes.forEach((vote) =>
			{
				if (!room.members.has(vote.targetId))
				{
					roomVotes.delete(vote.targetId);
					return;
				}

				if (now >= vote.deadline)
					close(io, room, vote.targetId, false);
				else
					announceTick(io, room, vote, now);
			});

			if (roomVotes.size === 0)
				votes.delete(code);
		});
	}, everyMs);
}

function registerReportHandlers(io, socket)
{
	socket.on('report:start', (payload = {}, ack) =>
	{
		const room = rooms.getRoomOf(socket.id);
		const targetId = payload.targetId;

		if (!room || !targetId)
			return reply(ack, 'NOT_IN_ROOM');

		if (targetId === socket.id)
			return reply(ack, 'CANNOT_REPORT_SELF');

		const target = room.members.get(targetId);
		if (!target)
			return reply(ack, 'NOT_IN_ROOM');

		// With two in the room one vote is already a majority: no vote opens.
		if (connectedMemberCount(room) < 3)
			return reply(ack, 'NEED_MORE_PLAYERS');

		const roomVotes = votes.get(room.code) || new Map();
		if (roomVotes.has(targetId))
			return reply(ack, 'VOTE_ALREADY_OPEN');

		// Reporting counts as the first vote: nobody opens one to abstain.
		const vote = {
			targetId,
			targetName: target.name,
			voters: new Set([socket.id]),
			deadline: Date.now() + VOTE_WINDOW_MS,
		};

		roomVotes.set(targetId, vote);
		votes.set(room.code, roomVotes);
		announce(io, room, vote);
		reply(ack, null);
	});

	socket.on('report:vote', (payload = {}, ack) =>
	{
		const room = rooms.getRoomOf(socket.id);
		const roomVotes = room && votes.get(room.code);
		const vote = roomVotes && roomVotes.get(payload?.targetId);

		if (!vote)
			return reply(ack, 'NO_VOTE_OPEN');

		if (Date.now() >= vote.deadline)
		{
			close(io, room, vote.targetId, false);
			return reply(ack, 'VOTE_EXPIRED');
		}

		if (socket.id === vote.targetId)
			return reply(ack, 'CANNOT_VOTE_ON_SELF');

		vote.voters.add(socket.id);

		// The vote that expels still has to answer whoever cast it.
		if (vote.voters.size >= threshold(room))
		{
			close(io, room, vote.targetId, true);
			return reply(ack, null);
		}

		announce(io, room, vote);
		reply(ack, null);
	});
}

function reply(ack, error)
{
	if (typeof ack === 'function')
		ack(error ? { ok: false, code: error } : { ok: true });
}

module.exports = { registerReportHandlers, startReportSweeper, removeMemberFromVotes };
