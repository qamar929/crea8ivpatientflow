const { Server } = require('socket.io');

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL || 'http://localhost:5174', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.on('join:clinic', (clinicId) => {
      socket.join(clinicId);
      console.log(`[Socket] ${socket.id} joined clinic room: ${clinicId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

function getIO() { return io; }

module.exports = { initSocket, getIO };
