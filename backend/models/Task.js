const mongoose = require('mongoose');

// Define the Schema for a Task
const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [1, 'Task title cannot be empty'],
      maxlength: [120, 'Task title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    completed: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high'],
        message: 'Priority must be either low, medium, or high',
      },
      default: 'medium',
    },
    dueDate: {
      type: Date,
      default: null,
    },
  },
  {
    // Automatically creates `createdAt` and `updatedAt` timestamps
    timestamps: true,
  }
);

// Compile schema into Task model and export
const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
