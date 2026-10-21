const express = require('express');
const cors = require('cors');
const taskRoutes = require('./routes/taskRoutes');

const app = express();

// 1. Configure CORS
// Allows frontend applications (e.g. React, Vue, or local HTML) to make requests to this backend.
const corsOptions = {
  origin: '*', // In production, replace with specific origin like 'http://localhost:3000'
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// 2. Parse incoming JSON payloads
app.use(express.json());

// 3. Root health check & API overview
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the Task Manager API!',
    documentation: {
      'GET /api/tasks': 'Retrieve all tasks (supports query params: completed, priority)',
      'POST /api/tasks': 'Create a new task (body: { title, description?, completed?, priority?, dueDate? })',
      'PATCH /api/tasks/:id': 'Partially update a task by ID',
      'DELETE /api/tasks/:id': 'Delete a task by ID',
    },
  });
});

// 4. Mount task management routes
app.use('/api/tasks', taskRoutes);

// 5. Handle 404 errors for any unknown route
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// 6. Global centralized error-handling middleware
app.use((err, req, res, next) => {
  // Log unexpected errors for server debugging
  if (process.env.NODE_ENV !== 'test') {
    console.error('API Error:', err);
  }

  // Handle Mongoose Schema Validation Errors (e.g. required field missing, enum failure)
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: messages,
    });
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId format in queries)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid format for field "${err.path}": ${err.value}`,
    });
  }

  // Handle malformed JSON body errors from express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Malformed JSON payload in request body.',
    });
  }

  // Generic fallback for any other unexpected server errors
  return res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

module.exports = app;
