import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

test('GCC harness accepts finite coordinates and rejects non-finite or mismatched output',()=>{
 const root=fileURLToPath(new URL('../',import.meta.url));
 const evidence=['raw/circle.csv','raw/machine.json','data/results.json'];
 const before=evidence.map(path=>readFileSync(join(root,path),'utf8'));
 const tmp=mkdtempSync(join(tmpdir(),'clomp-validation-'));
 try {
  const harness=execFileSync('python3',[join(root,'scripts/benchmark.py'),'--emit-harness'],{encoding:'utf8'});
  const source=harness.replace('int main() {','int benchmark_main() {')+`
#include <limits>
#include <cstdlib>
int main(int argc, char** argv) {
 const int scenario=std::atoi(argv[1]);
 std::vector<double> x(360,1.0), y(360,2.0), refx=x, refy=y;
 double error=0;
 const double nan=std::numeric_limits<double>::quiet_NaN();
 const double inf=std::numeric_limits<double>::infinity();
 switch(scenario) {
  case 1: x[10]=nan; break;
  case 2: y[10]=nan; break;
  case 3: refx[10]=nan; break;
  case 4: refy[10]=nan; break;
  case 5: x[10]=inf; break;
  case 6: y[10]=inf; break;
  case 7: refx[10]=inf; break;
  case 8: refy[10]=inf; break;
  case 9: x[10]=refx[10]=inf; break;
  case 10: x[10]=1.1; break;
  case 11: x[10]+=5e-13; break;
 }
 return validate_coordinates(x,y,refx,refy,error) ? 0 : 2;
}
`;
  const cpp=join(tmp,'validation.cpp'),binary=join(tmp,'validation');writeFileSync(cpp,source);
  execFileSync('g++',['-O3','-std=c++17','-fopenmp',cpp,'-o',binary],{stdio:'pipe'});
  for(let scenario=0;scenario<=11;scenario++){
   const result=spawnSync(binary,[String(scenario)]);
   assert.equal(result.status,[0,11].includes(scenario)?0:2,`coordinate scenario ${scenario}`);
  }
 } finally {rmSync(tmp,{recursive:true,force:true});}
 assert.deepEqual(evidence.map(path=>readFileSync(join(root,path),'utf8')),before,'validation must preserve recorded evidence');
});

test('benchmark rejects unknown options instead of silently accepting a mistyped command',()=>{
 const script=fileURLToPath(new URL('../scripts/benchmark.py',import.meta.url));
 const result=spawnSync('python3',[script,'--emit-harness','--not-a-supported-option'],{encoding:'utf8'});
 assert.equal(result.status,2);
 assert.match(result.stderr,/unrecognized arguments/);
 assert.equal(result.stdout,'');
});

test('emitted harness produces all sample groups and converts milliseconds per repetition correctly',()=>{
 const root=fileURLToPath(new URL('../',import.meta.url));
 const evidence=['raw/circle.csv','raw/machine.json','data/results.json'];
 const before=evidence.map(path=>readFileSync(join(root,path),'utf8'));
 const tmp=mkdtempSync(join(tmpdir(),'clomp-clock-'));
 try {
  const harness=execFileSync('python3',[join(root,'scripts/benchmark.py'),'--emit-harness'],{encoding:'utf8'});
  // A deterministic 100 ms interval must report 1 ms per repetition.
  // Two real kernel repetitions keep this validation cheap; the production
  // denominator and emitted output path are deliberately unchanged.
  const clock=`
struct test_clock {
 static std::chrono::steady_clock::time_point now() {
  static int calls=0;
  return std::chrono::steady_clock::time_point(std::chrono::milliseconds(100*calls++));
 }
};
`;
  const source=harness.replace('int main() {',clock+'int main() {').replaceAll('std::chrono::steady_clock::now()','test_clock::now()').replace('repeat<100','repeat<2');
  const cpp=join(tmp,'clock.cpp'),binary=join(tmp,'clock');writeFileSync(cpp,source);
  execFileSync('g++',['-O3','-std=c++17','-fopenmp',cpp,'-o',binary],{stdio:'pipe'});
  const output=execFileSync(binary,[],{encoding:'utf8',env:{...process.env,OMP_PROC_BIND:'true',OMP_PLACES:'cores'}}).trim().split('\n');
  assert.equal(output.shift(),'terms,threads,sample,runtime_ms,max_error');
  assert.equal(output.length,60);
  const seen=new Set();
  for(const line of output){
   const [terms,threads,sample,runtime,error]=line.split(',').map(Number);
   assert.ok([20,500,1500].includes(terms));assert.ok([0,1,2,4].includes(threads));
   assert.ok(Number.isInteger(sample)&&sample>=0&&sample<5);
   assert.equal(runtime,1);assert.equal(error,0);
   const key=`${terms}/${threads}/${sample}`;assert.ok(!seen.has(key));seen.add(key);
  }
 } finally {rmSync(tmp,{recursive:true,force:true});}
 assert.deepEqual(evidence.map(path=>readFileSync(join(root,path),'utf8')),before,'clock test must preserve recorded measurements');
});
