// Developer helper: starts an in-memory MongoDB server and runs the Task Manager API
// Ideal for beginners or machines without a local MongoDB service installed.
require('dotenv').config();
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('../app');

const PORT = process.env.PORT || 5000;

async function start() {
  console.log('\x1b[33m[DEV] Starting temporary in-memory MongoDB server...\x1b[0m');
  const mongoServer = await MongoMemoryServer.create();
  const memoryUri = mongoServer.getUri();

  console.log(`\x1b[32m[DEV] In-memory MongoDB running at: ${memoryUri}\x1b[0m`);

  await mongoose.connect(memoryUri);
  console.log('\x1b[32m[SUCCESS] Connected to MongoDB database successfully.\x1b[0m');

  const server = app.listen(PORT, () => {
    console.log(`\x1b[36m[SERVER] Task Manager API running on http://localhost:${PORT}\x1b[0m`);
    console.log(`\x1b[36m[SERVER] API Documentation: http://localhost:${PORT}/\x1b[0m`);
    console.log(`\x1b[36m[SERVER] Tasks Endpoint: http://localhost:${PORT}/api/tasks\x1b[0m`);
  });

  const shutdown = async () => {
    console.log('\nShutting down in-memory server...');
    server.close();
    await mongoose.disconnect();
    await mongoServer.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('[ERROR] Failed to start server:', err);
  process.exit(1);
});
