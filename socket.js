const socketIo = (io) => {
  
  const connectedUsers = new Map();
  //Handle new socket connections
  io.on("connection", (socket) => {
    //Get user from authentication
    const user = socket.handshake.auth.user;
    console.log("User connected", user?.username);
  
    socket.on("join room", (groupId) => {
      //Add socket to the specified room
      socket.join(groupId);
    
      connectedUsers.set(socket.id, { user, room: groupId });
     
      const usersInRoom = Array.from(connectedUsers.values())
        .filter((u) => u.room === groupId)
        .map((u) => u.user);
     
      io.in(groupId).emit("users in room", usersInRoom);
     
      socket.to(groupId).emit("notification", {
        type: "USER_JOINED",
        message: `${user?.username} has joined`,
        user: user,
      });
    });
   
    //!START: Leave room Handler
   
    socket.on("leave room", (groupId) => {
      console.log(`${user?.username} leaving room:`, groupId);
      //Remove socket from the room
      socket.leave(groupId);
      if (connectedUsers.has(socket.id)) {
        //Remove user from connected users and notify others
        connectedUsers.delete(socket.id);
        socket.to(groupId).emit("user left", user?._id);
      }
    });
    //!END:Leave room Handler

    //!START: New Message Handler
   
    socket.on("new message", (message) => {
      // Broadcast message to all other users in the room
      socket.to(message.groupId).emit("message received", message);
    });
    //!END:New Message Handler

    //!START: Disconnect Handler
    
    socket.on("disconnect", () => {
      console.log(`${user?.username} disconnected`);
      if (connectedUsers.has(socket.id)) {
        
        const userData = connectedUsers.get(socket.id);
       
        socket.to(userData.room).emit("user left", user?._id);
       
        connectedUsers.delete(socket.id);
      }
    });
    //!END:Disconnect Handler

    //!START: Typing Indicator
    
    socket.on("typing", ({ groupId, username }) => {
      //Broadcast typing status to other users in the room
      socket.to(groupId).emit("user typing", { username });
    });

    socket.on("stop typing", ({ groupId }) => {
     
      socket.to(groupId).emit("user stop typing", { username: user?.username });
    });
    //!END:Typing Indicator
  });
};

module.exports = socketIo;
