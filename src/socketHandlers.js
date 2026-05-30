export const socketHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log(`connected: ${socket.id}`)

    // when students join assigned courses
    socket.on("join-courses", (courseIds) => {
      if (!Array.isArray(courseIds)) return;
      courseIds.forEach((id) => {
        socket.join(`course-${id}`);
      });
      console.log(`socket ${socket.id} joined ${courseIds.length} courses/rooms`);
    });

    // join personal room for direct notifications (new)
    socket.on("join-personal", (userId) => {
      if (!userId) return;
      socket.join(`user-${userId}`);
      console.log(`socket ${socket.id} joined personal room: user-${userId}`);
    });

    socket.on("disconnect", ()=>{
      console.log(`disconnected ${socket.id}`)
    })
  })
}