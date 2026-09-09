/**
 * scoring.js
 * Points awarded at the end of a round.
 *
 * Everything derives from the fraction of the round still left when someone
 * guessed, so the same rules behave identically in a 30-second room and a
 * 120-second one.
 */

const MAX_CORRECT = 100;
const MIN_CORRECT = 10;
const PLACE_BONUS = [30, 20, 10]; // 1st, 2nd, 3rd
const MAX_DRAWER = 100;

const clamp01 = (n) => Math.min(1, Math.max(0, n));

function timeFraction(secondsLeft, roundSeconds)
{
	if (!Number.isFinite(roundSeconds) || roundSeconds <= 0)
		return 0;

	return clamp01(secondsLeft / roundSeconds);
}

/** `position` is 1-based. The placement bonus shrinks with time too. */
function scoreGuess({ secondsLeft, roundSeconds, position })
{
	const fraction = timeFraction(secondsLeft, roundSeconds);

	const speed = MIN_CORRECT + Math.round((MAX_CORRECT - MIN_CORRECT) * fraction);
	const placement = Math.round((PLACE_BONUS[position - 1] || 0) * fraction);

	return speed + placement;
}

/**
 * How many worked it out, and how fast. Independent of room size: paying per
 * guess would make drawing to eight people worth twice as much as to four.
 */
function scoreDrawer({ secondsLeftPerGuess, guesserCount, roundSeconds })
{
	const guesses = Array.isArray(secondsLeftPerGuess) ? secondsLeftPerGuess : [];

	if (guesserCount <= 0 || guesses.length === 0)
		return 0;

	const coverage = clamp01(guesses.length / guesserCount);

	const totalFraction = guesses.reduce(
		(sum, secondsLeft) => sum + timeFraction(secondsLeft, roundSeconds),
		0,
	);

	return Math.round(MAX_DRAWER * coverage * (totalFraction / guesses.length));
}

/** `correctGuesses` must be in the order people got it right. */
function scoreRound({ correctGuesses, guesserCount, roundSeconds })
{
	const guesses = Array.isArray(correctGuesses) ? correctGuesses : [];

	const guessers = guesses.map((guess, index) => ({
		memberId: guess.memberId,
		points: scoreGuess({
			secondsLeft: guess.secondsLeft,
			roundSeconds,
			position: index + 1,
		}),
	}));

	const drawer = scoreDrawer({
		secondsLeftPerGuess: guesses.map((guess) => guess.secondsLeft),
		guesserCount,
		roundSeconds,
	});

	return { guessers, drawer };
}

module.exports = {
	timeFraction,
	scoreGuess,
	scoreDrawer,
	scoreRound,
	MAX_CORRECT,
	MIN_CORRECT,
	PLACE_BONUS,
	MAX_DRAWER,
};