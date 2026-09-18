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

// A game still starts on its own once there are two people — but only in
// rooms without a waiting lobby. Rooms opened through the lobby page carry
// room.lobbyWaiting until the creator presses start (see lobby.socket.js).
const MIN_PLAYERS = 2;

// How long the answer stays on screen before the next round starts.
const RESULT_PAUSE_MS = 5000;

// How long the drawer has to pick one of the three suggested words before
// the first one is chosen for them. Counted here, never in the browser.
const CHOOSE_MS = 10000;

/** roomCode -> game */
const games = new Map();

const gameOf = (room) => games.get(room.code) || null;

function announce(io, room, game)
{
	io.to(room.code).emit('round:state', round.snapshot(game, [...room.members.values()]));
}

/**
 * Opens a turn by offering the drawer three words. round.startTurn was built
 * for exactly this ("lets the caller decide whether the word was drawn at
 * random or chosen by the person drawing") — the turn itself only starts in
 * startChosenTurn, once the drawer picks or the 10 s run out.
 */
async function beginRound(io, room, game)
{
	const options = [];
	for (let i = 0; i < 3; i += 1)
	{
		const word = await pickWord(
			room.settings.theme,
			room.settings.language,
			[...game.usedWords, ...options],
		);
		if (word)
			options.push(word);
	}
	if (options.length === 0)
		return;

	// First round of the game: the creator draws first. After that,
	// follows the order of entry, starting with who drew last.
	let drawerId = game.drawerId
		? rooms.nextDrawerId(room, game.drawerId)
		: room.creatorId;

	// room.creatorId may point to an old socket (the creator switched
	// connection when moving from the lobby to /game). A drawer that is not a
	// current member would leave the turn ownerless: fall back to the first member.
	if (!room.members.has(drawerId))
		drawerId = [...room.members.keys()][0];

	game.choosing = {
		options,
		drawerId,
		deadline: Date.now() + CHOOSE_MS,
	};

	// Only the person drawing sees the three words.
	io.to(drawerId).emit('round:choices', {
		options,
		seconds: CHOOSE_MS / 1000,
	});
}

async function startChosenTurn(io, room, game, word)
{
	const { drawerId } = game.choosing;
	delete game.choosing;

	// A fresh board for each turn: otherwise the next person draws on top of
	// the last picture, and whoever reloads sees both at once.
	rooms.clearStrokes(room);
	io.to(room.code).emit('draw:clear');

	round.startTurn(game, word, drawerId, room.members.size);

	// Only the person drawing is told what to draw.
	io.to(drawerId).emit('round:word', word);
	announce(io, room, game);
}

async function tickRoom(io, room)
{
	const guesserCount = Math.max(0, room.members.size - 1);
	let game = gameOf(room);

	if (!game)
	{
		// A room still sitting in the lobby only starts when the creator says
		// so (lobby.socket.js clears the flag on lobby:start).
		if (room.lobbyWaiting)
			return;

		if (room.members.size < MIN_PLAYERS)
			return;

		game = round.createGame(room.settings.rounds || 3, room.settings.roundSeconds);
		games.set(room.code, game);
		await beginRound(io, room, game);
		return;
	}

	// The drawer is picking a word: the clock only starts once they do (or
	// once their 10 s run out and the first option is picked for them).
	if (game.choosing)
	{
		if (Date.now() >= game.choosing.deadline)
			await startChosenTurn(io, room, game, game.choosing.options[0]);
		return;
	}

	// End of game: keep announcing the final state to whoever is still here.
	// A single end-of-game announcement could be lost (phone suspended on the
	// last second) and that player would stay stuck "mid-game" forever — the
	// room still existed, so not even the sweeper rescued them. Re-announcing is
	// idempotent: the front end derives the trophy screen from phase 'finished'.
	if (game.phase === round.PHASE.finished)
	{
		announce(io, room, game);
		return;
	}

	// Left alone mid-match the room closes AT ONCE and nobody keeps the
	// points — they were never saved, since that only happens at the finish
	// line. Accidental disconnects are unaffected: the absent player keeps
	// their seat (and the member count) for the 15 s grace period.
	if (room.members.size < MIN_PLAYERS)
	{
		if (game.phase !== round.PHASE.finished)
		{
			io.to(room.code).emit('game:aborted');

			for (const member of [...room.members.values()])
			{
				rooms.leaveRoom(member.id);
				forgetMember(room, member.id);
				io.sockets.sockets.get(member.id)?.leave(room.code);
			}
			games.delete(room.code);
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

		// The drawer stays silent while drawing: the input is disabled in the
		// browser, but this is the lock that stops a spelled-out word.
		if (game && game.phase === round.PHASE.drawing && game.drawerId === socket.id)
			return;
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

		// Someone who has ALREADY guessed cannot give the answer away: if they
		// type the word (or any hint) again, the message reaches only the drawer
		// and those who also guessed — never anyone still trying to guess.
		if (game && game.phase === round.PHASE.drawing
			&& game.correct.some((entry) => entry.memberId === socket.id))
		{
			const message = { name: socket.user.username, text };
			for (const member of room.members.values())
			{
				const mayRead = member.id === socket.id
					|| member.id === game.drawerId
					|| game.correct.some((entry) => entry.memberId === member.id);
				if (mayRead)
					io.to(member.id).emit('chat:message', message);
			}
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

	// The drawer picked one of the three offered words. Only the drawer of
	// the pending choice is heard, and only for a word that was offered.
	socket.on('round:choose', (payload = {}) =>
	{
		const room = rooms.getRoomOf(socket.id);
		const game = room && gameOf(room);

		if (!game || !game.choosing)
			return;
		if (socket.id !== game.choosing.drawerId)
			return;
		if (!game.choosing.options.includes(payload.word))
			return;

		startChosenTurn(io, room, game, payload.word)
			.catch((err) => console.error('[round]', err.message));
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

/** Keeps the drawer pointing at the right connection after a reload. */
function reclaimInGame(io, room, oldMemberId, newMemberId)
{
	const game = gameOf(room);
	if (!game)
		return;
	if (game.drawerId === oldMemberId)
	{
		game.drawerId = newMemberId;
		// Resend the word: a drawer who reconnected mid-turn was left seeing
		// only the mask, with no idea what to draw.
		if (game.phase === round.PHASE.drawing && game.word)
			io.to(newMemberId).emit('round:word', game.word);
	}
	// A reload in the middle of picking a word keeps the choice open.
	if (game.choosing && game.choosing.drawerId === oldMemberId)
	{
		game.choosing.drawerId = newMemberId;
		// Resend the 3 options with the time left: when starting via the lobby
		// the first 'round:choices' goes to the old socket (the rooms page),
		// which does not show it — the new /game socket reclaims the seat HERE,
		// and without this resend it would never see the choice modal (a bug
		// first seen on mobile, but it affected the 1st turn everywhere).
		io.to(newMemberId).emit('round:choices', {
			options: game.choosing.options,
			seconds: Math.max(1, Math.ceil((game.choosing.deadline - Date.now()) / 1000)),
		});
	}
}

module.exports = { registerRoundHandlers, startGameLoop, forgetMember, gameOf, reclaimInGame };
