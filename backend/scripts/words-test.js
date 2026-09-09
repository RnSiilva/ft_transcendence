/**
 * words-test.js
 * Word list and guess matching. Pure data and pure functions, no server.
 *
 *   docker exec backend npm run test:words
 */

const { WORDS, normalise, matchesWord, pickFrom, maskWord } = require('../src/game/words');

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

step('1. A lista esta completa e sem repetidos');
check(
	'os temas sao os mesmos que o frontend oferece',
	Object.keys(WORDS).sort(),
	['animals', 'food', 'general', 'movies', 'objects'],
);

const incomplete = [];
const duplicated = [];
// A base de dados exige cada palavra unica em toda a tabela, nao so por tema.
const seen = new Map();

for (const [theme, entries] of Object.entries(WORDS))
{
	for (const entry of entries)
	{
		if (!entry.pt || !entry.en || !entry.es)
			incomplete.push(`${theme}: ${JSON.stringify(entry)}`);

		for (const language of ['pt', 'en', 'es'])
		{
			const key = `${language}:${normalise(entry[language])}`;
			if (seen.has(key))
				duplicated.push(`${key} em ${seen.get(key)} e em ${theme}`);
			seen.set(key, theme);
		}
	}
}

check('todas as palavras tem as tres linguas', incomplete, []);
check('nenhuma palavra repetida, nem entre temas', duplicated, []);
check('cada tema tem pelo menos 20 palavras', Object.values(WORDS).every((w) => w.length >= 20), true);

step('2. Acentos e maiusculas sao ignorados');
check('GATO conta como gato', matchesWord('GATO', 'gato'), true);
check('caes com til conta sem til', matchesWord('cao', 'cão'), true);
check('arvore sem acento conta', matchesWord('arvore', 'árvore'), true);
check('espacos a volta nao contam', matchesWord('  gato  ', 'gato'), true);

step('3. So conta se a mensagem for a palavra inteira');
check('"gato" acerta', matchesWord('gato', 'gato'), true);
check('"deve ser um gato" NAO acerta', matchesWord('deve ser um gato', 'gato'), false);
check('"gatos" NAO acerta', matchesWord('gatos', 'gato'), false);
check('mensagem vazia nao acerta', matchesWord('', 'gato'), false);
check('so espacos nao acerta', matchesWord('   ', 'gato'), false);
check('palavra errada nao acerta', matchesWord('cao', 'gato'), false);

step('4. O sorteio nao repete enquanto houver palavras por usar');
const comida = WORDS.food.map((w) => w.pt);
const todasMenosUma = comida.slice(0, comida.length - 1);
check('sobra so uma, e essa que sai', pickFrom(comida, todasMenosUma), comida[comida.length - 1]);
check('esgotadas, recomeca em vez de falhar', comida.includes(pickFrom(comida, comida)), true);
check('sai sempre de dentro da lista', comida.includes(pickFrom(comida)), true);

step('5. Valores inesperados nao rebentam');
check('lista vazia devolve nada', pickFrom([]), null);
check('sem lista nenhuma devolve nada', pickFrom(null), null);
check('normalise aceita nao-texto', normalise(null), '');

step('6. A mascara mostrada a quem adivinha');
check('gato fica _ _ _ _', maskWord('gato'), '_ _ _ _');
check('os espacos ficam visiveis', maskWord('ice cream'), '_ _ _   _ _ _ _ _');

console.log(`\n${checks} verificacoes, ${failures.length} falhas.`);

if (failures.length > 0)
{
	console.error('\nFalhou:');
	failures.forEach((f) => console.error(`   - ${f}`));
}

process.exit(failures.length === 0 ? 0 : 1);
