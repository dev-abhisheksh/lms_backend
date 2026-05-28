import app from "./src/app.js";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import connectDB from "./src/utils/db.js";
import { socketHandlers } from "./src/socketHandlers.js";

dotenv.config();
connectDB();

const PORT = process.env.PORT || 4000;

// ─── Create HTTP Server & Socket.IO ─────────────────────────────────────
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://lms-frontend-nine-plum.vercel.app"
    ],
    credentials: true,
    methods: ["GET", "POST"]
  },
  transports: ["websocket", "polling"],
  pingInterval: 25000,
  pingTimeout: 20000
});

// Store io instance globally for access in controllers
global.io = io;

// Initialize socket handlers
socketHandlers(io);

// ─── Start Server ───────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n${"═".repeat(50)}`);
  console.log(`  🚀 Server running on port ${PORT}`);
  console.log(`  🌐 WebSocket server ready`);
  console.log(`${"═".repeat(50)}\n`);
});