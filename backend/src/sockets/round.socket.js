/**
 * round.socket.js
 * Runs the games: one clock on the server, ticking for every room at once.
 *
 * The countdown belongs here rather than in the browser, so everybody sees the
 * same number and nobody wins time by slowing their own page down.
 */

const rooms = require('../game/rooms');
const round = require('../game/round');
const { pickWord } = require('../game/words.repository');
const { saveGame } = require('../game/games.repository');

// Provisional: a game starts on its own once there are two people. The team
// decided on three and a start button, but that lobby does not exist yet, and
// without something here no round would ever begin.
const MIN_PLAYERS = 2;

// How long the answer stays on screen before the next round starts.
const RESULT_PAUSE_MS = 5000;

/** roomCode -> game */
const games = new Map();

const gameOf = (room) => games.get(room.code) || null;

function announce(io, room, game)
{
	io.to(room.code).emit('round:state', round.snapshot(game, [...room.members.values()]));
}

async function beginRound(io, room, game)
{
	const word = await pickWord(room.settings.theme, room.settings.language, game.usedWords);
	if (!word)
		return;

	// A fresh board for each turn: otherwise the next person draws on top of
	// the last picture, and whoever reloads sees both at once.
	rooms.clearStrokes(room);
	io.to(room.code).emit('draw:clear');

	round.startTurn(game, word, room.drawerId, room.members.size);

	// Only the person drawing is told what to draw.
	io.to(room.drawerId).emit('round:word', word);
	announce(io, room, game);
}

async function tickRoom(io, room)
{
	const guesserCount = Math.max(0, room.members.size - 1);
	let game = gameOf(room);

	if (!game)
	{
		if (room.members.size < MIN_PLAYERS)
			return;

		game = round.createGame(room.settings.rounds || 3, room.settings.roundSeconds);
		games.set(room.code, game);
		await beginRound(io, room, game);
		return;
	}

	// Left alone, the clock has to stop. Otherwise "everyone has guessed" is
	// true of nobody, every round closes the instant it opens, and the game
	// burns through its words while one person watches.
	if (room.members.size < MIN_PLAYERS)
	{
		if (game.phase !== round.PHASE.paused)
		{
			round.pauseGame(game);
			announce(io, room, game);
		}
		return;
	}

	if (game.phase === round.PHASE.paused)
	{
		round.resumeGame(game);

		// The pause ate into the gap between turns, so give it back.
		if (game.phase === round.PHASE.result)
			game.resultUntil = Date.now() + RESULT_PAUSE_MS;

		announce(io, room, game);
		return;
	}

	if (game.phase === round.PHASE.drawing)
	{
		if (round.isRoundOver(game, guesserCount))
		{
			const result = round.endTurn(game, guesserCount);
			game.resultUntil = Date.now() + RESULT_PAUSE_MS;
			io.to(room.code).emit('round:over', result);

			// Nothing reaches the database until the last round is played: a
			// score only becomes real once it is final.
			if (game.phase === round.PHASE.finished)
				await storeGame(room, game);
		}

		announce(io, room, game);
		return;
	}

	if (game.phase === round.PHASE.result && Date.now() >= game.resultUntil)
	{
		// A fresh word deserves a fresh board, and the stored strokes have to go
		// with it — otherwise a reload would bring the old drawing back.
		rooms.clearStrokes(room);
		io.to(room.code).emit('draw:clear');

		rooms.passPencil(room);
		io.to(room.code).emit('room:state', rooms.serialiseRoom(room));
		await beginRound(io, room, game);
	}
}

/** Writes the finished game away, once. */
async function storeGame(room, game)
{
	if (game.saved)
		return;

	game.saved = true;

	const { scores } = round.snapshot(game, [...room.members.values()]);

	await saveGame({ roomCode: room.code, settings: room.settings, scores })
		.catch((err) => console.error('[games] could not save:', err.message));
}

/** One timer for every room, rather than one per room. */
function startGameLoop(io, everyMs = 1000)
{
	return setInterval(() =>
	{
		rooms.activeRooms().forEach((room) =>
		{
			tickRoom(io, room).catch((err) => console.error('[round]', err.message));
		});
	}, everyMs);
}

function registerRoundHandlers(io, socket)
{
	/**
	 * One input serves chat and guessing. The server decides which it was:
	 * a message that is exactly the secret word scores, anything else is talk.
	 */
	socket.on('chat:message', (payload = {}) =>
	{
		const room = rooms.getRoomOf(socket.id);
		if (!room)
			return;

		const text = typeof payload.text === 'string' ? payload.text.trim().slice(0, 200) : '';
		if (!text)
			return;

		const game = gameOf(room);
		const guess = game ? round.registerGuess(game, socket.id, text) : { correct: false };

		if (guess.correct)
		{
			// The word itself is never echoed, or the others would read it.
			io.to(room.code).emit('round:correct', {
				name: socket.user.username,
				points: guess.points,
				position: guess.position,
			});
			announce(io, room, game);
			return;
		}

		io.to(room.code).emit('chat:message', { name: socket.user.username, text });
	});

	socket.on('round:state', () =>
	{
		const room = rooms.getRoomOf(socket.id);
		const game = room && gameOf(room);

		if (game)
			socket.emit('round:state', round.snapshot(game, [...room.members.values()]));
	});
}

/** Forgets the game when its room is gone, and forfeits whoever walked out. */
function forgetMember(room, memberId)
{
	const game = games.get(room.code);
	if (!game)
		return;

	if (rooms.getRoom(room.code))
		round.dropMember(game, memberId);
	else
		games.delete(room.code);
}

module.exports = { registerRoundHandlers, startGameLoop, forgetMember };
