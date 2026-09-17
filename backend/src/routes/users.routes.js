/**
 * users.routes.js  (módulo do frontend/Thiago)
 * Perfil PÚBLICO de qualquer utilizador: GET /api/users/:username
 *
 * Devolve APENAS campos visíveis — username, avatar, rank, pontos,
 * partidas, vitórias e conquistas. Nunca email, password, idioma ou ids
 * internos de sessão. Requer sessão (não expomos dados a anónimos).
 *
 * Alimenta: a pesquisa do "Adicionar amigos", o perfil público de
 * não-amigos e o cartão de hover no jogo com stats reais.
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
