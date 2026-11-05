import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

test('Vercel runtime initializes with store ID without requiring an OIDC environment variable', async t => {
  const keys = ['BLOB_STORE_ID', 'BLOB_READ_WRITE_TOKEN', 'VERCEL_OIDC_TOKEN'];
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  t.after(() => { for (const key of keys) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; } });
  process.env.BLOB_STORE_ID = 'store_test';
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.VERCEL_OIDC_TOKEN;
  const { default: handler } = await import('../server/runtime.mjs');
  const server = createServer(handler);
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  t.after(() => new Promise(done => server.close(done)));
  // Routing does not access Blob; it must initialize without falsely rejecting
  // the request before the SDK has a chance to read Vercel's request context.
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/unknown`);
  assert.equal(response.status, 404);
  assert.equal((await response.json()).error, '요청을 찾을 수 없어요.');
});
