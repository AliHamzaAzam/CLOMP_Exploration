#!/usr/bin/env python3
"""Headless adaptation of the repository's 360-point Taylor circle kernel."""
import argparse, hashlib, json, os, pathlib, platform, subprocess, tempfile
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--emit-harness', action='store_true', help='print C++ source without running or replacing measurements')
args = parser.parse_args()
ROOT = pathlib.Path(__file__).resolve().parents[2]
source = (ROOT / 'Scalar/CircleGeneratorScalar.cpp').read_text()
kernel = source[source.index('double taylor_cos('):source.index('void compute_circle()')]
harness = '''#include <cmath>
#include <chrono>
#include <cstdio>
#include <vector>
#include <omp.h>
''' + kernel + '''
bool validate_coordinates(const std::vector<double>& x, const std::vector<double>& y,
                          const std::vector<double>& refx, const std::vector<double>& refy, double& err) {
 err=0;
 for(int t=0;t<360;t++) {
  if(!std::isfinite(x[t]) || !std::isfinite(y[t]) || !std::isfinite(refx[t]) || !std::isfinite(refy[t])) return false;
  err=std::fmax(err,std::fmax(std::abs(x[t]-refx[t]),std::abs(y[t]-refy[t])));
 }
 return err<=1e-12;
}
int main() {
 std::vector<double> x(360), y(360), refx(360), refy(360);
 puts("terms,threads,sample,runtime_ms,max_error");
 for(int terms : {20,500,1500}) {
  for(int t=0;t<360;t++){ double a=t*M_PI/180.; refx[t]=taylor_cos(a,terms); refy[t]=taylor_sin(a,terms); }
  for(int threads : {0,1,2,4}) {
   omp_set_dynamic(0); omp_set_num_threads(threads ? threads : 1);
   int actual=1;
   #pragma omp parallel
   {
    #pragma omp single
    actual=omp_get_num_threads();
   }
   if(actual!=(threads ? threads : 1)) return 3;
   for(int sample=-1;sample<5;sample++) {
    auto begin=std::chrono::steady_clock::now();
    for(int repeat=0;repeat<100;repeat++) {
     if(threads==0) {
      for(int t=0;t<360;t++){ double a=t*M_PI/180.; x[t]=taylor_cos(a,terms); y[t]=taylor_sin(a,terms); }
     } else {
      #pragma omp parallel for simd schedule(auto)
      for(int t=0;t<360;t++){ double a=t*M_PI/180.; x[t]=taylor_cos(a,terms); y[t]=taylor_sin(a,terms); }
     }
    }
    double ms=std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-begin).count()/100.;
    double err=0;
    if(!validate_coordinates(x,y,refx,refy,err)) return 2;
    if(sample>=0) printf("%d,%d,%d,%.9f,%.12g\\n",terms,threads,sample,ms,err);
   }
  }
 }
}
'''
# Emit source for compiler-backed tests without collecting or replacing evidence.
if args.emit_harness:
    print(harness)
    raise SystemExit(0)

flags = ['-O3', '-std=c++17', '-fopenmp']
raw = ROOT / 'web/raw'
with tempfile.TemporaryDirectory() as tmp:
    cpp = pathlib.Path(tmp) / 'circle.cpp'
    binary = pathlib.Path(tmp) / 'circle'
    cpp.write_text(harness)
    subprocess.run(['g++', *flags, str(cpp), '-o', str(binary)], check=True)
    output = subprocess.check_output([str(binary)], text=True, env={**os.environ, 'OMP_PROC_BIND':'true', 'OMP_PLACES':'cores'})
    (raw/'circle.csv').write_text(output)
cpu = next((line.split(':',1)[1].strip() for line in pathlib.Path('/proc/cpuinfo').read_text().splitlines() if line.startswith('model name')), 'unknown')
quota = pathlib.Path('/sys/fs/cgroup/cpu.max')
metadata = dict(recorded_at=__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(), machine=cpu, platform=platform.platform(), logical_cpus=os.cpu_count(), cpu_quota=quota.read_text().strip() if quota.exists() else 'unknown', compiler=subprocess.check_output(['g++','--version'],text=True).splitlines()[0], flags=' '.join(flags), source_sha256=hashlib.sha256(source.encode()).hexdigest(), points=360, repeats=100, samples=5, warmups=1, affinity='OMP_PROC_BIND=true OMP_PLACES=cores', allowed_cpus=sorted(os.sched_getaffinity(0)), actual_threads_verified=[1,2,4], adaptation='Taylor functions extracted unchanged from Scalar/CircleGeneratorScalar.cpp. OpenMP uses the existing parallel for simd schedule(auto). Headless harness, steady_clock timing, 100 repetitions per sample, explicit thread counts; not the original GUI executable.')
(raw/'machine.json').write_text(json.dumps(metadata,indent=2)+'\n')
