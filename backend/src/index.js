const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRouter = require('./auth/auth.routes');

const { registerRoomHandlers, startAbsenceSweeper } = require('./sockets/room.socket');
const { registerDrawHandlers } = require('./sockets/draw.socket');
const { registerRoundHandlers, startGameLoop } = require('./sockets/round.socket');
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

// updates socket.io so rooms and drawing can also send and read cookies
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});

const PORT = process.env.BACKEND_PORT || 4000;

// Rooms are for registered users: no valid session cookie, no connection.
io.use(requireAuthenticatedSocket);

startAbsenceSweeper(io);
startGameLoop(io);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id, 'as', socket.user.username);

  registerRoomHandlers(io, socket);
  registerDrawHandlers(io, socket);
  registerRoundHandlers(io, socket);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
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