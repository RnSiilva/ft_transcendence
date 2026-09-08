/**
 * words.repository.js
 * Everything that touches Prisma, kept apart so the rules in words.js stay
 * testable without a database.
 */

const { PrismaClient } = require('@prisma/client');

const { WORDS, pickFrom } = require('./words');

const prisma = new PrismaClient();

const COLUMN = { pt: 'textPt', en: 'textEn', es: 'textEs' };

/** Only fills an empty table, so words added later are never overwritten. */
async function seedWords()
{
	if (await prisma.word.count() > 0)
		return 0;

	const rows = Object.entries(WORDS).flatMap(([theme, entries]) =>
		entries.map((entry) => ({
			theme,
			textPt: entry.pt,
			textEn: entry.en,
			textEs: entry.es,
		})),
	);

	const { count } = await prisma.word.createMany({ data: rows });
	return count;
}

/** "general" is not a theme of its own: it draws from every word there is. */
async function pickWord(theme, language, used = [])
{
	const column = COLUMN[language] || COLUMN.en;
	const where = theme && theme !== 'general' ? { theme } : {};

	const rows = await prisma.word.findMany({ where, select: { [column]: true } });

	return pickFrom(rows.map((row) => row[column]), used);
}

module.exports = { seedWords, pickWord };
