import { Server } from 'socket.io';

/**
 * Initialize Socket.io server
 * @param {import('http').Server} httpServer - HTTP server instance
 * @param {string[]} allowedOrigins - CORS allowed origins
 * @returns {Server} Socket.io server instance
 */
export function initializeSocket(httpServer, allowedOrigins) {
  const io = new Server(httpServer, {
    cors: {
      origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join the public scoreboard room
    socket.on('join:scoreboard', () => {
      socket.join('scoreboard');
    });

    // Join a specific match room
    socket.on('join:match', (matchId) => {
      socket.join(`match:${matchId}`);
    });

    // Join tournament room for tournament-specific updates
    socket.on('join:tournament', (tournamentId) => {
      socket.join(`tournament:${tournamentId}`);
    });

    // Leave match room
    socket.on('leave:match', (matchId) => {
      socket.leave(`match:${matchId}`);
    });

    // Leave tournament room
    socket.on('leave:tournament', (tournamentId) => {
      socket.leave(`tournament:${tournamentId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}
