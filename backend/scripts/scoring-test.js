/**
 * scoring-test.js
 * Scoring is pure arithmetic, so it needs no server and no database.
 *
 *   docker exec backend npm run test:scoring
 */

const {
	timeFraction,
	scoreGuess,
	scoreDrawer,
	scoreRound,
} = require('../src/game/scoring');

let checks = 0;
const failures = [];

function check(label, actual, expected)
{
	checks += 1;

	const ok = JSON.stringify(actual) === JSON.stringify(expected);
	if (!ok)
		failures.push(`${label}\n      expected: ${JSON.stringify(expected)}\n      received: ${JSON.stringify(actual)}`);

	console.log(`   ${ok ? 'OK  ' : 'FAIL'} ${label}`);
	return ok;
}

function step(title)
{
	console.log(`\n${title}`);
}

step('1. Extremes for a correct guesser (60s round)');
check(
	'guessing at the first instant, in 1st place',
	scoreGuess({ secondsLeft: 60, roundSeconds: 60, position: 1 }),
	130,
);
check(
	'guessing on the last second still gives the minimum',
	scoreGuess({ secondsLeft: 0, roundSeconds: 60, position: 1 }),
	10,
);
check(
	'from 4th place onward there is no bonus',
	scoreGuess({ secondsLeft: 60, roundSeconds: 60, position: 4 }),
	100,
);

step('2. The same speed is worth the same across rounds of different lengths');
const metadeDe30 = scoreGuess({ secondsLeft: 15, roundSeconds: 30, position: 1 });
const metadeDe120 = scoreGuess({ secondsLeft: 60, roundSeconds: 120, position: 1 });
check('half the time in a 30s round', metadeDe30, 70);
check('half the time in a 120s round', metadeDe120, 70);
check('they are equal', metadeDe30 === metadeDe120, true);

step('3. The drawer');
check(
	'nobody guessed',
	scoreDrawer({ secondsLeftPerGuess: [], guesserCount: 4, roundSeconds: 60 }),
	0,
);
check(
	'everyone guessed immediately',
	scoreDrawer({ secondsLeftPerGuess: [60, 60, 60, 60], guesserCount: 4, roundSeconds: 60 }),
	100,
);
check(
	'half guessed, and slowly',
	scoreDrawer({ secondsLeftPerGuess: [15, 15], guesserCount: 4, roundSeconds: 60 }),
	13,
);

step('4. The drawer score does not depend on the room size');
const sala4 = scoreDrawer({ secondsLeftPerGuess: [30, 30, 30, 30], guesserCount: 4, roundSeconds: 60 });
const sala8 = scoreDrawer({ secondsLeftPerGuess: [30, 30, 30, 30, 30, 30, 30, 30], guesserCount: 8, roundSeconds: 60 });
check('room of 4', sala4, 50);
check('room of 8, same speed', sala8, 50);
check('they are equal', sala4 === sala8, true);

step('5. Unexpected values do not blow up');
check('round of 0 seconds', timeFraction(10, 0), 0);
check('negative time counts as timed out', timeFraction(-5, 60), 0);
check('excess time counts as full', timeFraction(999, 60), 1);
check('no guesses at all', scoreDrawer({ secondsLeftPerGuess: null, guesserCount: 4, roundSeconds: 60 }), 0);
check('room with nobody to guess', scoreDrawer({ secondsLeftPerGuess: [60], guesserCount: 0, roundSeconds: 60 }), 0);

step('6. Full round — the documented numbers');
const ronda = scoreRound({
	roundSeconds: 60,
	guesserCount: 4,
	correctGuesses: [
		{ memberId: 'ana', secondsLeft: 52 },
		{ memberId: 'bruno', secondsLeft: 45 },
		{ memberId: 'carla', secondsLeft: 25 },
		{ memberId: 'diogo', secondsLeft: 2 },
	],
});

check('Ana, 1st at 8s', ronda.guessers[0], { memberId: 'ana', points: 114 });
check('Bruno, 2nd at 15s', ronda.guessers[1], { memberId: 'bruno', points: 93 });
check('Carla, 3rd at 35s', ronda.guessers[2], { memberId: 'carla', points: 52 });
check('Diogo, 4th at 58s', ronda.guessers[3], { memberId: 'diogo', points: 13 });
check('the drawer', ronda.drawer, 52);

console.log(`\n${checks} checks, ${failures.length} failures.`);

if (failures.length > 0)
{
	console.error('\nFailed:');
	failures.forEach((f) => console.error(`   - ${f}`));
}

process.exit(failures.length === 0 ? 0 : 1);