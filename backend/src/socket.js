const { Server } = require('socket.io');
const { verifyAccess } = require('./utils/jwt');

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL || 'http://localhost:5174', methods: ['GET', 'POST'] },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return next(new Error('Unauthorized'));
    try {
      socket.user = verifyAccess(token);
      return next();
    } catch (error) {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.on('join:clinic', (clinicId) => {
      if (!socket.user || socket.user.clinicId !== clinicId) return;
      socket.join(socket.user.clinicId);
      console.log(`[Socket] ${socket.id} joined clinic room: ${socket.user.clinicId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

function getIO() { return io; }

module.exports = { initSocket, getIO };
