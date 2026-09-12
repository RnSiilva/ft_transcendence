/**
 * game.routes.js
 * Leaderboards and match history, read from the games already finished.
 */

const { Router } = require('express');

const { requireAuth } = require('../auth/auth.middleware');
const { leaderboard, historyOf } = require('../game/games.repository');

const router = Router();

// Windows the leaderboard understands, in days. Anything else is all time.
const WINDOWS = { daily: 1, weekly: 7 };

router.get('/leaderboard', async (req, res) => {
  const days = WINDOWS[req.query.period];
  const limit = Math.min(Number(req.query.limit) || 10, 50);

  try {
    return res.json({ period: req.query.period || 'all', entries: await leaderboard({ days, limit }) });
  } catch (err) {
    console.error('[leaderboard]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/history', requireAuth, async (req, res) => {
  try {
    return res.json({ games: await historyOf(req.user.id) });
  } catch (err) {
    console.error('[history]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
