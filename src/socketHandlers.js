// src/socketHandlers.js
// Real-time event handlers for Socket.IO

export const socketHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log(`✅ User connected: ${socket.id}`);

    // ─── User joins course room ─────────────────────────────────────────
    socket.on("joinCourse", ({ courseId, userId }) => {
      if (!courseId || !userId) {
        console.warn("joinCourse: Missing courseId or userId");
        return;
      }

      const roomName = `course-${courseId}`;
      socket.join(roomName);
      
      console.log(`📌 User ${userId} joined room: ${roomName}`);
      
      // Notify others that user joined (optional)
      socket.to(roomName).emit("user:joined", {
        userId,
        timestamp: new Date()
      });
    });

    // ─── User leaves course room ────────────────────────────────────────
    socket.on("leaveCourse", ({ courseId, userId }) => {
      if (!courseId) return;

      const roomName = `course-${courseId}`;
      socket.leave(roomName);
      
      console.log(`📌 User ${userId} left room: ${roomName}`);
      
      // Notify others that user left (optional)
      socket.to(roomName).emit("user:left", {
        userId,
        timestamp: new Date()
      });
    });

    // ─── Join multiple courses at once ──────────────────────────────────
    socket.on("joinCourses", ({ courseIds, userId }) => {
      if (!courseIds || !Array.isArray(courseIds)) return;

      courseIds.forEach(courseId => {
        const roomName = `course-${courseId}`;
        socket.join(roomName);
      });

      console.log(`📌 User ${userId} joined ${courseIds.length} courses`);
    });

    // ─── Heartbeat / Keep-alive ────────────────────────────────────────
    socket.on("ping", () => {
      socket.emit("pong", { timestamp: new Date() });
    });

    // ─── Disconnect handler ────────────────────────────────────────────
    socket.on("disconnect", () => {
      console.log(`❌ User disconnected: ${socket.id}`);
    });

    // ─── Error handling ───────────────────────────────────────────────
    socket.on("error", (error) => {
      console.error(`⚠️ Socket error (${socket.id}):`, error);
    });
  });
};
