import assert from 'node:assert/strict';
import process from 'node:process';

process.env.NODE_ENV = 'test';

const { createApp } = await import('./index.ts');

const app = createApp();
const server = app.listen(0);

const address = server.address();
const port = typeof address === 'object' && address ? address.port : 0;
const baseUrl = `http://127.0.0.1:${port}`;

const assertJson = async (response: Response) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

try {
  const healthResponse = await fetch(`${baseUrl}/api/health`);
  assert.equal(healthResponse.status, 200, 'Health endpoint should succeed');
  const healthBody = await assertJson(healthResponse);
  assert.equal(healthBody.status, 'ok');

  const resourcesResponse = await fetch(`${baseUrl}/api/resources`);
  assert.equal(resourcesResponse.status, 200, 'Resources endpoint should succeed');
  const resourcesBody = await assertJson(resourcesResponse);
  assert.ok(Array.isArray(resourcesBody.resources), 'Resources response should expose the resource list');

  const protectedResponse = await fetch(`${baseUrl}/api/tenants`);
  assert.equal(protectedResponse.status, 401, 'Protected routes should require auth');
  const protectedBody = await assertJson(protectedResponse);
  assert.equal(protectedBody.status, 'error');

  const invalidLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'missing', password: 'wrong' }),
  });
  assert.equal(invalidLoginResponse.status, 401, 'Invalid login should be rejected');
  const invalidLoginBody = await assertJson(invalidLoginResponse);
  assert.equal(invalidLoginBody.status, 'error');

  console.log('API health checks passed');
} finally {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}
