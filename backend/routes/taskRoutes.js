const express = require('express');
const mongoose = require('mongoose');
const Task = require('../models/Task');

const router = express.Router();

/**
 * Middleware: validate that the `:id` parameter is a valid 24-character hexadecimal MongoDB ObjectId.
 * Prevents Mongoose cast errors and gives beginner-friendly error feedback.
 */
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: `Invalid task ID format: "${req.params.id}". Must be a 24-character hexadecimal string.`,
    });
  }
  next();
};

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks (with optional filtering by completion status or priority)
 * @access  Public
 */
router.get('/', async (req, res, next) => {
  try {
    const filter = {};

    // Optional query filter: ?completed=true or ?completed=false
    if (req.query.completed !== undefined) {
      if (req.query.completed === 'true') filter.completed = true;
      else if (req.query.completed === 'false') filter.completed = false;
    }

    // Optional query filter: ?priority=low|medium|high
    if (req.query.priority) {
      filter.priority = req.query.priority.toLowerCase();
    }

    // Fetch tasks sorted by newest first
    const tasks = await Task.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/tasks
 * @desc    Create a new task
 * @access  Public
 */
router.post('/', async (req, res, next) => {
  try {
    const { title, description, completed, priority, dueDate } = req.body;

    // Beginner-friendly explicit input validation for title
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Task title is required and cannot be empty.',
      });
    }

    // Create new task document in MongoDB
    const task = await Task.create({
      title: title.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      completed: typeof completed === 'boolean' ? completed : false,
      priority: priority ? priority.toLowerCase() : 'medium',
      dueDate: dueDate ? new Date(dueDate) : null,
    });

    return res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /api/tasks/:id
 * @desc    Partially update an existing task
 * @access  Public
 */
router.patch('/:id', validateObjectId, async (req, res, next) => {
  try {
    const allowedUpdates = ['title', 'description', 'completed', 'priority', 'dueDate'];
    const incomingFields = Object.keys(req.body);

    // Check if request body contains any fields
    if (incomingFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Request body cannot be empty. Please provide fields to update.',
      });
    }

    // Reject unrecognized fields
    const isValidOperation = incomingFields.every((field) => allowedUpdates.includes(field));
    if (!isValidOperation) {
      const invalidFields = incomingFields.filter((field) => !allowedUpdates.includes(field));
      return res.status(400).json({
        success: false,
        message: `Invalid field(s) in update: ${invalidFields.join(', ')}. Allowed fields are: ${allowedUpdates.join(', ')}.`,
      });
    }

    // If title is being updated, validate that it's a non-empty string
    if (req.body.title !== undefined) {
      if (typeof req.body.title !== 'string' || req.body.title.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Task title cannot be empty.',
        });
      }
      req.body.title = req.body.title.trim();
    }

    // Normalize priority if provided
    if (req.body.priority && typeof req.body.priority === 'string') {
      req.body.priority = req.body.priority.toLowerCase();
    }

    // Trim description if provided
    if (req.body.description !== undefined && typeof req.body.description === 'string') {
      req.body.description = req.body.description.trim();
    }

    // Update the task and return the new document, running Mongoose schema validators
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: 'after',
      runValidators: true,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: `Task with ID ${req.params.id} was not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: task,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete a task by ID
 * @access  Public
 */
router.delete('/:id', validateObjectId, async (req, res, next) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: `Task with ID ${req.params.id} was not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
      data: task,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
