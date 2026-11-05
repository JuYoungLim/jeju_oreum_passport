import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server/app.mjs';
const project = fileURLToPath(new URL('../', import.meta.url));
const root = resolve(project, process.argv.includes('--dist') ? 'dist' : '.');
const port = Number(process.env.PORT || 5173);
const app = await createApp({ root, dataFile: resolve(project, '.local-data/notebooks.json') });
app.listen(port, '127.0.0.1', () => console.log(`Local: http://localhost:${port}`));
