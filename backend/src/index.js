const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRouter = require('./auth/auth.routes');
const friendsRouter = require('./friends/friends.routes');
const presence = require('./friends/presence');
const jwt = require('jsonwebtoken');
const gameRouter = require('./routes/game.routes');
const usersRouter = require('./routes/users.routes');

const { registerRoomHandlers, startAbsenceSweeper } = require('./sockets/room.socket');
const { registerDrawHandlers } = require('./sockets/draw.socket');
const { registerRoundHandlers, startGameLoop } = require('./sockets/round.socket');
// Lobby (waiting room) — see sockets/lobby.socket.js
const { registerLobbyHandlers, startLobbySweeper } = require('./sockets/lobby.socket');
const { registerReportHandlers, startReportSweeper } = require('./sockets/report.socket');
const { requireAuthenticatedSocket } = require('./sockets/auth.socket');
const { seedWords } = require('./game/words.repository');

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
app.use('/games', gameRouter);
app.use('/users', usersRouter); // public profile (visible fields only)

// updates socket.io so rooms and drawing can also send and read cookies
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
  // Detects dead connections in ~15 s (the default was ~45 s): a phone
  // that falls asleep without saying goodbye used to leave a "ghost" in the
  // room for almost a minute before the reconnection grace period kicked in.
  pingInterval: 10000,
  pingTimeout: 5000,
});

// Routes can reach the socket server via req.app.get('io') — the friends API
// uses it to tell the OTHER user their list changed (request sent/accepted).
app.set('io', io);

const PORT = process.env.BACKEND_PORT || 4000;

// Rooms are for registered users: no valid session cookie, no connection.
io.use(requireAuthenticatedSocket);

startAbsenceSweeper(io);
startGameLoop(io);
startLobbySweeper(io); // 5-minute clock for waiting rooms
startReportSweeper(io); // closes the votes nobody finished

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id, 'as', socket.user.username);

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
  registerRoundHandlers(io, socket);
  // ORDER DEPENDENCY: registerLobbyHandlers must come AFTER
  // registerRoomHandlers. The lobby listens to the same events ('room:create',
  // 'room:join') in its own listeners and Socket.IO calls them in registration
  // order — only this way, when the lobby listener runs, the room has already
  // been created/joined by the room handler and getRoomOf(socket.id) finds it.
  registerLobbyHandlers(io, socket);
  registerReportHandlers(io, socket);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    const offlineUserId = presence.markUserOffline(socket.id);
    if (offlineUserId && !presence.isUserOnline(offlineUserId)) {
      io.emit('presence:update', { userId: Number(offlineUserId), isOnline: false });
    }
  });
});

server.listen(PORT, async () => {
  console.log(`Backend running on port ${PORT}`);

  // Fills the Word table the first time only; words added later are kept.
  const seeded = await seedWords().catch((err) => {
    console.error('[words] seeding failed:', err.message);
    return 0;
  });
  if (seeded > 0) console.log(`[words] loaded ${seeded} starting words`);
});