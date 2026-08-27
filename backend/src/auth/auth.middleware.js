const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const token = req.cookies?.token; // read the httpOnly token cookie parsed by cookieParser

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET); // verify the JWT signature using JWT_SECRET
    req.user = { id: payload.sub, email: payload.email, username: payload.username }; // attach authenticated user details to the request object
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = { requireAuth };
