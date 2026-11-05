import { fileURLToPath } from 'node:url';
import { createRequestHandler } from './app.mjs';
import { createNotebookStore } from './notebooks.mjs';
import { createBlobRepository } from './blob.mjs';
import { readFile } from 'node:fs/promises';

let handler;
export default async function handle(req, res) {
  handler ??= (async () => {
    const root = fileURLToPath(new URL('../', import.meta.url));
    if (!process.env.BLOB_READ_WRITE_TOKEN && !(process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN)) throw new Error('Connect the private Blob store to this Vercel project');
    const catalog = JSON.parse(await readFile(new URL('../data/oreums.json', import.meta.url), 'utf8'));
    const prefix = process.env.VERCEL_ENV === 'production' ? 'production' : 'preview';
    const repository = createBlobRepository({ path: `oreum/${prefix}/v1/notebooks.json` });
    const store = createNotebookStore(null, catalog.map(x => x.id), repository);
    return createRequestHandler({ root, store, secureCookie: true, getClientAddress: request => String(request.headers['x-vercel-forwarded-for'] || request.socket.remoteAddress).split(',')[0].trim() });
  })();
  try { return await (await handler)(req, res); }
  catch { handler = null; res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' }); res.end(JSON.stringify({ error: '수첩 저장소 연결을 확인해 주세요.' })); }
}
