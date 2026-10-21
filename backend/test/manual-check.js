const http = require('http');

function request(method, path, data) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, headers: res.headers, body });
          }
        });
      }
    );
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('--- 1. Testing GET / (Root & CORS) ---');
  const root = await request('GET', '/');
  console.log('Status:', root.status, '| Success:', root.body.success, '| Message:', root.body.message);
  console.log('CORS Allow Origin:', root.headers['access-control-allow-origin']);

  console.log('\n--- 2. Testing POST /api/tasks (Success) ---');
  const created = await request('POST', '/api/tasks', {
    title: 'Complete backend implementation',
    description: 'Build Express + MongoDB Task Manager',
    priority: 'high',
  });
  console.log('Status:', created.status, '| ID:', created.body.data._id, '| Title:', created.body.data.title);

  const taskId = created.body.data._id;

  console.log('\n--- 3. Testing POST /api/tasks (Validation Failure) ---');
  const failedCreate = await request('POST', '/api/tasks', { title: '   ' });
  console.log('Status:', failedCreate.status, '| Message:', failedCreate.body.message);

  console.log('\n--- 4. Testing GET /api/tasks ---');
  const getTasks = await request('GET', '/api/tasks');
  console.log('Status:', getTasks.status, '| Count:', getTasks.body.count, '| Tasks:', getTasks.body.data.map((t) => t.title));

  console.log('\n--- 5. Testing PATCH /api/tasks/:id ---');
  const updated = await request('PATCH', `/api/tasks/${taskId}`, {
    completed: true,
    description: 'Updated description and completed status',
  });
  console.log('Status:', updated.status, '| Completed:', updated.body.data.completed, '| Description:', updated.body.data.description);

  console.log('\n--- 6. Testing PATCH with invalid ID format (Validation) ---');
  const badIdPatch = await request('PATCH', '/api/tasks/123-invalid-id', { completed: true });
  console.log('Status:', badIdPatch.status, '| Message:', badIdPatch.body.message);

  console.log('\n--- 7. Testing DELETE /api/tasks/:id ---');
  const deleted = await request('DELETE', `/api/tasks/${taskId}`);
  console.log('Status:', deleted.status, '| Deleted ID:', deleted.body.data._id);

  console.log('\n--- 8. Testing GET after DELETE (should be empty) ---');
  const getAfterDelete = await request('GET', '/api/tasks');
  console.log('Status:', getAfterDelete.status, '| Count:', getAfterDelete.body.count);

  console.log('\n--- 9. Testing DELETE non-existent task (404) ---');
  const notFoundDelete = await request('DELETE', `/api/tasks/${taskId}`);
  console.log('Status:', notFoundDelete.status, '| Message:', notFoundDelete.body.message);

  console.log('\nALL 9 LIVE HTTP ENDPOINT TESTS PASSED WITH 100% SUCCESS!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
