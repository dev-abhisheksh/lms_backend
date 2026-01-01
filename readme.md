# 🎓 LMS Backend — Scalable & AI-Assisted Learning Management System (API)

![Status](https://img.shields.io/badge/Status-Active%20Development-blue)
![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-Caching%20%26%20Rate%20Limiting-red)
![JWT](https://img.shields.io/badge/Auth-JWT-orange)
![RBAC](https://img.shields.io/badge/RBAC-Admin%20%7C%20Instructor%20%7C%20Student-blue)
![AI](https://img.shields.io/badge/AI-Assistive%20Learning-purple)

A **backend-first Learning Management System (LMS)** built with **Node.js, Express, MongoDB, and Redis**, designed to handle **real academic workflows**, **secure access control**, and **AI-assisted learning support**.

This backend focuses on **correctness, scalability, and production-grade design**, not UI shortcuts.  
Every major feature is implemented with **middleware-level security, caching discipline, and failure-safe design**.

---

## 🎯 What This Backend Demonstrates

This project is built to show **how real LMS backends are designed**, not how demos are made.

It demonstrates:

- Role-based access control enforced at API level
- Hierarchical academic data modeling
- Redis used as an **optimization layer**, not a dependency
- AI integrated as an **assistive service**, not core logic
- Strict separation between controllers, services, and infrastructure
- Defensive backend design (graceful fallbacks, validation everywhere)

---

## 🚀 Core Features

### 🔐 Authentication & Authorization
- JWT-based authentication
- Protected routes using middleware
- Role-based access control:
  - **Admin**
  - **Instructor**
  - **Student**

Authorization is enforced **on every protected read and write**, not just UI-side.

---

### 📚 Academic Structure
- **Departments**
- **Courses**
- **Modules**
- **Lessons**

Hierarchical structure enforced at database and API level:

Department → Course → Module → Lesson

Unauthorized access is blocked even if valid IDs are provided.

---

### 🧑‍🎓 Enrollment & Submissions
- Secure course enrollment validation
- Assignment creation (Instructor-only)
- Student submissions
- Submission ownership enforcement
- Submission data modeled separately for scalability

---

### 🧠 AI-Assisted Learning (Service-Based)

AI is implemented via a **dedicated service layer**, not mixed into controllers.

#### AI Capabilities:
- Lesson summaries and explanations
- Prompt isolation per feature (no shared prompt pollution)

AI failures **never block core LMS functionality**.

---

### ⚡ Caching Layer (Redis)

- Redis caching is applied to **read-heavy academic entities** to reduce database load and improve API response times.
- Cached data includes:
  - **Department data** and department–course mappings
  - **Course metadata**
  - **Module structure**
  - **Lesson content and hierarchy**
  - **Assignment metadata** (title, description, deadlines)

- **Submissions are intentionally not cached** due to their write-heavy, user-specific, and consistency-critical nature.

- Automatic cache invalidation is performed on all **write operations** (create, update, delete) for the above entities to prevent stale data.

- Redis is treated strictly as an **optimization layer**:
  - MongoDB remains the source of truth
  - APIs gracefully fall back to MongoDB if Redis is unavailable
  - Authorization checks are enforced after cache retrieval


Caching is **selective**, not global.

---

### 🚦 Rate Limiting
- Redis-backed atomic rate limiting
- IP-based limits for public endpoints
- User-based limits for authenticated requests
- Stricter limits for auth and write APIs

Prevents brute-force attacks and abuse.

---

### 🧾 Audit Logging
- AI usage audit logs
- Tracks:
  - AI requests
  - Feature context
  - Request metadata

Useful for monitoring, debugging, and future analytics.

---

## 🧠 Design Principles (Important)

- Redis is an **optimization**, not a single point of failure
- AI is **assistive**, never authoritative
- Authorization always happens server-side
- Controllers stay thin, logic lives in services
- Read-heavy data cached, write-heavy data never cached

These decisions are **intentional**, not accidental.

---

## 🧠 Tech Stack

- **Runtime:** Node.js  
- **Framework:** Express.js  
- **Database:** MongoDB + Mongoose  
- **Caching & Rate Limiting:** Redis  
- **Authentication:** JWT  
- **AI Integration:** External LLM APIs (Gemini / OpenAI)  
- **Environment Management:** dotenv  

---

## 📁 Project Structure

```text
src/
├── controllers/
│   ├── ai.controller.js
│   ├── assignment.controller.js
│   ├── auth.controller.js
│   ├── course.controller.js
│   ├── courseEnrollment.controller.js
│   ├── department.controller.js
│   ├── lesson.controller.js
│   ├── module.controller.js
│   └── submission.controller.js
│
├── middlewares/
│   ├── auth.middleware.js
│   ├── role.middleware.js
│   └── rateLimiter.middleware.js
│
├── models/
│   ├── aiAuditLog.model.js
│   ├── assignment.model.js
│   ├── course.model.js
│   ├── courseEnrollment.model.js
│   ├── department.model.js
│   ├── lesson.model.js
│   ├── module.model.js
│   ├── submissions.model.js
│   └── user.model.js
│
├── routes/
│   ├── ai.route.js
│   ├── assignment.route.js
│   ├── auth.route.js
│   ├── course.route.js
│   ├── courseEnrollment.route.js
│   ├── department.route.js
│   ├── lesson.route.js
│   ├── module.route.js
│   └── submission.route.js
│
├── services/
│   └── ai/
│       ├── gemini.service.js
│       └── prompts.js
│
├── utils/
│   ├── cloudinary.js
│   └── redisClient.js
│
├── app.js
└── server.js
```


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

## 📡 API Overview (High-Level)

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`

### Academic
- Departments, Courses, Modules, Lessons
- Nested routing with authorization checks

### Enrollment & Assignments
- Enrollment validation
- Assignment creation
- Student submissions

### AI
- Lesson summarization
- Context-aware explanations
- AI usage logging

---

## 🧪 Testing (Planned)

- Controller unit tests
- Middleware tests (auth, RBAC, rate limiting)
- API integration tests using Supertest

---

## 👨‍💻 Author

**Abhishek Sharma**  
Backend-focused Developer  
GitHub: https://github.com/dev-abhisheksh

---

⭐ Star this repo if you care about **real backend engineering**, not demos.