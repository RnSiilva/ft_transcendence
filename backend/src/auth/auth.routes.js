/**
 * auth.routes.js
 * Mounts auth endpoints and applies rate-limiting to login.
 */

const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { register, login, updateLanguage, logout, me, updateProfile, deleteAccount } = require('./auth.controller');
const { requireAuth } = require('./auth.middleware');

const router = Router();

// Rate-limit: max 5 login attempts per minute per IP
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again in a minute' },
  keyGenerator: (req) => req.ip,
});

router.post('/register', register);
router.post('/login', loginLimiter, login);
router.put('/language', requireAuth, updateLanguage);
router.put('/profile', requireAuth, updateProfile);
router.delete('/account', requireAuth, deleteAccount);
router.post('/logout', logout);
router.get('/me', requireAuth, me);

module.exports = router;
