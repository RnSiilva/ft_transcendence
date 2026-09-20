const { Router } = require('express');
const { register, login, updateLanguage, logout, me, updateProfile, deleteAccount, loginWith42, fortyTwoCallback } = require('./auth.controller');
const { requireAuth, optionalAuth } = require('./auth.middleware'); // if a user does not have a valid JWT cookie, the request is block with a 401 error

const router = Router();

// express-rate-limit contains the tracking of the number of attempts
const rateLimit = require('express-rate-limit');

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
// optionalAuth, not requireAuth: without a session /me answers 200 {user:null}
// (a fresh browser asking "who am I?" is not an error — keeps the console clean).
router.get('/me', optionalAuth, me);

// 42 OAuth 2.0 routes
router.get('/42', loginWith42);
router.get('/42/callback', fortyTwoCallback);

module.exports = router;
