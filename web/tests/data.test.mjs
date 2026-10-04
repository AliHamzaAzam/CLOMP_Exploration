import { createHash } from 'node:crypto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {summarize} from '../scripts/data.mjs';
const header='terms,threads,sample,runtime_ms,max_error';
const metadata=JSON.parse(fs.readFileSync(new URL('../raw/machine.json',import.meta.url),'utf8'));
const fixture=()=>[header,...[20,500,1500].flatMap(terms=>[0,1,2,4].flatMap(threads=>Array.from({length:5},(_,sample)=>`${terms},${threads},${sample},${threads===0?8+sample:4+sample},0`)))].join('\n');
test('median, range, speedup and efficiency use the matched scalar baseline',()=>{
 const {rows}=summarize(fixture(),metadata);assert.equal(rows.length,12);
 const scalar=rows.find(r=>r.terms===20&&r.threads===0), parallel=rows.find(r=>r.terms===20&&r.threads===2);
 assert.equal(scalar.median_ms,10);assert.equal(scalar.min_ms,8);assert.equal(scalar.max_ms,12);assert.equal(scalar.efficiency,null);
 assert.equal(parallel.median_ms,6);assert.equal(parallel.speedup,10/6);assert.equal(parallel.efficiency,10/6/2);
});
for(const [label,mutate] of Object.entries({
 header:s=>s.replace(header,'bad'),nonfinite:s=>s.replace(',8,0',',NaN,0'),zero:s=>s.replace(',8,0',',0,0'),negative:s=>s.replace(',8,0',',-1,0'),mismatch:s=>s.replace(',8,0',',8,1'),
 missingBaseline:s=>s.split('\n').filter(l=>!l.startsWith('20,0,')).join('\n'),
 missingTeam:s=>s.split('\n').filter(l=>!l.startsWith('1500,4,')).join('\n'),
 missingWorkload:s=>s.split('\n').filter(l=>!l.startsWith('500,')).join('\n'),
 unsupportedWorkload:s=>s.replaceAll('500,','501,'),duplicate:s=>s+'\n20,0,0,8,0',incomplete:s=>s.replace('\n20,0,0,8,0',''),
 sampleOutOfRange:s=>s.replace('20,0,0,8,0','20,0,5,8,0'),emptySample:s=>s.replace('20,0,0,8,0','20,0,,8,0'),emptyError:s=>s.replace('20,0,0,8,0','20,0,0,8,'),blankError:s=>s.replace('20,0,0,8,0','20,0,0,8, ')
}))test(`rejects ${label}`,()=>assert.throws(()=>summarize(mutate(fixture()),metadata)));
for(const [key,value] of Object.entries({points:361,samples:4,repeats:99,warmups:0,actual_threads_verified:[1,2],compiler:'',flags:'',source_sha256:'invalid',adaptation:'',machine:'',recorded_at:'not a date',platform:'',affinity:'',cpu_quota:'',logical_cpus:0,allowed_cpus:[]}))test(`rejects invalid metadata ${key}`,()=>assert.throws(()=>summarize(fixture(),{...metadata,[key]:value})));
test('rejects missing metadata',()=>assert.throws(()=>summarize(fixture(),null)));
test('checked-in JSON is exactly reproducible from raw evidence',()=>{const raw=new URL('../raw/',import.meta.url);const actual=summarize(fs.readFileSync(new URL('circle.csv',raw),'utf8'),metadata);assert.deepEqual(actual,JSON.parse(fs.readFileSync(new URL('../data/results.json',import.meta.url),'utf8')));});

test('rejects duplicate CPU affinity identifiers',()=>assert.throws(()=>summarize(fixture(),{...metadata,allowed_cpus:[0,0]})));
test('rejects negative CPU affinity identifiers',()=>assert.throws(()=>summarize(fixture(),{...metadata,allowed_cpus:[-1]})));

test('recorded source hash matches the measured scalar source',()=>{const source=fs.readFileSync(new URL('../../Scalar/CircleGeneratorScalar.cpp',import.meta.url));assert.equal(createHash('sha256').update(source).digest('hex'),metadata.source_sha256);});

test('reversing raw sample order preserves canonical output bytes',()=>{
 const rows=fixture().split('\n');rows.shift();
 assert.equal(JSON.stringify(summarize([header,...rows.reverse()].join('\n'),metadata)),JSON.stringify(summarize(fixture(),metadata)));
});
test('uses each workload own scalar baseline and keeps CSV milliseconds unchanged',()=>{
 const csv=fixture().split('\n').map(line=>line.startsWith('500,0,')?line.replace(/,\d+,0$/,',60,0'):line).join('\n');
 const rows=summarize(csv,metadata).rows;
 assert.equal(rows.find(r=>r.terms===500&&r.threads===2).speedup,10);
 assert.equal(rows.find(r=>r.terms===20&&r.threads===2).speedup,10/6);
 assert.equal(rows.find(r=>r.terms===500&&r.threads===0).median_ms,60);
});
for(const [label,csv] of Object.entries({empty:'',whitespace:'  \n ',headerOnly:header,extraColumn:fixture().replace('20,0,0,8,0','20,0,0,8,0,0'),hexRuntime:fixture().replace(',8,0',',0x8,0'),hexWorkload:fixture().replace('20,0,0,8,0','0x14,0,0,8,0'),overflowRatio:fixture().split('\n').map(line=>{const fields=line.split(',');if(Number(fields[1])>0)fields[3]='1e-320';return fields.join(',');}).join('\n')}))test(`rejects malformed evidence ${label}`,()=>assert.throws(()=>summarize(csv,metadata)));
test('recorded CSV has all 60 samples and all12 workload configurations',()=>{
 const csv=fs.readFileSync(new URL('../raw/circle.csv',import.meta.url),'utf8');
 assert.equal(csv.trim().split('\n').length-1,60);
 const rows=summarize(csv,metadata).rows;
 assert.equal(rows.length,12);assert.equal(rows.reduce((sum,row)=>sum+row.samples,0),60);
});
