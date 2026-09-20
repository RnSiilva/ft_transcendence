/**
 * round-test.js
 * The rules of a game: rounds, guesses, scores, and what the clients are told.
 * Time is passed in, so the whole thing runs instantly with no waiting.
 *
 *   docker exec backend npm run test:round
 */

const {
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
} = require('../src/game/round');

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

const T0 = 1_000_000; // a fixed "now", so the clock is ours to control
const at = (seconds) => T0 + seconds * 1000;

const members = [
	{ id: 'ana', name: 'Ana' },
	{ id: 'bruno', name: 'Bruno' },
	{ id: 'carla', name: 'Carla' },
];

step('1. A game starts stopped');
const novo = createGame(3, 60);
check('no round yet', novo.round, 0);
check('waiting', novo.phase, PHASE.waiting);
check('no time counting', secondsLeft(novo, T0), 0);

step('2. The round starts with the word it is given');
const jogo = createGame(3, 60);
startTurn(jogo, 'gato', 'ana', 3, T0);
check('it is being drawn', jogo.phase, PHASE.drawing);
check('it is round 1', jogo.round, 1);
check('Ana holds the pencil', jogo.drawerId, 'ana');
check('60 seconds at the start', secondsLeft(jogo, T0), 60);
check('45 halfway', secondsLeft(jogo, at(15)), 45);
check('0 at the end', secondsLeft(jogo, at(60)), 0);
check('does not go below 0', secondsLeft(jogo, at(90)), 0);

step('3. The drawer cannot guess');
check('Ana is refused', registerGuess(jogo, 'ana', 'gato', 2, at(5)).reason, 'IS_DRAWER');

step('4. Right and wrong guesses');
const errado = registerGuess(jogo, 'bruno', 'cao', 2, at(5));
check('a wrong word does not count', errado.correct, false);
check('and that is the reason', errado.reason, 'WRONG');

const frase = registerGuess(jogo, 'bruno', 'deve ser um gato', 2, at(5));
check('a sentence with the word inside does not count', frase.correct, false);

const certo = registerGuess(jogo, 'bruno', 'GATO', 2, at(10));
check('correct without accents and in uppercase', certo.correct, true);
check('and is the first', certo.position, 1);
// At 10s of 60: 50 left, fraction 0.833 -> speed 85 + 1st-place bonus 25.
check('earns speed points plus the bonus', certo.points, 110);

const repetido = registerGuess(jogo, 'bruno', 'gato', 2, at(12));
check('does not score twice', repetido.reason, 'ALREADY_GUESSED');

const segunda = registerGuess(jogo, 'carla', 'gato', 2, at(30));
check('Carla is correct in second place', segunda.position, 2);
check('later is worth less', segunda.points < certo.points, true);

step('5. While the round is running, the word is a secret');
const durante = snapshot(jogo, members, at(30));
check('the word does not travel', durante.word, null);
check('only the mask', durante.maskedWord, '_ _ _ _');
check('the scoreboard comes sorted', durante.scores.map((s) => s.name), ['Bruno', 'Ana', 'Carla']);
check('those who already guessed are marked', durante.scores.find((s) => s.name === 'Bruno').guessed, true);

step('6. The round ends by time or by everyone guessing');
const porTempo = createGame(3, 60);
startTurn(porTempo, 'casa', 'ana', 3, T0);
check('halfway, not yet', isRoundOver(porTempo, 2, at(30)), false);
check('time out, yes', isRoundOver(porTempo, 2, at(60)), true);

check('with both correct, it ends early', isRoundOver(jogo, 2, at(31)), true);

step('7. The drawer earns from what the others understood');
const fim = endTurn(jogo, 2);
check('the word is revealed', fim.word, 'gato');
check('the drawer earns points', fim.drawerPoints > 0, true);
check('more rounds remain, it stays in result', jogo.phase, PHASE.result);
check('now the word travels', snapshot(jogo, members, at(61)).word, 'gato');

step('8. Leaving midway loses everything');
check('Bruno had points', jogo.totals.get('bruno') > 0, true);
dropMember(jogo, 'bruno');
check('and is left with nothing', jogo.totals.has('bruno'), false);
check('and drops off the round scoreboard', jogo.correct.some((c) => c.memberId === 'bruno'), false);

step('9. The game ends on the last round');
const curto = createGame(1, 60);
startTurn(curto, 'sol', 'ana', 1, T0);
endTurn(curto, 2);
check('a single round, done', curto.phase, PHASE.finished);

step('10. Words do not repeat in the same game');
const repetidas = createGame(3, 60);
startTurn(repetidas, 'sol', 'ana', 2, T0);
startTurn(repetidas, 'lua', 'bruno', 2, at(60));
check('it keeps the ones already used', repetidas.usedWords, ['sol', 'lua']);

step('11. A round only ends once everyone has drawn');
const tresJogadores = createGame(2, 60); // 2 rounds, 3 players = 6 turns

const percurso = [];
for (let i = 0; i < 6; i += 1)
{
	startTurn(tresJogadores, `palavra${i}`, members[i % 3].id, 3, T0 + i * 70000);
	percurso.push(`${tresJogadores.round}.${tresJogadores.turn}`);
	endTurn(tresJogadores, 2);
}

check('each one draws once per round', percurso, ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3']);
check('it only ends after the last turn', tresJogadores.phase, PHASE.finished);
check('and everyone drew twice', tresJogadores.usedWords.length, 6);

const meio = createGame(2, 60);
startTurn(meio, 'sol', 'ana', 3, T0);
endTurn(meio, 2);
check('halfway through the first round it has not ended', meio.phase, PHASE.result);

step('12. Alone in the room, the clock stops');
const pausado = createGame(3, 60);
startTurn(pausado, 'gato', 'ana', 3, T0);

pauseGame(pausado, at(20));
check('it is paused', pausado.phase, PHASE.paused);
check('it keeps the time that was left', secondsLeft(pausado, at(20)), 40);
check('and the time does not move', secondsLeft(pausado, at(300)), 40);
check('the round does not close while paused', isRoundOver(pausado, 0, at(300)), false);
check('and no guessing happens', registerGuess(pausado, 'bruno', 'gato', 2, at(300)).reason, 'NOT_DRAWING');

resumeGame(pausado, at(300));
check('on resuming it keeps drawing', pausado.phase, PHASE.drawing);
check('with the time where it was', secondsLeft(pausado, at(300)), 40);
check('and starts moving again', secondsLeft(pausado, at(310)), 30);

step('13. Outside the round there is no guessing');
check('while waiting, refused', registerGuess(createGame(3, 60), 'ana', 'gato', 2, T0).reason, 'NOT_DRAWING');
check('in result, refused', registerGuess(jogo, 'carla', 'gato', 2, at(65)).reason, 'NOT_DRAWING');

console.log(`\n${checks} checks, ${failures.length} failures.`);

if (failures.length > 0)
{
	console.error('\nFailed:');
	failures.forEach((f) => console.error(`   - ${f}`));
}

process.exit(failures.length === 0 ? 0 : 1);
