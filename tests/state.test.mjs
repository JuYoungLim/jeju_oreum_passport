import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { restoreRecords,toggleRecord,filterRecords } from '../src/state.js';
const catalog=JSON.parse(await readFile(new URL('../data/oreums.json',import.meta.url),'utf8'));
test('catalog has ten unique records, required fields, and official source links',()=>{
  assert.equal(catalog.length,10); assert.equal(new Set(catalog.map(x=>x.id)).size,10);
  for(const row of catalog){ for(const field of ['id','name','region','location','description']) assert.ok(row[field]); assert.equal(row.favorite,false); assert.equal(row.visited,false); assert.match(new URL(row.sourceUrl).hostname,/^(www\.)?(visitjeju\.net|jeju\.go\.kr)$/); }
});
test('favorite and visited independently toggle and survive JSON round trip',()=>{
  let records=restoreRecords(catalog,null);
  records=toggleRecord(records,'saebyeol','favorite'); records=toggleRecord(records,'saebyeol','visited');
  const restored=restoreRecords(catalog,JSON.stringify(records));
  assert.equal(restored[0].favorite,true); assert.equal(restored[0].visited,true);
  assert.equal(toggleRecord(restored,'saebyeol','visited')[0].visited,false);
  assert.equal(restored[1].favorite,false);
});
test('region and status filters intersect',()=>{
  let records=toggleRecord(catalog,'ttarabi','visited'); records=toggleRecord(records,'saebyeol','favorite');
  assert.deepEqual(filterRecords(records,'서귀포시','visited').map(x=>x.id),['ttarabi']);
  assert.deepEqual(filterRecords(records,'서귀포시','favorites'),[]);
  assert.deepEqual(filterRecords(records,'제주시','favorites').map(x=>x.id),['saebyeol']);
});
test('corrupt storage, unknown IDs, nonboolean flags and stale catalog data are safe',()=>{
  for(const raw of ['broken','null','{}','[null]']) assert.deepEqual(restoreRecords(catalog,raw),catalog);
  const records=restoreRecords(catalog,JSON.stringify([{id:'saebyeol',name:'stale',favorite:'true',visited:true},{id:'unknown',favorite:true}]));
  assert.equal(records.length,10); assert.equal(records[0].name,'새별오름'); assert.equal(records[0].favorite,false); assert.equal(records[0].visited,true);
});
