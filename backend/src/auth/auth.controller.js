const jwt = require('jsonwebtoken');
const { registerUser, loginUser, updateUserLanguage, getUserById, updateUserProfile, deleteUser, findOrCreate42User, checkAchievements } = require('./auth.service');

const COOKIE_NAME = 'token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV !== 'development', // False in dev so HTTP works too
  sameSite: 'strict', // CSRF attack prevention
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (in ms) expiration
};

function issueToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /auth/register
/* Validates email format, username (3–20 chars alphanumeric), password strength (8+ chars, letters + numbers),
   and password confirmation. Calls registerUser, issues JWT in httpOnly cookie, and returns 201 Created
*/
async function register(req, res) {
  const { email, username, password, confirmPassword, avatarUrl, language } = req.body;

  const errors = {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Valid email is required';
  }
  if (!username || username.length < 3 || username.length > 20) {
    errors.username = 'Username must be 3–20 characters';
  } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    errors.username = 'Username may only contain letters, numbers, underscores, and hyphens';
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
    const user = await registerUser({ email, username, password, avatarUrl, language });
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
// Validates inputs, calls loginUser, issues JWT in httpOnly cookie, returns 200 OK
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

// PUT /auth/language (protected by requireAuth middleware)
// Updates user's language preference (pt, en, es) in database
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
// Clears the token cookie (maxAge: 0) and returns 200 Logged out
function logout(req, res) {
  res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTIONS, maxAge: 0 });
  return res.status(200).json({ message: 'Logged out' });
}

// GET /auth/me (optionalAuth middleware: req.user is the session user or null)
// Returns the current user's profile and game statistics (used on page refresh),
// or 200 {user:null} when there is no session — logged-out is a state, not an error.
async function me(req, res) {
  try {
    if (!req.user) return res.status(200).json({ user: null });
    await checkAchievements(req.user.id);
    const user = await getUserById(req.user.id);
    // A valid cookie for an account that no longer exists (e.g. deleted).
    if (!user) return res.status(200).json({ user: null });
    return res.status(200).json({ user });
  } catch (err) {
    console.error('[me]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// PUT /auth/profile (protected by requireAuth middleware)
// Updates nickname, avatar photo, or password. Re-issues token if username changed
async function updateProfile(req, res) {
  const { username, avatarUrl, currentPassword, newPassword } = req.body;

  // Reject avatar if the base64 string exceeds ~2 MB
  const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
  if (avatarUrl && Buffer.byteLength(avatarUrl, 'utf8') > MAX_AVATAR_BYTES) {
    return res.status(400).json({ error: 'Avatar image is too large. Maximum size: 2 MB.' });
  }

  try {
    const user = await updateUserProfile(req.user.id, { username, avatarUrl, currentPassword, newPassword });
    // Re-issue token with updated username
    const token = issueToken(user);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    return res.status(200).json({ user });
  } catch (err) {
    if (err.status === 409 || err.status === 400) {
      return res.status(err.status).json({ errors: { [err.field]: err.message }, error: err.message });
    }
    console.error('[updateProfile]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// DELETE /auth/account (protected by requireAuth middleware)
// Deletes account from database and clears the auth cookie (GDPR)
async function deleteAccount(req, res) {
  try {
    await deleteUser(req.user.id);
    res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTIONS, maxAge: 0 });
    return res.status(200).json({ message: 'Account deleted' });
  } catch (err) {
    console.error('[deleteAccount]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /auth/42
function loginWith42(req, res) {
  const UID = process.env.FORTYTWO_CLIENT_ID;
  const REDIRECT_URI = encodeURIComponent(process.env.FORTYTWO_CALLBACK_URL);
  // prompt=login forces the 42 login screen every time, instead of silently
  // reusing an intra session already open in the browser. On shared machines
  // that silent reuse could log a person into whoever was last authorized on 42.
  const authUrl = `https://api.intra.42.fr/oauth/authorize?client_id=${UID}&redirect_uri=${REDIRECT_URI}&response_type=code&prompt=login`;
  res.redirect(authUrl);
}

// GET /auth/42/callback
async function fortyTwoCallback(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.redirect('/login?error=MissingCode');
  }

  try {
    // 1. Exchange code for access_token
    const tokenRes = await fetch('https://api.intra.42.fr/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.FORTYTWO_CLIENT_ID,
        client_secret: process.env.FORTYTWO_CLIENT_SECRET,
        code,
        redirect_uri: process.env.FORTYTWO_CALLBACK_URL,
      }),
    });

    if (!tokenRes.ok) throw new Error('Failed to get 42 access token');
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch user profile
    const profileRes = await fetch('https://api.intra.42.fr/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileRes.ok) throw new Error('Failed to get 42 user profile');
    const profileData = await profileRes.json();

    // 3. Find or Create User
    const user = await findOrCreate42User(profileData);

    // 4. Issue token and redirect
    const token = issueToken(user);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    res.redirect('/profile');
  } catch (err) {
    console.error('[fortyTwoCallback]', err);
    // A password-protected account already uses this 42 email: refuse instead of
    // taking it over (see findOrCreate42User).
    if (err.code === 'EMAIL_IN_USE') return res.redirect('/login?error=EmailInUse');
    res.redirect('/login?error=OAuthFailed');
  }
}

module.exports = { register, login, updateLanguage, logout, me, updateProfile, deleteAccount, loginWith42, fortyTwoCallback };
