import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import { query } from './db.ts';

const baseUrl = process.env.RBAC_BASE_URL ?? 'http://localhost:4000';

const login = async (username: string, password: string) => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  assert.equal(response.status, 200, `Login failed for ${username}`);
  const body = await response.json() as { token: string };
  return body.token;
};

const requestJson = async (path: string, init?: RequestInit) => {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // keep raw text if not JSON
  }
  return { response, body };
};

const main = async () => {
  const password = 'rbac-test-password';
  const hash = await bcrypt.hash(password, 10);
  await query('UPDATE employees SET password_hash = $1 WHERE username = $2', [hash, 'saher']);

  const { response: unauthenticatedResponse } = await requestJson('/api/resources');
  assert.equal(unauthenticatedResponse.status, 401, 'Unauthenticated access to /api/resources should be denied');

  const cashierToken = await login('saher', password);
  const { response: forbiddenDeleteResponse } = await requestJson('/api/tenants/not-a-real-id', {
    method: 'DELETE',
    headers: { authorization: `Bearer ${cashierToken}` },
  });
  assert.equal(forbiddenDeleteResponse.status, 403, 'Cashier should not be able to delete tenants');

  console.log('RBAC smoke tests passed');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
