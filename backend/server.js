// Load environment variables from .env file before anything else
require('dotenv').config();

const mongoose = require('mongoose');
const app = require('./app');

// Configuration from environment variables
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

// Verify MONGODB_URI is provided
if (!MONGODB_URI) {
  console.error('\x1b[31m[ERROR] MONGODB_URI is not defined in your .env file.\x1b[0m');
  console.error('Please configure a valid MongoDB connection string in .env:');
  console.error('Example: MONGODB_URI=mongodb://127.0.0.1:27017/taskmanager');
  process.exit(1);
}

// Connect to MongoDB
console.log('Connecting to MongoDB...');
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('\x1b[32m[SUCCESS] Connected to MongoDB database successfully.\x1b[0m');

    // Start Express HTTP server
    const server = app.listen(PORT, () => {
      console.log(`\x1b[36m[SERVER] Task Manager API is running on http://localhost:${PORT}\x1b[0m`);
      console.log(`\x1b[36m[SERVER] Health check available at http://localhost:${PORT}/\x1b[0m`);
      console.log(`\x1b[36m[SERVER] Tasks endpoint at http://localhost:${PORT}/api/tasks\x1b[0m`);
    });

    // Graceful shutdown on termination signals
    const handleShutdown = (signal) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      server.close(() => {
        console.log('HTTP server closed.');
        mongoose.connection.close(false).then(() => {
          console.log('MongoDB connection closed.');
          process.exit(0);
        });
      });
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  })
  .catch((err) => {
    console.error('\x1b[31m[ERROR] Failed to connect to MongoDB:\x1b[0m', err.message);

    // Beginner-friendly MongoDB Atlas troubleshooting hints
    if (err.message.includes('bad auth') || err.message.includes('Authentication failed')) {
      console.error('\x1b[33m[TIP] Authentication failed: Check your MongoDB Atlas username & password in .env.');
      console.error('      If your password has special characters (like @, #, $, %), you must URL-encode them.\x1b[0m');
    } else if (err.name === 'MongooseServerSelectionError' || err.message.includes('ETIMEDOUT')) {
      console.error('\x1b[33m[TIP] Connection timed out: Check your MongoDB Atlas Network Access.');
      console.error('      Go to Atlas -> "Network Access" -> "Add IP Address" -> choose "Allow Access From Anywhere" (0.0.0.0/0).\x1b[0m');
    } else if (err.message.includes('ENOTFOUND')) {
      console.error('\x1b[33m[TIP] DNS lookup failed: Verify the cluster URL in your MONGODB_URI.\x1b[0m');
    }

    process.exit(1);
  });
