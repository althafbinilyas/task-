process.env.NODE_ENV = 'test';
const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../app');
const Task = require('../models/Task');

describe('Task Manager API Test Suite', () => {
  let mongoServer;

  // Spin up an in-memory MongoDB instance before tests start
  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  // Disconnect and stop MongoDB instance after all tests complete
  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Clear database collection between tests
  beforeEach(async () => {
    await Task.deleteMany({});
  });

  // 1. Root & CORS tests
  describe('Root and Middleware', () => {
    test('GET / should return 200 with API welcome and documentation', async () => {
      const res = await request(app).get('/');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.documentation);
    });

    test('should include CORS headers', async () => {
      const res = await request(app).get('/');
      assert.equal(res.headers['access-control-allow-origin'], '*');
    });

    test('Undefined route should return 404', async () => {
      const res = await request(app).get('/api/unknown-endpoint');
      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /Route not found/);
    });
  });

  // 2. POST /api/tasks
  describe('POST /api/tasks', () => {
    test('should successfully create a new task with all valid fields', async () => {
      const taskPayload = {
        title: 'Learn Node.js and Express',
        description: 'Build a REST API using Express and MongoDB',
        completed: false,
        priority: 'high',
        dueDate: '2026-12-31T23:59:59.000Z',
      };

      const res = await request(app).post('/api/tasks').send(taskPayload);

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.title, 'Learn Node.js and Express');
      assert.equal(res.body.data.description, 'Build a REST API using Express and MongoDB');
      assert.equal(res.body.data.completed, false);
      assert.equal(res.body.data.priority, 'high');
      assert.ok(res.body.data._id);
      assert.ok(res.body.data.createdAt);
      assert.ok(res.body.data.updatedAt);
    });

    test('should set default values when optional fields are omitted', async () => {
      const res = await request(app).post('/api/tasks').send({
        title: 'Simple Task',
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.title, 'Simple Task');
      assert.equal(res.body.data.description, '');
      assert.equal(res.body.data.completed, false);
      assert.equal(res.body.data.priority, 'medium');
      assert.equal(res.body.data.dueDate, null);
    });

    test('should return 400 if title is missing', async () => {
      const res = await request(app).post('/api/tasks').send({
        description: 'Task without a title',
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /title is required/i);
    });

    test('should return 400 if title is only whitespace', async () => {
      const res = await request(app).post('/api/tasks').send({
        title: '     ',
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /cannot be empty/i);
    });

    test('should return 400 if priority is invalid enum', async () => {
      const res = await request(app).post('/api/tasks').send({
        title: 'Task with bad priority',
        priority: 'urgent',
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.errors || res.body.message);
    });
  });

  // 3. GET /api/tasks
  describe('GET /api/tasks', () => {
    test('should return empty array when no tasks exist', async () => {
      const res = await request(app).get('/api/tasks');

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.count, 0);
      assert.deepEqual(res.body.data, []);
    });

    test('should retrieve all created tasks sorted newest first', async () => {
      await Task.create({ title: 'Task 1', priority: 'low' });
      await Task.create({ title: 'Task 2', priority: 'high' });

      const res = await request(app).get('/api/tasks');

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.count, 2);
      assert.equal(res.body.data[0].title, 'Task 2'); // newest first
      assert.equal(res.body.data[1].title, 'Task 1');
    });

    test('should filter tasks by completed status query', async () => {
      await Task.create({ title: 'Pending Task', completed: false });
      await Task.create({ title: 'Completed Task', completed: true });

      const resCompleted = await request(app).get('/api/tasks?completed=true');
      assert.equal(resCompleted.status, 200);
      assert.equal(resCompleted.body.count, 1);
      assert.equal(resCompleted.body.data[0].title, 'Completed Task');

      const resPending = await request(app).get('/api/tasks?completed=false');
      assert.equal(resPending.status, 200);
      assert.equal(resPending.body.count, 1);
      assert.equal(resPending.body.data[0].title, 'Pending Task');
    });

    test('should filter tasks by priority query', async () => {
      await Task.create({ title: 'High Priority', priority: 'high' });
      await Task.create({ title: 'Low Priority', priority: 'low' });

      const res = await request(app).get('/api/tasks?priority=high');
      assert.equal(res.status, 200);
      assert.equal(res.body.count, 1);
      assert.equal(res.body.data[0].title, 'High Priority');
    });
  });

  // 4. PATCH /api/tasks/:id
  describe('PATCH /api/tasks/:id', () => {
    test('should update specified fields of a task', async () => {
      const task = await Task.create({
        title: 'Original Title',
        description: 'Original Description',
        completed: false,
      });

      const res = await request(app)
        .patch(`/api/tasks/${task._id}`)
        .send({
          title: 'Updated Title',
          completed: true,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.title, 'Updated Title');
      assert.equal(res.body.data.description, 'Original Description'); // preserved
      assert.equal(res.body.data.completed, true);
    });

    test('should return 400 for invalid ObjectId format', async () => {
      const res = await request(app)
        .patch('/api/tasks/not-a-valid-id')
        .send({ completed: true });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /Invalid task ID format/i);
    });

    test('should return 404 when task does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .patch(`/api/tasks/${fakeId}`)
        .send({ title: 'Non-existent task' });

      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /not found/i);
    });

    test('should return 400 when request body is empty', async () => {
      const task = await Task.create({ title: 'Test Task' });
      const res = await request(app).patch(`/api/tasks/${task._id}`).send({});

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /cannot be empty/i);
    });

    test('should return 400 when updating disallowed fields', async () => {
      const task = await Task.create({ title: 'Test Task' });
      const res = await request(app)
        .patch(`/api/tasks/${task._id}`)
        .send({ unauthorizedField: 'hack' });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /Invalid field\(s\) in update/i);
    });

    test('should return 400 when updating title to an empty string', async () => {
      const task = await Task.create({ title: 'Valid Title' });
      const res = await request(app)
        .patch(`/api/tasks/${task._id}`)
        .send({ title: '   ' });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /cannot be empty/i);
    });
  });

  // 5. DELETE /api/tasks/:id
  describe('DELETE /api/tasks/:id', () => {
    test('should delete existing task and return deleted document', async () => {
      const task = await Task.create({ title: 'Task to Delete' });

      const res = await request(app).delete(`/api/tasks/${task._id}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data._id, task._id.toString());

      // Verify task no longer exists in DB
      const foundInDb = await Task.findById(task._id);
      assert.equal(foundInDb, null);
    });

    test('should return 400 for invalid ObjectId format', async () => {
      const res = await request(app).delete('/api/tasks/invalid-id-123');

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /Invalid task ID format/i);
    });

    test('should return 404 when deleting non-existent task', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).delete(`/api/tasks/${fakeId}`);

      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /not found/i);
    });
  });
});
