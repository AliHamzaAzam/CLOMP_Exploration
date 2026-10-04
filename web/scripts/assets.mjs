import fs from 'node:fs';
import {regenerate} from './data.mjs';

// Never publish a stale derived dataset, even when npm run data was skipped.
regenerate();
for(const directory of ['raw','data']) {
 fs.mkdirSync(new URL(`../public/${directory}/`,import.meta.url),{recursive:true});
}
for(const file of ['raw/circle.csv','raw/machine.json','data/results.json']) {
 fs.copyFileSync(new URL(`../${file}`,import.meta.url),new URL(`../public/${file}`,import.meta.url));
}
