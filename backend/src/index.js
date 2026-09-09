const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRouter = require('./auth/auth.routes');
const friendsRouter = require('./friends/friends.routes');
const presence = require('./friends/presence');
const jwt = require('jsonwebtoken');

const { registerRoomHandlers } = require('./sockets/room.socket');
const { registerDrawHandlers } = require('./sockets/draw.socket');

const app = express();
const server = http.createServer(app);

// CORS: allow localhost/127.0.0.1 with credentials
const defaultOrigin = process.env.CORS_ORIGIN || 'https://localhost';

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (curl/postman) or any localhost/127.0.0.1
    if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(null, defaultOrigin);
  },
  credentials: true,
}));

app.use(express.json({ limit: '5mb' })); // allows upload of avatars larger than the default 100kb json limit
app.use(cookieParser()); // reads cookis and parses them to express

app.set('trust proxy', 1); // tells express to trust nginx proxy headers (for real client ip and secure cookies)

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/friends', friendsRouter);

// updates socket.io so rooms and drawing can also send and read cookies
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});

const PORT = process.env.BACKEND_PORT || 4000;

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Authenticate socket connection via session cookie if present
  const cookieHeader = socket.handshake?.headers?.cookie || '';
  const tokenMatch = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
  if (tokenMatch && tokenMatch[1]) {
    try {
      const decoded = jwt.verify(tokenMatch[1], process.env.JWT_SECRET);
      socket.userId = decoded.sub;
      presence.markUserOnline(decoded.sub, socket.id);
      io.emit('presence:update', { userId: decoded.sub, isOnline: true });
    } catch {
      // Unauthenticated socket connection (guest/spectator)
    }
  }

  socket.on('presence:join', ({ userId }) => {
    if (userId) {
      socket.userId = userId;
      presence.markUserOnline(userId, socket.id);
      io.emit('presence:update', { userId: Number(userId), isOnline: true });
    }
  });

  registerRoomHandlers(io, socket);
  registerDrawHandlers(io, socket);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    const offlineUserId = presence.markUserOffline(socket.id);
    if (offlineUserId && !presence.isUserOnline(offlineUserId)) {
      io.emit('presence:update', { userId: Number(offlineUserId), isOnline: false });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});