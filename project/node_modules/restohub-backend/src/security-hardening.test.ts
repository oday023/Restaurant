import assert from 'node:assert/strict';
import process from 'node:process';

process.env.NODE_ENV = 'test';

const { createApp } = await import('./index.ts');

const app = createApp();
const server = app.listen(0);

const address = server.address();
const port = typeof address === 'object' && address ? address.port : 0;
const baseUrl = `http://127.0.0.1:${port}`;

try {
  const healthResponse = await fetch(`${baseUrl}/api/health`);
  assert.equal(healthResponse.status, 200);
  assert.equal(healthResponse.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(healthResponse.headers.get('x-frame-options'), 'DENY');
  assert.equal(healthResponse.headers.get('referrer-policy'), 'same-origin');

  const resetResponse = await fetch(`${baseUrl}/api/auth/password-reset/request`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'unknown@example.com' }),
  });
  assert.equal(resetResponse.status, 202);

  const resetBody = await resetResponse.json();
  assert.equal(resetBody.status, 'ok');
} finally {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}
