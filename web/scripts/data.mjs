import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
export function summarize(csv, metadata) {
 const workloads=[20,500,1500], teams=[0,1,2,4];
 if(!metadata || typeof metadata!=='object' || metadata.points!==360 || metadata.samples!==5 || metadata.repeats!==100 || metadata.warmups!==1) throw Error('Invalid experiment metadata');
 if(!Array.isArray(metadata.actual_threads_verified) || JSON.stringify(metadata.actual_threads_verified)!=='[1,2,4]') throw Error('Invalid verified thread teams');
 for(const key of ['compiler','flags','adaptation','machine','platform','affinity','cpu_quota','recorded_at']) {
  if(typeof metadata[key]!=='string' || !metadata[key].trim()) throw Error(`Missing metadata: ${key}`);
 }
 if(!/^[a-f0-9]{64}$/.test(metadata.source_sha256 || '') || !Number.isFinite(Date.parse(metadata.recorded_at))) throw Error('Invalid measurement provenance');
 if(!Number.isInteger(metadata.logical_cpus) || metadata.logical_cpus<1 || !Array.isArray(metadata.allowed_cpus) || !metadata.allowed_cpus.length || metadata.allowed_cpus.some(cpu=>!Number.isInteger(cpu)||cpu<0) || new Set(metadata.allowed_cpus).size!==metadata.allowed_cpus.length) throw Error('Invalid CPU metadata');
 const lines=csv.trim().split(/\r?\n/);
 if(lines.shift() !== 'terms,threads,sample,runtime_ms,max_error') throw Error('Unexpected CSV header');
 const groups=new Map();
 for(const line of lines){
  const fields=line.split(',');
  if(fields.some(field=>!field.trim())) throw Error('Missing numeric field');
  if(fields.some(field=>!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i.test(field.trim()))) throw Error('Invalid decimal field');
  const values=fields.map(Number);
  if(values.length!==5 || values.some(v=>!Number.isFinite(v))) throw Error('Invalid numeric row');
  const [terms,threads,sample,runtime,error]=values;
  if(!workloads.includes(terms)||!teams.includes(threads)||!Number.isInteger(sample)||sample<0||sample>=metadata.samples||runtime<=0||error<0||error>1e-12) throw Error('Invalid benchmark sample');
  const key=`${terms}:${threads}`;
  if(!groups.has(key)) groups.set(key,[]);
  const group=groups.get(key);
  if(group.some(row=>row.sample===sample)) throw Error('Duplicate sample');
  group.push({sample,runtime,error});
 }
 for(const terms of workloads) for(const threads of teams) if(!groups.has(`${terms}:${threads}`)) throw Error('Missing workload or thread configuration');
 const rows=[...groups].sort(([a],[b])=>{const [at,ap]=a.split(':').map(Number),[bt,bp]=b.split(':').map(Number);return at-bt||ap-bp;}).map(([key,samples])=>{
  if(samples.length!==metadata.samples) throw Error('Incomplete sample group');
  const [terms,threads]=key.split(':').map(Number), times=samples.map(s=>s.runtime).sort((a,b)=>a-b);
  const mid=Math.floor(times.length/2), median=times.length%2?times[mid]:(times[mid-1]+times[mid])/2;
  return {terms,threads,median_ms:median,min_ms:times[0],max_ms:times.at(-1),samples:samples.length,max_error:Math.max(...samples.map(s=>s.error))};
 });
 if(!rows.length) throw Error('No measurements');
 for(const row of rows){const base=rows.find(r=>r.terms===row.terms&&r.threads===0);if(!base) throw Error('Missing scalar baseline');row.speedup=base.median_ms/row.median_ms;row.efficiency=row.threads?row.speedup/row.threads:null;if(!Number.isFinite(row.speedup)||row.speedup<=0||(row.efficiency!==null&&(!Number.isFinite(row.efficiency)||row.efficiency<=0)))throw Error('Invalid derived performance ratio');}
 return {metadata,rows};
}
// Validate raw evidence before writing. Build and dev preparation call this too,
// so checked-in derived JSON can never silently override its raw measurements.
export function regenerate(root=new URL('../',import.meta.url)) {
 const raw=new URL('raw/',root);
 const data=summarize(fs.readFileSync(new URL('circle.csv',raw),'utf8'),JSON.parse(fs.readFileSync(new URL('machine.json',raw),'utf8')));
 fs.mkdirSync(new URL('data/',root),{recursive:true});
 fs.writeFileSync(new URL('data/results.json',root),JSON.stringify(data,null,2)+'\n');
 return data;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const data=regenerate();
 console.log(`Generated ${data.rows.length} measured rows`);
}
