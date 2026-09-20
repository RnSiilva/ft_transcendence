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
		failures.push(`${label}\n      expected: ${JSON.stringify(expected)}\n      received: ${JSON.stringify(actual)}`);

	console.log(`   ${ok ? 'OK  ' : 'FAIL'} ${label}`);
	return ok;
}

function step(title)
{
	console.log(`\n${title}`);
}

step('1. The list is complete and has no duplicates');
check(
	'the themes are the same ones the frontend offers',
	Object.keys(WORDS).sort(),
	['animals', 'food', 'general', 'movies', 'objects'],
);

const incomplete = [];
const duplicated = [];
// The database requires each word unique across the whole table, not just per theme.
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

check('every word has the three languages', incomplete, []);
check('no repeated word, not even across themes', duplicated, []);
check('each theme has at least 20 words', Object.values(WORDS).every((w) => w.length >= 20), true);

step('2. Accents and uppercase are ignored');
check('GATO counts as gato', matchesWord('GATO', 'gato'), true);
check('a word with the tilde counts without it', matchesWord('cao', 'cão'), true);
check('árvore without the accent counts', matchesWord('arvore', 'árvore'), true);
check('surrounding spaces do not count', matchesWord('  gato  ', 'gato'), true);

step('3. It only counts if the message is the whole word');
check('"gato" matches', matchesWord('gato', 'gato'), true);
check('"deve ser um gato" does NOT match', matchesWord('deve ser um gato', 'gato'), false);
check('"gatos" does NOT match', matchesWord('gatos', 'gato'), false);
check('an empty message does not match', matchesWord('', 'gato'), false);
check('only spaces does not match', matchesWord('   ', 'gato'), false);
check('a wrong word does not match', matchesWord('cao', 'gato'), false);

step('4. The draw does not repeat while there are unused words');
const comida = WORDS.food.map((w) => w.pt);
const todasMenosUma = comida.slice(0, comida.length - 1);
check('only one is left, and that is the one drawn', pickFrom(comida, todasMenosUma), comida[comida.length - 1]);
check('once exhausted, it restarts instead of failing', comida.includes(pickFrom(comida, comida)), true);
check('it always comes from within the list', comida.includes(pickFrom(comida)), true);

step('5. Unexpected values do not blow up');
check('an empty list returns nothing', pickFrom([]), null);
check('no list at all returns nothing', pickFrom(null), null);
check('normalise accepts non-text', normalise(null), '');

step('6. The mask shown to the guessers');
check('gato becomes _ _ _ _', maskWord('gato'), '_ _ _ _');
check('the spaces stay visible', maskWord('ice cream'), '_ _ _   _ _ _ _ _');

console.log(`\n${checks} checks, ${failures.length} failures.`);

if (failures.length > 0)
{
	console.error('\nFailed:');
	failures.forEach((f) => console.error(`   - ${f}`));
}

process.exit(failures.length === 0 ? 0 : 1);
