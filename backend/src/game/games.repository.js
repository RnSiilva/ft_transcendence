/**
 * games.repository.js
 * Saves finished games and reads the leaderboards.
 *
 * Nothing is written until the game ends: the team decided that leaving early
 * forfeits everything, so a score only becomes real once there is a final one.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Writes the game, its scores, and the players' running totals in one go.
 *
 * All of it or none of it: a game saved without its scores, or totals moved
 * without a game behind them, would be worse than losing the round entirely.
 */
async function saveGame({ roomCode, settings, scores })
{
	const played = scores.filter((score) => Number.isInteger(score.userId));
	if (played.length === 0)
		return null;

	const best = Math.max(...played.map((score) => score.points));

	return prisma.$transaction(async (tx) =>
	{
		const game = await tx.game.create({
			data: {
				roomCode,
				theme: settings.theme,
				language: settings.language,
				rounds: settings.rounds,
				roundSeconds: settings.roundSeconds,
				endedAt: new Date(),
			},
		});

		for (const score of played)
		{
			// A draw at the top means everyone tied there won.
			const won = score.points === best;

			await tx.gameScore.create({
				data: { gameId: game.id, userId: score.userId, points: score.points, won },
			});

			await tx.user.update({
				where: { id: score.userId },
				data: {
					totalPoints: { increment: score.points },
					gamesPlayed: { increment: 1 },
					wins: { increment: won ? 1 : 0 },
				},
			});
		}

		// Recalcula o rank guardado de TODOS os que já jogaram (posição por
		// pontos totais, desempate por vitórias). A coluna nascia a 0 e nunca
		// era atualizada — o perfil e o cartão mostravam "#0" para sempre.
		const ranked = await tx.user.findMany({
			where: { gamesPlayed: { gt: 0 } },
			orderBy: [{ totalPoints: 'desc' }, { wins: 'desc' }],
			select: { id: true, rank: true },
		});
		for (let i = 0; i < ranked.length; i += 1)
		{
			if (ranked[i].rank !== i + 1)
				await tx.user.update({ where: { id: ranked[i].id }, data: { rank: i + 1 } });
		}

		return game;
	});
}

/**
 * Top players over a window of days, or of all time when given nothing.
 * Reads the per-game rows rather than the running totals, which is what makes
 * "today" and "this week" possible without keeping extra counters in step.
 */
async function leaderboard({ days, limit = 10 } = {})
{
	const where = days ? { finishedAt: { gte: new Date(Date.now() - days * DAY_MS) } } : {};

	const rows = await prisma.gameScore.groupBy({
		by: ['userId'],
		where,
		_sum: { points: true },
		_count: { _all: true },
		orderBy: { _sum: { points: 'desc' } },
		take: limit,
	});

	if (rows.length === 0)
		return [];

	const users = await prisma.user.findMany({
		where: { id: { in: rows.map((row) => row.userId) } },
		select: { id: true, username: true, avatarUrl: true },
	});

	const byId = new Map(users.map((user) => [user.id, user]));

	return rows.map((row, index) => ({
		rank: index + 1,
		userId: row.userId,
		username: byId.get(row.userId)?.username ?? '',
		avatarUrl: byId.get(row.userId)?.avatarUrl ?? null,
		points: row._sum.points ?? 0,
		games: row._count._all,
	}));
}

/** The games someone played, newest first. */
async function historyOf(userId, limit = 20)
{
	const rows = await prisma.gameScore.findMany({
		where: { userId },
		orderBy: { finishedAt: 'desc' },
		take: limit,
		include: { game: { select: { theme: true, language: true, rounds: true } } },
	});

	return rows.map((row) => ({
		points: row.points,
		won: row.won,
		finishedAt: row.finishedAt,
		theme: row.game.theme,
		language: row.game.language,
		rounds: row.game.rounds,
	}));
}

module.exports = { saveGame, leaderboard, historyOf };
