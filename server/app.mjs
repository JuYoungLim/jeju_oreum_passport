import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { createNotebookStore } from './notebooks.mjs';
const COOKIE = 'oreum_session';
export async function createRequestHandler({ root, dataFile, secureCookie = false, store: suppliedStore, getClientAddress = req => req.socket.remoteAddress }) {
  const catalog = JSON.parse(await readFile(resolve(root, 'data/oreums.json'), 'utf8'));
  const store = suppliedStore || createNotebookStore(dataFile, catalog.map(row => row.id));
  const attempts = new Map();
  async function limited(key, maximum) {
    if (suppliedStore) return store.consumeLimit(key, maximum);
    const now = Date.now();
    if (attempts.size > 1000) for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
    let bucket = attempts.get(key);
    if (!bucket || bucket.until <= now) { bucket = { count: 0, until: now + 60000 }; attempts.set(key, bucket); }
    return ++bucket.count > maximum;
  }
  return async (req, res) => {
    const respond = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(value)); };
    const cookie = token => res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=7776000${secureCookie ? '; Secure' : ''}`);
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (url.pathname.startsWith('/api/')) {
        const token = req.headers.cookie?.split(';').map(x => x.trim()).find(x => x.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
        if (req.method !== 'GET') {
          const origin = req.headers.origin;
          if ((origin && origin !== `${secureCookie ? 'https' : 'http'}://${req.headers.host}`) || req.headers['sec-fetch-site'] === 'cross-site') return respond(403, { error: '이 사이트에서만 수첩을 변경할 수 있어요.' });
          if (!req.headers['content-type']?.startsWith('application/json')) return respond(415, { error: 'JSON 요청이 필요해요.' });
        }
        let body = {};
        if (req.method !== 'GET') {
          let size = 0, chunks = [];
          for await (const chunk of req) { size += chunk.length; if (size > 16384) return respond(413, { error: '요청이 너무 커요.' }); chunks.push(chunk); }
          try { body = req.body ?? JSON.parse(Buffer.concat(chunks).toString() || '{}'); if (typeof body === 'string') body=JSON.parse(body); if (Buffer.byteLength(JSON.stringify(body)) > 16384) return respond(413, { error: '요청이 너무 커요.' }); } catch { return respond(400, { error: '잘못된 JSON이에요.' }); }
          if (!body || typeof body !== 'object' || Array.isArray(body)) return respond(400, { error: '잘못된 요청이에요.' });
        }
        if (url.pathname === '/api/notebook' && req.method === 'GET') {
          const notebook = await store.get(token);
          return respond(notebook ? 200 : 401, notebook ? { notebook } : { error: '수첩을 먼저 만들거나 불러와 주세요.' });
        }
        if (url.pathname === '/api/notebook' && req.method === 'POST') {
          const existing = await store.get(token); if (existing) return respond(200, { notebook: existing });
          if (await limited(`create:${getClientAddress(req)}`, 20)) return respond(429, { error: '수첩을 너무 자주 만들었어요. 1분 뒤 다시 시도해 주세요.' });
          const result = await store.create(body.records); cookie(result.token); return respond(201, { notebook: result.notebook });
        }
        if (url.pathname === '/api/notebook/records' && req.method === 'PATCH') {
          const notebook = await store.update(token, body);
          return respond(notebook ? 200 : 401, notebook ? { notebook } : { error: '수첩 연결이 만료됐어요. 새로고침하거나 복구 코드로 불러와 주세요.' });
        }
        if (url.pathname === '/api/notebook/recovery' && req.method === 'POST') {
          const result = await store.issueRecovery(token);
          return respond(result ? 200 : 401, result || { error: '수첩 연결이 만료됐어요.' });
        }
        if (url.pathname === '/api/notebook/restore' && req.method === 'POST') {
          if (await limited(`recover:${getClientAddress(req)}`, 10)) return respond(429, { error: '복구 시도가 많아요. 1분 뒤 다시 시도해 주세요.' });
          const result = await store.recover(body.code);
          if (!result) return respond(400, { error: '복구 코드를 확인해 주세요.' });
          cookie(result.token); return respond(200, { notebook: result.notebook });
        }
        return respond(404, { error: '요청을 찾을 수 없어요.' });
      }
      if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
      const path = decodeURIComponent(url.pathname);
      if (!['/', '/index.html', '/styles.css'].includes(path) && !/^\/(src|data|assets)\//.test(path)) { res.writeHead(404); return res.end('Not found'); }
      const target = resolve(root, '.' + (path === '/' ? '/index.html' : path));
      if (!target.startsWith(root + sep) || target.slice(root.length + 1).split(/[\\/]/).some(x => x.startsWith('.')) || !(await stat(target)).isFile()) { res.writeHead(404); return res.end('Not found'); }
      const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
      res.writeHead(200, { 'Content-Type': types[extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(req.method === 'HEAD' ? undefined : await readFile(target));
    } catch (error) { respond(error.status || 500, { error: error.status ? error.message : '저장소를 사용할 수 없어요. 잠시 뒤 다시 시도해 주세요.' }); }
  };
}

export async function createApp(options) { return createServer(await createRequestHandler(options)); }
