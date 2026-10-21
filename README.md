# TaskFlow - Fullstack Task Manager

A modern, responsive Task Management application built with **Node.js**, **Express**, **MongoDB / Mongoose**, and a custom **vanilla CSS glassmorphic frontend**.

---

## Features

- **RESTful API**: Complete CRUD endpoints (`GET`, `POST`, `PATCH`, `DELETE`) with input validation and centralized error handling.
- **MongoDB Atlas Integration**: Connects to MongoDB Atlas or local MongoDB instances.
- **Modern UI**: Dark glassmorphic interface with real-time statistics, search, status filtering, priority tags, and toast alerts.
- **Zero-Dependency Frontend**: Pure HTML5, Vanilla CSS, and JavaScript.
- **Decoupled Architecture**: Clean separation into `backend/` and `frontend/` directories.

---

## Project Structure

```
├── backend/
│   ├── models/
│   │   └── Task.js          # Mongoose Task schema
│   ├── routes/
│   │   └── taskRoutes.js    # API route handlers
│   ├── scripts/
│   │   ├── test-db.js       # Atlas connection tester
│   │   └── dev-memory.js    # In-memory Mongo runner
│   ├── test/
│   │   └── task.test.js     # Automated test suite (21 tests)
│   ├── app.js               # Express app & middlewares
│   ├── server.js            # Server entry point
│   ├── .env.example         # Environment template
│   └── package.json
└── frontend/
    ├── index.html           # Dashboard interface
    ├── styles.css           # Glassmorphic dark styling
    ├── app.js               # Frontend application logic
    ├── server.js            # Lightweight local web server
    └── package.json
```

---

## Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/althafbinilyas/task-.git
cd task-
```

### 2. Configure the Backend
Navigate to `backend` and install dependencies:
```bash
cd backend
npm install
```

Create a `.env` file inside `backend/` (or copy from `.env.example`):
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/taskmanager?retryWrites=true&w=majority
```

Test your database connection:
```bash
node scripts/test-db.js
```

Start the backend:
```bash
node server.js
```

### 3. Run the Frontend
Open a new terminal, navigate to `frontend`:
```bash
cd frontend
node server.js
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## API Documentation

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | API status and route documentation |
| `GET` | `/api/tasks` | Get all tasks (supports `?completed=true/false` and `?priority=high/medium/low`) |
| `POST` | `/api/tasks` | Create a new task (`{ title, description?, completed?, priority?, dueDate? }`) |
| `PATCH` | `/api/tasks/:id` | Update task fields by ID |
| `DELETE` | `/api/tasks/:id` | Delete a task by ID |

---

## Running Tests
Run the 21 automated integration tests:
```bash
cd backend
npm test
```
