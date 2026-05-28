# Socket.IO Real-Time Implementation Guide

## Overview
This guide explains how to implement **Socket.IO** in an existing Express + React LMS project to enable real-time data delivery without page refresh.

---

## Table of Contents
1. [Installation](#installation)
2. [Backend Setup](#backend-setup)
3. [Frontend Setup](#frontend-setup)
4. [Event Types](#event-types)
5. [Real-World Example: Assignments](#real-world-example-assignments)
6. [Testing](#testing)
7. [Production Deployment](#production-deployment)

---

## Installation

### Backend
```bash
npm install socket.io
npm install socket.io-redis  # For multi-instance deployments (optional)
```

### Frontend
```bash
npm install socket.io-client
```

---

## Backend Setup

### 1. Initialize Socket.IO in `server.js`

```javascript
import app from "./src/app.js";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import connectDB from "./src/utils/db.js";
import { socketHandlers } from "./src/socketHandlers.js";  // NEW

dotenv.config();
connectDB();

const PORT = process.env.PORT || 4000;

// Create HTTP server and Socket.IO instance
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://lms-frontend-nine-plum.vercel.app"
    ],
    credentials: true,
    methods: ["GET", "POST"]
  }
});

// Store io instance globally for access in controllers
global.io = io;

// Connection event handlers
socketHandlers(io);

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});
```

### 2. Create `src/socketHandlers.js`

```javascript
// src/socketHandlers.js
export const socketHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // User joins course rooms
    socket.on("joinCourse", ({ courseId, userId }) => {
      const roomName = `course-${courseId}`;
      socket.join(roomName);
      console.log(`User ${userId} joined room ${roomName}`);
    });

    // User leaves course rooms
    socket.on("leaveCourse", ({ courseId }) => {
      const roomName = `course-${courseId}`;
      socket.leave(roomName);
      console.log(`User left room ${roomName}`);
    });

    // Disconnect handler
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};
```

### 3. Modify Assignment Controller to Emit Events

```javascript
// In src/controllers/assignment.controller.js - after creating assignment

const createAssignment = async (req, res) => {
  try {
    // ... existing validation code ...

    const newAssignment = new Assignment({
      title: cleanTitle,
      description: cleanDescription,
      createdBy: req.user._id,
      dueDate: due,
      maxMarks,
      course: courseId,
      isPublished: true,
      publishedAt: new Date()
    });

    await newAssignment.save();

    // ✅ NEW: Emit real-time event to all students in the course
    if (global.io) {
      global.io.to(`course-${courseId}`).emit("assignment:created", {
        _id: newAssignment._id,
        title: newAssignment.title,
        description: newAssignment.description,
        dueDate: newAssignment.dueDate,
        maxMarks: newAssignment.maxMarks,
        course: newAssignment.course,
        createdBy: newAssignment.createdBy,
        createdAt: newAssignment.createdAt
      });
    }

    return res.status(201).json({
      message: "Assignment created successfully",
      assignment: newAssignment
    });
  } catch (error) {
    console.error("Error creating assignment:", error);
    return res.status(500).json({ message: "Error creating assignment" });
  }
};
```

---

## Frontend Setup

### 1. Create `src/API/socket.api.js`

```javascript
// src/API/socket.api.js
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";

class SocketManager {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(token) {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      auth: {
        token
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    this.socket.on("connect", () => {
      console.log("Connected to server");
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from server");
    });

    this.socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
    });
  }

  // Join a course room
  joinCourse(courseId, userId) {
    if (!this.socket) return;
    this.socket.emit("joinCourse", { courseId, userId });
  }

  // Leave a course room
  leaveCourse(courseId) {
    if (!this.socket) return;
    this.socket.emit("leaveCourse", { courseId });
  }

  // Listen to events
  on(event, callback) {
    if (!this.socket) return;
    
    // Store listener for cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    
    this.socket.on(event, callback);
  }

  // Remove listener
  off(event, callback) {
    if (!this.socket) return;
    this.socket.off(event, callback);
  }

  // Cleanup all listeners for an event
  removeAllListeners(event) {
    if (!this.socket) return;
    this.socket.removeAllListeners(event);
    this.listeners.delete(event);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }
}

export const socketManager = new SocketManager();
```

### 2. Update `src/pages/Assignments.jsx`

```javascript
// In your Assignments component
import { socketManager } from "../API/socket.api";

useEffect(() => {
  // Connect to socket when component mounts
  const token = localStorage.getItem("accessToken");
  socketManager.connect(token);

  // Join all enrolled courses
  const userId = localStorage.getItem("user");
  myCoursez.forEach(course => {
    socketManager.joinCourse(course.course._id, userId);
  });

  return () => {
    // Cleanup
    myCoursez.forEach(course => {
      socketManager.leaveCourse(course.course._id);
    });
  };
}, [myCoursez]);

// Listen for new assignments
useEffect(() => {
  const handleNewAssignment = (newAssignment) => {
    console.log("New assignment received:", newAssignment);
    
    // Add to state without page refresh
    setAssignments(prev => [newAssignment, ...prev]);
    
    // Optional: Show notification
    showNotification("New assignment posted!", "success");
  };

  socketManager.on("assignment:created", handleNewAssignment);

  return () => {
    socketManager.off("assignment:created", handleNewAssignment);
  };
}, []);
```

---

## Event Types

### Assignment Events
```javascript
// Teacher creates assignment
emit: "assignment:created"
data: { _id, title, description, dueDate, maxMarks, course, createdAt }

// Teacher updates assignment
emit: "assignment:updated"
data: { _id, title, description, dueDate, maxMarks, updatedAt }

// Teacher deletes assignment
emit: "assignment:deleted"
data: { _id, courseId }
```

### Notification Events (Optional)
```javascript
// General notification to students
emit: "notification:sent"
data: { type, message, icon, timestamp }

// Grade posted for student
emit: "submission:graded"
data: { assignmentId, submissionId, grade, feedback }
```

---

## Real-World Example: Assignments

### Scenario
A teacher creates an assignment in "Python 101" course. All students currently viewing the Assignments page should see it immediately without refreshing.

### Flow
1. **Teacher** submits assignment form → `/api/v1/assignments/create/{courseId}`
2. **Backend** saves assignment → emits `assignment:created` to `course-{courseId}` room
3. **Students** listening to `assignment:created` event → receive new assignment in real-time
4. **UI** updates automatically with new assignment

### Code Example
```javascript
// Teacher creates assignment (backend)
POST /api/v1/assignments/create/507f1f77bcf86cd799439011

// Assignment created successfully
io.to("course-507f1f77bcf86cd799439011").emit("assignment:created", {
  _id: "507f1f77bcf86cd799439012",
  title: "Python Basics",
  dueDate: "2024-02-15",
  maxMarks: 100,
  // ...
});

// Student receives update (frontend)
socketManager.on("assignment:created", (assignment) => {
  // Add to UI
  setAssignments(prev => [assignment, ...prev]);
});
```

---

## Testing

### 1. Test Socket Connection
```javascript
// In browser console
socketManager.connect(token);
// Check browser DevTools → Network → WS tab
```

### 2. Test Event Emission
```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2: Start frontend
npm run dev

# Open two browser tabs with the same course
# Create an assignment in one tab
# Should see it instantly in both tabs without refresh
```

### 3. Test with Multiple Users
- Open same course in 2+ browser tabs/windows
- Create assignment in one
- All other tabs should update instantly

---

## Production Deployment

### Important Changes

1. **Use Redis Adapter for Multi-Instance Deployments**
```javascript
// server.js
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

const pubClient = createClient();
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

2. **Update CORS Settings**
```javascript
// server.js
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL, // Use env variable
    credentials: true,
    methods: ["GET", "POST"]
  }
});
```

3. **Enable HTTPS/WSS for Production**
```javascript
// server.js
const io = new Server(httpServer, {
  transports: ["websocket", "polling"], // Try websocket first
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true
  }
});
```

4. **Environment Variables**
```bash
# .env (backend)
PORT=4000
SOCKET_URL=https://your-domain.com

# .env (frontend)
VITE_SOCKET_URL=https://your-domain.com
```

---

## Common Issues & Solutions

### Issue 1: CORS Error
**Error**: `Access-Control-Allow-Origin` error
**Solution**: Add frontend URL to CORS origin in `server.js`

### Issue 2: Connection Timeout
**Error**: Socket takes too long to connect
**Solution**: Check firewall, ensure WebSocket port is open

### Issue 3: Multiple Connections
**Error**: Duplicate connections on page refresh
**Solution**: Use singleton pattern (store socket in context/store)

### Issue 4: Data Not Syncing
**Error**: Real-time data not appearing
**Solution**: Verify rooms are joined with correct courseId format

---

## Performance Optimization

1. **Batch Emit Events**
```javascript
// Emit only when necessary (publish state)
if (newAssignment.isPublished) {
  io.to(`course-${courseId}`).emit("assignment:created", data);
}
```

2. **Limit Payload Size**
```javascript
// Send only needed fields
emit("assignment:created", {
  _id, title, description, dueDate, maxMarks
  // Omit large fields like full course object
});
```

3. **Implement Heartbeat**
```javascript
// Keep connection alive
socket.on("ping", () => {
  socket.emit("pong");
});
```

---

## Summary

**Before Socket.IO**: Students must refresh page to see new assignments

**After Socket.IO**: 
- ✅ Real-time assignment delivery
- ✅ No page refresh needed
- ✅ Instant notifications
- ✅ Better user experience
- ✅ Scales with Redis adapter

This implementation provides the foundation for real-time LMS features!
