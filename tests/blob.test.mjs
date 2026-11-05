import test from 'node:test';
import assert from 'node:assert/strict';
import { BlobPreconditionFailedError } from '@vercel/blob';
import { createBlobRepository } from '../server/blob.mjs';
import { createNotebookStore } from '../server/notebooks.mjs';

function blobMock() {
  let value = null, version = 0;
  const calls = [];
  const sdk = {
    async get(path, options) {
      calls.push({ method: 'get', path, options });
      if (!value) return null;
      return { statusCode: 200, stream: new Response(value).body, blob: { etag: String(version) } };
    },
    async put(path, next, options) {
      calls.push({ method: 'put', path, options });
      if (options.ifMatch && options.ifMatch !== String(version)) throw new BlobPreconditionFailedError();
      if (value && !options.allowOverwrite) throw new Error('Blob already exists');
      value = next; version++;
      return { etag: String(version) };
    }
  };
  return { sdk, calls };
}

test('private Blob reads bypass cache and concurrent cold starts preserve notebooks', async () => {
  const mock = blobMock();
  const a = createNotebookStore(null, ['abu'], createBlobRepository({ sdk: mock.sdk }));
  const b = createNotebookStore(null, ['abu'], createBlobRepository({ sdk: mock.sdk }));
  const [first, second] = await Promise.all([a.create(), b.create()]);
  assert.notEqual(first.notebook.id, second.notebook.id);
  assert.equal((await a.get(first.token)).id, first.notebook.id);
  assert.equal((await b.get(second.token)).id, second.notebook.id);
  for (const call of mock.calls) {
    assert.equal(call.options.access, 'private');
    if (call.method === 'get') assert.equal(call.options.useCache, false);
  }
});

test('ETag conflict retries merge fields across independent server instances', async () => {
  const mock = blobMock();
  const a = createNotebookStore(null, ['abu'], createBlobRepository({ sdk: mock.sdk }));
  const b = createNotebookStore(null, ['abu'], createBlobRepository({ sdk: mock.sdk }));
  const created = await a.create();
  await Promise.all([
    a.update(created.token, { id: 'abu', field: 'favorite', value: true }),
    b.update(created.token, { id: 'abu', field: 'visited', value: true })
  ]);
  assert.deepEqual((await a.get(created.token)).records, [{ id: 'abu', favorite: true, visited: true }]);
  assert.ok(mock.calls.some(call => call.options.ifMatch));
});

test('request limits are shared across independent instances', async () => {
  const mock = blobMock();
  const a = createNotebookStore(null, [], createBlobRepository({ sdk: mock.sdk }));
  const b = createNotebookStore(null, [], createBlobRepository({ sdk: mock.sdk }));
  assert.equal(await a.consumeLimit('recover:demo', 2), false);
  assert.equal(await b.consumeLimit('recover:demo', 2), false);
  assert.equal(await a.consumeLimit('recover:demo', 2), true);
});
