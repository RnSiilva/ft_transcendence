const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRouter = require('./auth/auth.routes');

const app = express();
const server = http.createServer(app);

// --- CORS: allow localhost/127.0.0.1 with credentials ---
const defaultOrigin = process.env.CORS_ORIGIN || 'https://localhost';

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl/Postman) or any localhost/127.0.0.1
    if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(null, defaultOrigin);
  },
  credentials: true,
}));

// --- Body / cookie parsing ---
app.use(express.json());
app.use(cookieParser());

// --- Trust proxy (nginx sits in front) ---
app.set('trust proxy', 1);

// --- Routes ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Authentication endpoints (/auth/register, /auth/login, /auth/logout, /auth/me)
app.use('/auth', authRouter);

// --- Socket.IO ---
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});

const PORT = process.env.BACKEND_PORT || 4000;

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`);
});