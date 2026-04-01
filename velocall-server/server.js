const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);

// Updated CORS for deployment flexibility
const io = require("socket.io")(server, {
  cors: {
    origin: "*", // For Render/Netlify, you can refine this to your Netlify URL later
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("VeloCall Server is running perfectly.");
});

// Health check for Render's monitoring
app.get("/health", (req, res) => {
  res.status(200).send("Server is healthy.");
});

const activeMeetings = new Set();

io.on("connection", (socket) => {
  console.log(`[Connected]: ${socket.id}`);
  socket.emit("me", socket.id);

  // --- GOOGLE MEET STYLE ROOM LOGIC ---
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    activeMeetings.add(roomId);
    console.log(`[User Joined Room]: ${socket.id} -> Room: ${roomId}`);
    
    // Notify others in the room
    socket.to(roomId).emit("user-joined", socket.id);
  });

  // --- NEW FEATURE: ROOM-WIDE CHAT ---
  socket.on("sendMessage", ({ roomId, text, from, name, time }) => {
    console.log(`[Room Message]: ${name} in ${roomId}: ${text}`);
    // Using io.in(roomId) ensures the message reaches EVERYONE in that room
    io.in(roomId).emit("messageReceived", { 
      text, 
      from, 
      name, 
      time 
    });
  });

  // --- NEW FEATURE: ROOM-WIDE CODE SYNC ---
  socket.on("codeUpdate", ({ roomId, code }) => {
    // Sends code changes to everyone in the room except the person typing
    socket.to(roomId).emit("codeUpdate", code);
  });

  // WebRTC Signaling (The Video Connection)
  socket.on("callUser", ({ userToCall, signalData, from, name }) => {
    io.to(userToCall).emit("callUser", { signal: signalData, from, name });
  });

  socket.on("answerCall", (data) => {
    io.to(data.to).emit("callAccepted", data.signal);
  });

  // Screen Share Signaling
  socket.on("shareScreen", ({ to, signal }) => {
    io.to(to).emit("screenShareStarted", signal);
  });

  // Cleanup & Termination
  socket.on("disconnect", () => {
    activeMeetings.delete(socket.id);
    socket.broadcast.emit("callEnded");
    console.log(`[Disconnected]: ${socket.id}`);
  });

  socket.on("leaveCall", ({ to }) => {
    io.to(to).emit("callEnded");
  });
});

// Binding to 0.0.0.0 is a best practice for Render/Cloud hosting
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 VeloCall Server LIVE on Port: ${PORT}`);
});