import test from 'node:test';
import assert from 'node:assert/strict';
import { StorageService } from './db';

test('loadTenantsFromApi surfaces backend failures instead of silently returning cached data', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => {
    return new Response(JSON.stringify({ status: 'error', message: 'backend down' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    await assert.rejects(() => StorageService.loadTenantsFromApi(), /backend down/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
