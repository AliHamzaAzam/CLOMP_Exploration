import fs from 'node:fs';
for(const dir of ['raw','data']) { fs.mkdirSync(new URL(`../public/${dir}/`,import.meta.url),{recursive:true}); for(const file of fs.readdirSync(new URL(`../${dir}/`,import.meta.url))) fs.copyFileSync(new URL(`../${dir}/${file}`,import.meta.url),new URL(`../public/${dir}/${file}`,import.meta.url)); }
