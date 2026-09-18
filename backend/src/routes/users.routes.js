/**
 * users.routes.js
 * PUBLIC profile of any user: GET /api/users/:username
 *
 * Returns ONLY visible fields — username, avatar, rank, points,
 * games, wins and achievements. Never email, password, language or internal
 * session ids. Requires a session (we do not expose data to anonymous users).
 *
 * Feeds: the "Add friends" search, the public profile of non-friends and the
 * in-game hover card with real stats.
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../auth/auth.middleware');

const prisma = new PrismaClient();
const router = express.Router();

router.get('/:username', requireAuth, async (req, res) => {
	try {
		const user = await prisma.user.findUnique({
			where: { username: req.params.username },
			select: {
				username: true,
				avatarUrl: true,
				rank: true,
				totalPoints: true,
				gamesPlayed: true,
				wins: true,
				achievements: {
					select: { achievement: { select: { nameKey: true } } },
				},
			},
		});

		if (!user)
			return res.status(404).json({ error: 'User not found' });

		return res.json({ user });
	} catch (err) {
		console.error('[users]', err.message);
		return res.status(500).json({ error: 'Internal error' });
	}
});

module.exports = router;
