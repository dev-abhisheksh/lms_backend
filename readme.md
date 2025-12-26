# 🎓 LMS Backend — Scalable Learning Management System (API)

![Status](https://img.shields.io/badge/Status-Active%20Development-blue)
![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-Caching%20%26%20Rate%20Limiting-red)
![JWT](https://img.shields.io/badge/Auth-JWT-orange)
![AI](https://img.shields.io/badge/AI-Assisted%20Learning-purple)

A backend-first **Learning Management System (LMS)** designed with **scalability, security, and performance** in mind.  
This project implements **industry-aligned backend practices** such as role-based access control, Redis-backed caching, rate limiting, and AI-assisted learning features.

---

## 🚀 Features

- **Authentication System**
  - JWT-based login, registration, and logout
  - Secure middleware-level route protection

- **Role-Based Access Control (RBAC)**
  - Admin / Instructor / Student roles
  - Fine-grained permission checks on protected APIs

- **Course Management**
  - Hierarchical structure: Courses → Modules → Lessons
  - Authorized create, update, and delete operations

- **Enrollment & Access Control**
  - Server-side enrollment validation
  - Prevents unauthorized access even with valid IDs

- **Caching Layer (Redis)**
  - Redis caching for read-heavy endpoints
  - Automatic cache invalidation on create/update/delete
  - Graceful MongoDB fallback if Redis is unavailable

- **Rate Limiting**
  - Redis-backed atomic rate limiting
  - IP-based limits for unauthenticated users
  - User-based limits for authenticated users
  - Stricter limits for sensitive routes (auth & write APIs)

- **AI-Assisted Learning**
  - AI-generated lesson summaries and explanations
  - Context-aware doubt support for students
  - AI used as an assistive layer, not authoritative logic

- **Performance Optimization**
  - Optimized MongoDB indexes
  - Reduced database load through selective caching

---

## 🧠 Design Principles

- Caching applied only to read-heavy and stable data
- Frequently changing data (e.g., progress tracking) is not cached
- Authorization enforced on every protected read
- Redis treated as an optimization layer, not a dependency
- Core LMS functionality remains available even if AI or Redis fails

---

## 🧠 Tech Stack

- **Runtime:** Node.js  
- **Framework:** Express.js  
- **Database:** MongoDB + Mongoose  
- **Caching & Rate Limiting:** Redis  
- **Authentication:** JWT  
- **AI Integration:** External LLM API (OpenAI / Gemini)  
- **Environment Management:** dotenv  

---

## 📁 Project Structure

/lms-backend
├── /config
│ ├── db.js
│ ├── redis.js
│ └── env.js
│
├── /controllers
│ ├── auth.controller.js
│ ├── course.controller.js
│ ├── module.controller.js
│ └── lesson.controller.js
│
├── /middlewares
│ ├── auth.middleware.js
│ ├── role.middleware.js
│ ├── rateLimiter.middleware.js
│ └── error.middleware.js
│
├── /models
│ ├── user.model.js
│ ├── course.model.js
│ ├── module.model.js
│ └── lesson.model.js
│
├── /routes
│ ├── auth.routes.js
│ ├── course.routes.js
│ ├── module.routes.js
│ └── lesson.routes.js
│
├── /utils
│ ├── cacheKeys.js
│ └── apiResponse.js
│
├── app.js
├── server.js
├── .env.example
└── package.json

---

## ⚙️ Environment Variables

| Variable | Description |
|--------|-------------|
| `PORT` | Server port |
| `MONGODB_URL` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRY` | JWT expiry duration |
| `REDIS_URL` | Redis connection URL |
| `AI_API_KEY` | AI provider API key |

---

## 🧩 API Overview

### Auth Routes

| Endpoint | Method | Description |
|--------|--------|-------------|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | Login user |
| `/api/auth/logout` | POST | Logout user |

### Course Routes

| Endpoint | Method | Description |
|--------|--------|-------------|
| `/api/courses` | GET | Get all courses (cached) |
| `/api/courses/:id` | GET | Get course by ID |
| `/api/courses` | POST | Create course (Admin/Instructor) |
| `/api/courses/:id` | PATCH | Update course |
| `/api/courses/:id` | DELETE | Delete course |

### Module & Lesson Routes

- Nested under courses
- Enrollment verified on every request
- Cache invalidated on write operations

---

## ⚡ Redis Strategy

- **Cached Data**
  - Course lists
  - Course metadata
  - Module & lesson structure

- **Non-Cached Data**
  - User progress
  - Frequently updated student activity

- **Invalidation**
  - Targeted cache key deletion on write operations

---

## 🚦 Rate Limiting Strategy

- IP-based limiting for public endpoints
- User-based limiting for authenticated users
- Stricter thresholds for authentication and write routes
- Atomic Redis operations to ensure consistency

---

## 🧪 Testing (Planned)

- Controller unit tests
- Middleware tests (auth, rate limiting)
- API integration tests using Supertest

---

## 👨‍💻 Author

**Abhishek Sharma**  
Backend-focused MERN Developer  
GitHub: https://github.com/dev-abhisheksh