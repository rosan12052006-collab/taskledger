const { Server } = require("socket.io");
const { verifyAccessToken } = require("../middleware/tokens");

/**
 * Each connected client is placed into a "room" named after their userId.
 * Controllers broadcast with io.to(userId).emit(...), so a user's other
 * open tabs/devices get the update, but nobody else does.
 */
function initSocket(httpServer, clientOrigin) {
  const io = new Server(httpServer, {
    cors: { origin: clientOrigin, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.cookie
          ?.split("; ")
          .find((c) => c.startsWith("accessToken="))
          ?.split("=")[1];

      if (!token) return next(new Error("No auth token provided."));

      const payload = verifyAccessToken(token);
      socket.userId = payload.sub;
      next();
    } catch (err) {
      next(new Error("Invalid or expired token."));
    }
  });

  io.on("connection", (socket) => {
    socket.join(socket.userId);
    console.log(`[socket] user ${socket.userId} connected (${socket.id})`);

    socket.on("disconnect", () => {
      console.log(`[socket] user ${socket.userId} disconnected (${socket.id})`);
    });
  });

  return io;
}

module.exports = initSocket;
