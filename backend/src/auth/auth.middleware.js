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

module.exports = { requireAuth, verifyToken };
