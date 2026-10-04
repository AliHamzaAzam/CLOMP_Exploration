import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {summarize} from '../scripts/data.mjs';
function sandbox(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'clomp-assets-test-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 for(const dir of ['scripts','raw','data','public/raw','public/data'])fs.mkdirSync(path.join(root,dir),{recursive:true});
 for(const name of ['assets.mjs','data.mjs'])fs.copyFileSync(new URL(`../scripts/${name}`,import.meta.url),path.join(root,'scripts',name));
 for(const name of ['circle.csv','machine.json'])fs.copyFileSync(new URL(`../raw/${name}`,import.meta.url),path.join(root,'raw',name));
 fs.writeFileSync(path.join(root,'data/results.json'),'{"stale":true}\n');
 fs.writeFileSync(path.join(root,'public/data/results.json'),'{"stale":true}\n');
 return root;
}
test('build asset preparation regenerates chart and downloadable JSON from current raw evidence',t=>{
 const root=sandbox(t);
 const result=spawnSync(process.execPath,[path.join(root,'scripts/assets.mjs')],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 const expected=summarize(fs.readFileSync(path.join(root,'raw/circle.csv'),'utf8'),JSON.parse(fs.readFileSync(path.join(root,'raw/machine.json'),'utf8')));
 for(const file of ['data/results.json','public/data/results.json'])assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,file),'utf8')),expected);
 for(const file of ['circle.csv','machine.json'])assert.equal(fs.readFileSync(path.join(root,'public/raw',file),'utf8'),fs.readFileSync(path.join(root,'raw',file),'utf8'));
 const first=fs.readFileSync(path.join(root,'data/results.json'),'utf8');
 assert.equal(spawnSync(process.execPath,[path.join(root,'scripts/assets.mjs')]).status,0);
 assert.equal(fs.readFileSync(path.join(root,'data/results.json'),'utf8'),first);
});
test('invalid raw evidence fails preparation before overwriting existing chart data',t=>{
 const root=sandbox(t);
 fs.writeFileSync(path.join(root,'raw/circle.csv'),'broken');
 const result=spawnSync(process.execPath,[path.join(root,'scripts/assets.mjs')]);
 assert.notEqual(result.status,0);
 assert.equal(fs.readFileSync(path.join(root,'data/results.json'),'utf8'),'{"stale":true}\n');
 assert.equal(fs.readFileSync(path.join(root,'public/data/results.json'),'utf8'),'{"stale":true}\n');
});
