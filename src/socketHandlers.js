export const socketHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log(`connected: ${socket.id}`)

    //when students join assigned courses
    socket.on("join-courses", (courseIds)=>{

      if(!Array.isArray(courseIds)) return;

      courseIds.forEach((id)=>{
        socket.join(`course-${id}`)
      })

      console.log(`joined ${courseIds.length} courses/room`)
    })

    socket.on("disconnect", ()=>{
      console.log(`disconnected ${socket.id}`)
    })
  })
}