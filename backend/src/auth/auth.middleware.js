const jwt = require('jsonwebtoken');

/* Verifies a raw JWT and returns the user it represents, or null.
   Kept separate from requireAuth so the Socket.IO handshake can reuse it —
   a socket has no req/res, but it does carry the same cookie.
*/
function verifyToken(token) {
  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET); // verify the JWT signature using JWT_SECRET
    return { id: payload.sub, email: payload.email, username: payload.username };
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const user = verifyToken(req.cookies?.token); // read the httpOnly token cookie parsed by cookieParser

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.user = user; // attach authenticated user details to the request object
  next();
}

/* Like requireAuth, but never blocks: req.user is the session user or null.
   Only /auth/me uses it — asking "who am I?" without a session is a normal
   question (every page load on a fresh browser), not an error, so answering
   401 just paints a red line in the console of every logged-out visitor. */
function optionalAuth(req, _res, next) {
  req.user = verifyToken(req.cookies?.token);
  next();
}

module.exports = { requireAuth, optionalAuth, verifyToken };
