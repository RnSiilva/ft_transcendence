const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const { registerRoomHandlers } = require('./sockets/room.socket');
const { registerDrawHandlers } = require('./sockets/draw.socket');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.BACKEND_PORT || 4000;

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  registerRoomHandlers(io, socket);
  registerDrawHandlers(io, socket);

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`);
});