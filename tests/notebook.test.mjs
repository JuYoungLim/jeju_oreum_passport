import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server/app.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
async function fixture(t) {
  const dir = await mkdtemp(resolve(tmpdir(), 'oreum-notebook-'));
  const dataFile = resolve(dir, 'notebooks.json');
  const app = await createApp({ root, dataFile });
  await new Promise(done => app.listen(0, '127.0.0.1', done));
  const url = `http://127.0.0.1:${app.address().port}`;
  t.after(async () => { await new Promise(done => app.close(done)); await rm(dir, { recursive: true, force: true }); });
  function client() {
    let cookie = '';
    return { get cookie() { return cookie; }, async request(path = '', method = 'GET', body, extra = {}) {
      const response = await fetch(url + '/api/notebook' + path, { method, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...extra }, body: body === undefined ? undefined : JSON.stringify(body) });
      if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
      return { status: response.status, data: await response.json(), headers: response.headers };
    } };
  }
  return { client, app, dataFile, url };
}

test('anonymous notebooks isolate records and persist across store reloads', async t => {
  const { client, dataFile } = await fixture(t); const a = client(), b = client();
  assert.equal((await a.request()).status, 401);
  const first = await a.request('', 'POST', { records: [{ id: 'saebyeol', favorite: true, visited: false }] });
  assert.equal(first.status, 201); assert.match(first.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
  const second = await b.request('', 'POST', {});
  assert.notEqual(first.data.notebook.id, second.data.notebook.id);
  await a.request('/records', 'PATCH', { id: 'saebyeol', field: 'visited', value: true });
  assert.equal((await b.request()).data.notebook.records.length, 0);
  const { createNotebookStore } = await import('../server/notebooks.mjs');
  const store = createNotebookStore(dataFile, ['saebyeol']);
  assert.equal((await store.get(a.cookie.split('=')[1])).records[0].visited, true);
  assert.equal((await a.request('', 'POST', {})).data.notebook.id, first.data.notebook.id);
});

test('recovery opens the same notebook and rotation invalidates only the old code', async t => {
  const { client, dataFile } = await fixture(t); const a = client(), b = client();
  const created = await a.request('', 'POST', {});
  const issued = await a.request('/recovery', 'POST', {}); const code = issued.data.code;
  assert.match(code, /^[\w-]{43}$/);
  assert.equal((await b.request('/restore', 'POST', { code: 'bad' })).status, 400);
  assert.equal((await b.request()).status, 401);
  const restored = await b.request('/restore', 'POST', { code });
  assert.equal(restored.data.notebook.id, created.data.notebook.id);
  assert.notEqual(a.cookie, b.cookie);
  await b.request('/records', 'PATCH', { id: 'abu', field: 'favorite', value: true });
  assert.equal((await a.request()).data.notebook.records[0].favorite, true);
  const rotated = await b.request('/recovery', 'POST', {});
  assert.equal((await client().request('/restore', 'POST', { code })).status, 400);
  assert.equal((await client().request('/restore', 'POST', { code: rotated.data.code })).status, 200);
  const disk = await readFile(dataFile, 'utf8');
  for (const raw of [code, rotated.data.code, a.cookie.split('=')[1], b.cookie.split('=')[1]]) assert.equal(disk.includes(raw), false);
});

test('simultaneous field updates do not lose other changes', async t => {
  const { client } = await fixture(t); const a = client(); await a.request('', 'POST', {});
  await Promise.all([
    a.request('/records', 'PATCH', { id: 'saebyeol', field: 'visited', value: true }),
    a.request('/records', 'PATCH', { id: 'saebyeol', field: 'favorite', value: true }),
    a.request('/records', 'PATCH', { id: 'abu', field: 'visited', value: true })
  ]);
  const { records } = (await a.request()).data.notebook;
  assert.deepEqual(records.find(x => x.id === 'saebyeol'), { id: 'saebyeol', favorite: true, visited: true });
  assert.equal(records.find(x => x.id === 'abu').visited, true);
});

test('API rejects unauthenticated writes, cross-origin writes and invalid records', async t => {
  const { client, url } = await fixture(t); const a = client();
  assert.equal((await a.request('/records', 'PATCH', { id: 'abu', field: 'visited', value: true })).status, 401);
  assert.equal((await a.request('', 'POST', { records: [{ id: '../secrets', visited: true }] })).status, 400);
  await a.request('', 'POST', {});
  assert.equal((await a.request('/records', 'PATCH', { id: 'abu', field: 'visited', value: true }, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await a.request('/records', 'PATCH', { id: 'abu', field: 'owner', value: true })).status, 400);
  assert.equal((await a.request('/records', 'PATCH', { id: 'abu', field: 'visited', value: 'true' })).status, 400);
  for (const path of ['/.local-data/notebooks.json', '/server/notebooks.mjs', '/scripts/serve.mjs']) assert.equal((await fetch(url + path)).status, 404);
  assert.equal((await a.request()).headers.get('cache-control'), 'private, no-store');
});

test('recovery attempts are rate-limited', async t => {
  const { client } = await fixture(t); const a = client();
  for (let i = 0; i < 10; i++) assert.equal((await a.request('/restore', 'POST', { code: 'wrong' })).status, 400);
  assert.equal((await a.request('/restore', 'POST', { code: 'wrong' })).status, 429);
});
