import { mkdir, cp, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const data = JSON.parse(await readFile(resolve(root, 'data/oreums.json'), 'utf8'));
if(data.length !== 10 || new Set(data.map(x=>x.id)).size !== 10) throw new Error('Catalog must contain 10 unique oreums');
await mkdir(resolve(root, 'dist'), {recursive:true});
for(const path of ['index.html','height-sample.html','styles.css','src','data','assets']) await cp(resolve(root,path),resolve(root,'dist',path),{recursive:true});
console.log('Build complete: dist/ (10 oreums, no external runtime dependencies)');
