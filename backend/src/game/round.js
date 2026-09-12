/**
 * round.js
 * A game: a sequence of rounds inside one room.
 *
 * No timers and no sockets — time is passed in, and the word is handed to
 * startRound by whoever fetched it. That keeps the rules testable on their
 * own, and lets the caller decide whether the word was drawn at random or
 * chosen by the person drawing.
 */

const { matchesWord, maskWord } = require('./words');
const { scoreGuess, scoreDrawer } = require('./scoring');

const PHASE = {
	waiting: 'waiting',   // not started yet
	drawing: 'drawing',   // the word is secret and the clock is running
	result: 'result',     // the word is revealed between rounds
	paused: 'paused',     // too few players; the clock waits for them
	finished: 'finished', // every round played
};

function createGame(totalRounds, roundSeconds)
{
	return {
		phase: PHASE.waiting,
		// A round is everyone drawing once, so it holds as many turns as there
		// are players. Counting rounds as single turns would leave whoever sits
		// at the end of the order never drawing at all.
		round: 0,
		turn: 0,
		turnsPerRound: 0,
		totalRounds,
		roundSeconds,
		word: null,
		drawerId: null,
		usedWords: [],
		startedAt: null,
		pausedFrom: null,
		pausedSecondsLeft: 0,
		correct: [],       // [{ memberId, secondsLeft }] in the order they got it
		totals: new Map(), // memberId -> points so far this game
	};
}

/**
 * Begins one turn — a single person drawing. The caller picks the word, so the
 * same function serves a random draw and a word chosen from a shortlist.
 *
 * `playerCount` sets how many turns the round holds, read when the round opens
 * so that someone joining midway does not stretch it.
 */
function startTurn(game, word, drawerId, playerCount, now = Date.now())
{
	const roundIsOver = game.turn === 0 || game.turn >= game.turnsPerRound;

	if (roundIsOver)
	{
		game.round += 1;
		game.turn = 1;
		game.turnsPerRound = Math.max(1, playerCount);
	}
	else
	{
		game.turn += 1;
	}

	game.phase = PHASE.drawing;
	game.word = word;
	game.drawerId = drawerId;
	game.usedWords.push(word);
	game.startedAt = now;
	game.correct = [];

	return game;
}

function secondsLeft(game, now = Date.now())
{
	if (game.phase === PHASE.paused)
		return game.pausedSecondsLeft;

	if (game.phase !== PHASE.drawing || !game.startedAt)
		return 0;

	const elapsed = (now - game.startedAt) / 1000;
	return Math.max(0, Math.ceil(game.roundSeconds - elapsed));
}

/**
 * Stops the clock when the room empties out. Without this, "everyone has
 * guessed" would be true of nobody and the rounds would run themselves to the
 * end while a single player watched.
 */
function pauseGame(game, now = Date.now())
{
	if (game.phase === PHASE.paused || game.phase === PHASE.finished)
		return game;

	game.pausedFrom = game.phase;
	game.pausedSecondsLeft = secondsLeft(game, now);
	game.phase = PHASE.paused;

	return game;
}

/** Picks up where it stopped, with the same time left on the clock. */
function resumeGame(game, now = Date.now())
{
	if (game.phase !== PHASE.paused)
		return game;

	game.phase = game.pausedFrom || PHASE.drawing;

	if (game.phase === PHASE.drawing)
		game.startedAt = now - (game.roundSeconds - game.pausedSecondsLeft) * 1000;

	game.pausedFrom = null;
	return game;
}

const hasGuessed = (game, memberId) =>
	game.correct.some((entry) => entry.memberId === memberId);

/**
 * A wrong message is not an error — it is just chat, and the caller passes it
 * on to the room as such.
 */
function registerGuess(game, memberId, text, now = Date.now())
{
	if (game.phase !== PHASE.drawing)
		return { correct: false, reason: 'NOT_DRAWING' };

	if (memberId === game.drawerId)
		return { correct: false, reason: 'IS_DRAWER' };

	if (hasGuessed(game, memberId))
		return { correct: false, reason: 'ALREADY_GUESSED' };

	if (!matchesWord(text, game.word))
		return { correct: false, reason: 'WRONG' };

	const left = secondsLeft(game, now);

	game.correct.push({ memberId, secondsLeft: left });

	const points = scoreGuess({
		secondsLeft: left,
		roundSeconds: game.roundSeconds,
		position: game.correct.length,
	});

	game.totals.set(memberId, (game.totals.get(memberId) || 0) + points);

	return { correct: true, points, position: game.correct.length };
}

/** The round is over when the clock runs out, or once nobody is left to guess. */
function isRoundOver(game, guesserCount, now = Date.now())
{
	if (game.phase !== PHASE.drawing)
		return false;

	return secondsLeft(game, now) <= 0 || game.correct.length >= guesserCount;
}

/** Reveals the word and pays the person who drew it. */
function endTurn(game, guesserCount)
{
	const drawerPoints = scoreDrawer({
		secondsLeftPerGuess: game.correct.map((entry) => entry.secondsLeft),
		guesserCount,
		roundSeconds: game.roundSeconds,
	});

	if (game.drawerId)
		game.totals.set(game.drawerId, (game.totals.get(game.drawerId) || 0) + drawerPoints);

	// Over only once the last person of the last round has drawn.
	const lastTurn = game.turn >= game.turnsPerRound;
	game.phase = lastTurn && game.round >= game.totalRounds ? PHASE.finished : PHASE.result;

	return { word: game.word, drawerPoints, correct: [...game.correct] };
}

/**
 * Leaving forfeits everything, even words already guessed — otherwise there
 * is a reason to quit the moment you are ahead.
 */
function dropMember(game, memberId)
{
	game.totals.delete(memberId);
	game.correct = game.correct.filter((entry) => entry.memberId !== memberId);
}

/** What the clients are told. The word only travels once the round is over. */
function snapshot(game, members, now = Date.now())
{
	const revealed = game.phase === PHASE.result || game.phase === PHASE.finished;

	return {
		phase: game.phase,
		round: game.round,
		totalRounds: game.totalRounds,
		turn: game.turn,
		turnsPerRound: game.turnsPerRound,
		secondsLeft: secondsLeft(game, now),
		maskedWord: game.word ? maskWord(game.word) : '',
		word: revealed ? game.word : null,
		scores: members
			.map((member) => ({
				id: member.id,
				userId: member.userId,
				name: member.name,
				points: game.totals.get(member.id) || 0,
				isDrawer: member.id === game.drawerId,
				guessed: hasGuessed(game, member.id),
			}))
			.sort((a, b) => b.points - a.points),
	};
}

module.exports = {
	PHASE,
	createGame,
	startTurn,
	secondsLeft,
	pauseGame,
	resumeGame,
	registerGuess,
	isRoundOver,
	endTurn,
	dropMember,
	snapshot,
};
