const { Server } = require('socket.io');

let io = null;

/**
 * Initialize Socket.IO server
 */
const initSocket = (httpServer) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
  ];

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('CORS not allowed'));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.doctorId = decoded.id;
      socket.doctorToken = decoded;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Doctor connected: ${socket.doctorId}`);

    // Join personal room for targeted updates
    const doctorRoom = `doctor:${socket.doctorId}`;
    socket.join(doctorRoom);

    // Join a global room for broadcast messages
    socket.join('global');

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Doctor disconnected: ${socket.doctorId}`);
    });

    // Handle subscription to specific patient updates
    socket.on('subscribe:patient', (patientId) => {
      const patientRoom = `patient:${patientId}`;
      socket.join(patientRoom);
    });

    // Handle unsubscription
    socket.on('unsubscribe:patient', (patientId) => {
      const patientRoom = `patient:${patientId}`;
      socket.leave(patientRoom);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  return io;
};

/**
 * Get the Socket.IO instance
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

module.exports = { initSocket, getIO };

