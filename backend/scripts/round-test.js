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
		failures.push(`${label}\n      esperado: ${JSON.stringify(expected)}\n      recebido: ${JSON.stringify(actual)}`);

	console.log(`   ${ok ? 'OK  ' : 'FALHA'} ${label}`);
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

step('1. Um jogo comeca parado');
const novo = createGame(3, 60);
check('sem ronda nenhuma', novo.round, 0);
check('a espera', novo.phase, PHASE.waiting);
check('sem tempo a contar', secondsLeft(novo, T0), 0);

step('2. A ronda arranca com a palavra que lhe derem');
const jogo = createGame(3, 60);
startTurn(jogo, 'gato', 'ana', 3, T0);
check('esta a desenhar-se', jogo.phase, PHASE.drawing);
check('e a ronda 1', jogo.round, 1);
check('a Ana tem o lapis', jogo.drawerId, 'ana');
check('60 segundos no inicio', secondsLeft(jogo, T0), 60);
check('45 a meio', secondsLeft(jogo, at(15)), 45);
check('0 no fim', secondsLeft(jogo, at(60)), 0);
check('nao passa de 0', secondsLeft(jogo, at(90)), 0);

step('3. Quem desenha nao pode adivinhar');
check('a Ana e recusada', registerGuess(jogo, 'ana', 'gato', at(5)).reason, 'IS_DRAWER');

step('4. Palpites certos e errados');
const errado = registerGuess(jogo, 'bruno', 'cao', at(5));
check('palavra errada nao conta', errado.correct, false);
check('e o motivo e esse', errado.reason, 'WRONG');

const frase = registerGuess(jogo, 'bruno', 'deve ser um gato', at(5));
check('frase com a palavra dentro nao conta', frase.correct, false);

const certo = registerGuess(jogo, 'bruno', 'GATO', at(10));
check('acerta sem acentos e em maiusculas', certo.correct, true);
check('e o primeiro', certo.position, 1);
// Aos 10s de 60: restam 50, fraccao 0,833 -> rapidez 85 + bonus de 1o lugar 25.
check('ganha por rapidez mais bonus', certo.points, 110);

const repetido = registerGuess(jogo, 'bruno', 'gato', at(12));
check('nao pontua duas vezes', repetido.reason, 'ALREADY_GUESSED');

const segunda = registerGuess(jogo, 'carla', 'gato', at(30));
check('a Carla acerta em segundo', segunda.position, 2);
check('mais tarde vale menos', segunda.points < certo.points, true);

step('5. Enquanto a ronda decorre, a palavra e um segredo');
const durante = snapshot(jogo, members, at(30));
check('a palavra nao viaja', durante.word, null);
check('so a mascara', durante.maskedWord, '_ _ _ _');
check('o placar vem ordenado', durante.scores.map((s) => s.name), ['Bruno', 'Carla', 'Ana']);
check('quem ja acertou esta marcado', durante.scores.find((s) => s.name === 'Bruno').guessed, true);

step('6. A ronda acaba pelo tempo ou por todos acertarem');
const porTempo = createGame(3, 60);
startTurn(porTempo, 'casa', 'ana', 3, T0);
check('a meio ainda nao', isRoundOver(porTempo, 2, at(30)), false);
check('esgotado o tempo, sim', isRoundOver(porTempo, 2, at(60)), true);

check('com os dois a acertar, acaba antes', isRoundOver(jogo, 2, at(31)), true);

step('7. Quem desenhou recebe pelo que os outros perceberam');
const fim = endTurn(jogo, 2);
check('a palavra e revelada', fim.word, 'gato');
check('quem desenhou ganha pontos', fim.drawerPoints > 0, true);
check('ainda faltam rondas, fica em resultado', jogo.phase, PHASE.result);
check('agora a palavra viaja', snapshot(jogo, members, at(61)).word, 'gato');

step('8. Sair a meio perde tudo');
check('o Bruno tinha pontos', jogo.totals.get('bruno') > 0, true);
dropMember(jogo, 'bruno');
check('e fica sem nada', jogo.totals.has('bruno'), false);
check('e sai do placar da ronda', jogo.correct.some((c) => c.memberId === 'bruno'), false);

step('9. O jogo termina na ultima ronda');
const curto = createGame(1, 60);
startTurn(curto, 'sol', 'ana', 1, T0);
endTurn(curto, 2);
check('uma ronda so, acabou', curto.phase, PHASE.finished);

step('10. Palavras nao se repetem no mesmo jogo');
const repetidas = createGame(3, 60);
startTurn(repetidas, 'sol', 'ana', 2, T0);
startTurn(repetidas, 'lua', 'bruno', 2, at(60));
check('guarda as que ja sairam', repetidas.usedWords, ['sol', 'lua']);

step('11. Uma ronda so acaba quando todos ja desenharam');
const tresJogadores = createGame(2, 60); // 2 rondas, 3 jogadores = 6 turnos

const percurso = [];
for (let i = 0; i < 6; i += 1)
{
	startTurn(tresJogadores, `palavra${i}`, members[i % 3].id, 3, T0 + i * 70000);
	percurso.push(`${tresJogadores.round}.${tresJogadores.turn}`);
	endTurn(tresJogadores, 2);
}

check('cada um desenha uma vez por ronda', percurso, ['1.1', '1.2', '1.3', '2.1', '2.2', '2.3']);
check('so acaba no fim do ultimo turno', tresJogadores.phase, PHASE.finished);
check('e todos desenharam duas vezes', tresJogadores.usedWords.length, 6);

const meio = createGame(2, 60);
startTurn(meio, 'sol', 'ana', 3, T0);
endTurn(meio, 2);
check('a meio da primeira ronda ainda nao acabou', meio.phase, PHASE.result);

step('12. Fora da ronda nao se adivinha');
check('em espera, recusa', registerGuess(createGame(3, 60), 'ana', 'gato', T0).reason, 'NOT_DRAWING');
check('em resultado, recusa', registerGuess(jogo, 'carla', 'gato', at(65)).reason, 'NOT_DRAWING');

console.log(`\n${checks} verificacoes, ${failures.length} falhas.`);

if (failures.length > 0)
{
	console.error('\nFalhou:');
	failures.forEach((f) => console.error(`   - ${f}`));
}

process.exit(failures.length === 0 ? 0 : 1);
