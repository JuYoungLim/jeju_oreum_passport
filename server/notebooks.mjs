import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
const digest = value => createHash('sha256').update(value).digest('hex');
const secret = () => randomBytes(32).toString('base64url');
const equalHash = (a, b) => typeof a === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const SESSION_MS = 90 * 24 * 60 * 60 * 1000;

export function createNotebookStore(file, oreumIds, repository = null) {
  let queue = Promise.resolve();
  const ids = new Set(oreumIds);
  function transaction(operation) {
    const run = queue.then(async () => {
      if (repository) {
        for (let attempt = 0; attempt < 8; attempt++) {
          const { data, etag } = await repository.read();
          const result = operation(data);
          if (!result.write || await repository.write(data, etag)) return result.value;
        }
        throw Object.assign(new Error('다른 기록을 저장 중이에요. 잠시 뒤 다시 시도해 주세요.'), { status: 409 });
      }
      let data;
      try { data = JSON.parse(await readFile(file, 'utf8')); }
      catch (error) { if (error.code !== 'ENOENT') throw error; data = { version: 1, notebooks: [] }; }
      const result = operation(data);
      if (result.write) {
        await mkdir(dirname(file), { recursive: true });
        const temp = `${file}.${randomUUID()}.tmp`;
        await writeFile(temp, JSON.stringify(data, null, 2), { mode: 0o600 });
        await rename(temp, file);
      }
      return result.value;
    });
    queue = run.catch(() => {});
    return run;
  }
  function find(data, token) {
    if (typeof token !== 'string' || !/^[\w-]{43}$/.test(token)) return null;
    const hash = digest(token);
    return data.notebooks.find(book => book.sessions.some(s => s.expiresAt > Date.now() && equalHash(s.hash, hash)));
  }
  function addSession(book) {
    const token = secret();
    book.sessions = book.sessions.filter(s => s.expiresAt > Date.now()).slice(-19);
    book.sessions.push({ hash: digest(token), expiresAt: Date.now() + SESSION_MS });
    return token;
  }
  const view = book => book ? { id: book.id, createdAt: book.createdAt, updatedAt: book.updatedAt, hasRecovery: Boolean(book.recoveryHash), records: book.records } : null;
  return {
    consumeLimit(key, maximum) { return transaction(data => {
      const now = Date.now(); const hash = digest(key);
      data.limits ??= {};
      for (const [key, bucket] of Object.entries(data.limits)) if (bucket.until <= now) delete data.limits[key];
      const bucket = data.limits[hash] ?? { count: 0, until: now + 60000 };
      if (bucket.count >= maximum) return { value: true };
      if (Object.keys(data.limits).length >= 1000 && !data.limits[hash]) return { value: true };
      bucket.count++; data.limits[hash] = bucket;
      return { write: true, value: false };
    }); },
    create(initial = []) { return transaction(data => {
      if (!Array.isArray(initial) || initial.length > ids.size) throw Object.assign(new Error('잘못된 초기 기록이에요.'), { status: 400 });
      const book = { id: randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), records: [], recoveryHash: null, sessions: [] };
      for (const row of initial) {
        if (!row || !ids.has(row.id) || typeof row.favorite !== 'boolean' || typeof row.visited !== 'boolean' || book.records.some(r => r.id === row.id)) throw Object.assign(new Error('잘못된 초기 기록이에요.'), { status: 400 });
        book.records.push({ id: row.id, favorite: row.favorite, visited: row.visited });
      }
      const token = addSession(book); data.notebooks.push(book);
      return { write: true, value: { notebook: view(book), token } };
    }); },
    get(token) { return transaction(data => ({ value: view(find(data, token)) })); },
    update(token, { id, field, value } = {}) { return transaction(data => {
      const book = find(data, token); if (!book) return { value: null };
      if (!ids.has(id) || !['favorite', 'visited'].includes(field) || typeof value !== 'boolean') throw Object.assign(new Error('잘못된 오름 기록이에요.'), { status: 400 });
      let row = book.records.find(r => r.id === id);
      if (!row) { row = { id, favorite: false, visited: false }; book.records.push(row); }
      row[field] = value; book.updatedAt = new Date().toISOString();
      return { write: true, value: view(book) };
    }); },
    issueRecovery(token) { return transaction(data => {
      const book = find(data, token); if (!book) return { value: null };
      const code = secret(); book.recoveryHash = digest(code);
      return { write: true, value: { code, notebook: view(book) } };
    }); },
    recover(code) { return transaction(data => {
      if (typeof code !== 'string' || !/^[\w-]{43}$/.test(code.trim())) return { value: null };
      const hash = digest(code.trim()); const book = data.notebooks.find(book => equalHash(book.recoveryHash, hash));
      if (!book) return { value: null };
      return { write: true, value: { notebook: view(book), token: addSession(book) } };
    }); }
  };
}
