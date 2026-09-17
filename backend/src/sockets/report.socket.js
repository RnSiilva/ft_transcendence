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

/** roomCode -> { targetId, targetName, voters: Set<memberId>, deadline } */
const votes = new Map();

const voterCount = (room) => Math.max(1, room.members.size - 1);

/**
 * More than half, never exactly half: with four voters it takes three.
 * Never below two: in a two-player room the single voter would otherwise
 * expel the other player on their own, which a vote is meant to prevent.
 */
const threshold = (room) => Math.max(2, Math.floor(voterCount(room) / 2) + 1);

function announce(io, room, vote)
{
	const payload = {
		targetId: vote.targetId,
		name: vote.targetName,
		votes: vote.voters.size,
		needed: threshold(room),
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

	forgetMember(room, targetId);
	rooms.leaveRoom(targetId);

	const kicked = io.sockets.sockets.get(targetId);
	kicked?.emit('report:expelled');
	kicked?.leave(room.code);

	votes.delete(room.code);
	io.to(room.code).emit('report:closed', { targetId, expelled: true });
	io.to(room.code).emit('room:state', rooms.serialiseRoom(room));
}

function close(io, room, expelled)
{
	const vote = votes.get(room.code);
	if (!vote)
		return;

	if (expelled)
		expel(io, room, vote.targetId);
	else
	{
		votes.delete(room.code);
		io.to(room.code).emit('report:closed', { targetId: vote.targetId, expelled: false });
	}
}

/** Closes the votes nobody finished. */
function startReportSweeper(io, everyMs = 1000)
{
	return setInterval(() =>
	{
		const now = Date.now();

		votes.forEach((vote, code) =>
		{
			const room = rooms.getRoom(code);

			if (!room || !room.members.has(vote.targetId))
			{
				votes.delete(code);
				return;
			}

			if (now >= vote.deadline)
				close(io, room, false);
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
		if (room.members.size < 3)
			return reply(ack, 'NEED_MORE_PLAYERS');

		if (votes.has(room.code))
			return reply(ack, 'VOTE_ALREADY_OPEN');

		// Reporting counts as the first vote: nobody opens one to abstain.
		const vote = {
			targetId,
			targetName: target.name,
			voters: new Set([socket.id]),
			deadline: Date.now() + VOTE_WINDOW_MS,
		};

		votes.set(room.code, vote);
		announce(io, room, vote);
		reply(ack, null);
	});

	socket.on('report:vote', (_payload, ack) =>
	{
		const room = rooms.getRoomOf(socket.id);
		const vote = room && votes.get(room.code);

		if (!vote)
			return reply(ack, 'NO_VOTE_OPEN');

		if (socket.id === vote.targetId)
			return reply(ack, 'CANNOT_VOTE_ON_SELF');

		vote.voters.add(socket.id);

		// The vote that expels still has to answer whoever cast it.
		if (vote.voters.size >= threshold(room))
		{
			close(io, room, true);
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

module.exports = { registerReportHandlers, startReportSweeper };
