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
		failures.push(`${label}\n      esperado: ${JSON.stringify(expected)}\n      recebido: ${JSON.stringify(actual)}`);

	console.log(`   ${ok ? 'OK  ' : 'FALHA'} ${label}`);
	return ok;
}

function step(title)
{
	console.log(`\n${title}`);
}

step('1. Extremos de quem acerta (ronda de 60s)');
check(
	'acertar no primeiro instante, em 1o lugar',
	scoreGuess({ secondsLeft: 60, roundSeconds: 60, position: 1 }),
	130,
);
check(
	'acertar no ultimo segundo ainda da o minimo',
	scoreGuess({ secondsLeft: 0, roundSeconds: 60, position: 1 }),
	10,
);
check(
	'do 4o lugar em diante nao ha bonus',
	scoreGuess({ secondsLeft: 60, roundSeconds: 60, position: 4 }),
	100,
);

step('2. A mesma rapidez vale o mesmo em rondas de duracoes diferentes');
const metadeDe30 = scoreGuess({ secondsLeft: 15, roundSeconds: 30, position: 1 });
const metadeDe120 = scoreGuess({ secondsLeft: 60, roundSeconds: 120, position: 1 });
check('metade do tempo numa ronda de 30s', metadeDe30, 70);
check('metade do tempo numa ronda de 120s', metadeDe120, 70);
check('sao iguais', metadeDe30 === metadeDe120, true);

step('3. Quem desenha');
check(
	'ninguem acertou',
	scoreDrawer({ secondsLeftPerGuess: [], guesserCount: 4, roundSeconds: 60 }),
	0,
);
check(
	'todos acertaram de imediato',
	scoreDrawer({ secondsLeftPerGuess: [60, 60, 60, 60], guesserCount: 4, roundSeconds: 60 }),
	100,
);
check(
	'metade acertou, e devagar',
	scoreDrawer({ secondsLeftPerGuess: [15, 15], guesserCount: 4, roundSeconds: 60 }),
	13,
);

step('4. A pontuacao de quem desenha nao depende do tamanho da sala');
const sala4 = scoreDrawer({ secondsLeftPerGuess: [30, 30, 30, 30], guesserCount: 4, roundSeconds: 60 });
const sala8 = scoreDrawer({ secondsLeftPerGuess: [30, 30, 30, 30, 30, 30, 30, 30], guesserCount: 8, roundSeconds: 60 });
check('sala de 4', sala4, 50);
check('sala de 8, mesma rapidez', sala8, 50);
check('sao iguais', sala4 === sala8, true);

step('5. Valores fora do esperado nao rebentam');
check('ronda de 0 segundos', timeFraction(10, 0), 0);
check('tempo negativo conta como esgotado', timeFraction(-5, 60), 0);
check('tempo a mais conta como cheio', timeFraction(999, 60), 1);
check('sem palpites nenhuns', scoreDrawer({ secondsLeftPerGuess: null, guesserCount: 4, roundSeconds: 60 }), 0);
check('sala sem ninguem para adivinhar', scoreDrawer({ secondsLeftPerGuess: [60], guesserCount: 0, roundSeconds: 60 }), 0);

step('6. Ronda completa — os numeros que estao documentados');
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

check('Ana, 1a aos 8s', ronda.guessers[0], { memberId: 'ana', points: 114 });
check('Bruno, 2o aos 15s', ronda.guessers[1], { memberId: 'bruno', points: 93 });
check('Carla, 3a aos 35s', ronda.guessers[2], { memberId: 'carla', points: 52 });
check('Diogo, 4o aos 58s', ronda.guessers[3], { memberId: 'diogo', points: 13 });
check('quem desenhou', ronda.drawer, 52);

console.log(`\n${checks} verificacoes, ${failures.length} falhas.`);

if (failures.length > 0)
{
	console.error('\nFalhou:');
	failures.forEach((f) => console.error(`   - ${f}`));
}

process.exit(failures.length === 0 ? 0 : 1);