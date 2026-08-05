/**
 * auth.controller.js
 * Route handlers: register, login, logout, me.
 */

const jwt = require('jsonwebtoken');
const { registerUser, loginUser, updateUserLanguage, getUserById } = require('./auth.service');

const COOKIE_NAME = 'token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV !== 'development', // false in dev so HTTP works too
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

function issueToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /auth/register
async function register(req, res) {
  const { email, username, password, confirmPassword } = req.body;

  // --- Backend validation ---
  const errors = {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Valid email is required';
  }
  if (!username || username.length < 3 || username.length > 20) {
    errors.username = 'Username must be 3–20 characters';
  } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.username = 'Username may only contain letters, numbers, and underscores';
  }
  if (!password || password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    errors.password = 'Password must be at least 8 characters and contain a letter and a number';
  }
  if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const user = await registerUser({ email, username, password });
    const token = issueToken(user);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    return res.status(201).json({ user });
  } catch (err) {
    if (err.status === 409) {
      return res.status(409).json({ errors: { [err.field]: err.message } });
    }
    console.error('[register]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /auth/login
async function login(req, res) {
  const { login, email, password } = req.body;
  const identifier = login || email;

  if (!identifier || !password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  try {
    const user = await loginUser({ identifier, password });
    const token = issueToken(user);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    return res.status(200).json({ user });
  } catch (err) {
    if (err.status === 401) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    console.error('[login]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// PUT /auth/language  (protected by requireAuth middleware)
async function updateLanguage(req, res) {
  const { language } = req.body;

  try {
    const user = await updateUserLanguage(req.user.id, language);
    return res.status(200).json({ user });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.error('[updateLanguage]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /auth/logout
function logout(req, res) {
  res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTIONS, maxAge: 0 });
  return res.status(200).json({ message: 'Logged out' });
}

// GET /auth/me  (protected by requireAuth middleware)
async function me(req, res) {
  try {
    const user = await getUserById(req.user.id);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    return res.status(200).json({ user });
  } catch (err) {
    console.error('[me]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { register, login, updateLanguage, logout, me };
