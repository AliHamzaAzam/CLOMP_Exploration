# CLOMP-Exploration

A comparative exploration of sequential (Scalar), OpenMP, and OpenCL implementations for two computational tasks:

1. **Circle Generation**: Compute and benchmark the time to evaluate a large number of points against a circle equation.
2. **Image Convolution**: Apply a convolution filter to images using CPU (scalar), multi-threaded (OpenMP), and GPU/OpenCL approaches.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Building the Project](#building-the-project)
- [Running Executables](#running-executables)
  - [Scalar](#scalar)
  - [OpenMP](#openmp)
  - [OpenCL](#opencl)
- [Scripts & Results](#scripts--results)
- [Contributing](#contributing)
- [License](#license)

---

## Prerequisites

- CMake ≥ 3.30
- C++23 compiler (Clang/GCC)
- OpenCV
- OpenGL & GLUT
- OpenMP library
- OpenCL headers & drivers
- On macOS: Homebrew LLVM for OpenMP (`brew install llvm libomp`)

---

## Project Structure

```plaintext
CLOMP-Exploration/
├── OpenCL/               # OpenCL convolution implementation
├── OpenMP/               # OpenMP circle generator
├── Scalar/               # Sequential (scalar) implementations
├── scripts/              # Helper scripts for running tests & plotting
├── Results/              # Generated CSVs and plot images
├── CMakeLists.txt        # Top-level build configuration
└── README.md             # Project overview and instructions
```

---

## Building the Project

```bash
mkdir -p cmake-build-debug && cd cmake-build-debug
cmake ..
cmake --build .
```

This will compile three sub-projects:
- Scalar implementations
- OpenMP circle generator
- OpenCL image convolution

---

## Running Executables

### Scalar

```bash
./Scalar/CircleGeneratorScalar <num_points> <num_terms>
```

### OpenMP

Use the provided script to benchmark and log results:

```bash
scripts/run_circle.sh ./OpenMP/CircleGeneratorOpenMP <num_points> <num_terms>
```

Results are saved to `Results/CircleGeneratorResults.csv` and plotted by `scripts/plot_circle.py`.

### OpenCL

Process a folder of images:

```bash
./OpenCL/ImageConvolutionOpenCL <input_folder>
```

Outputs convolved images to `OpenCL/output/` and logs `ImageConvolutionResults.csv`.

Plots for image benchmarks can be generated with:

```bash
scripts/plot_image.py
```

---

## Scripts & Results

- **scripts/run_circle.sh**: Automate runs and average timing for circle generation.
- **scripts/plot_circle.py**: Plot execution time and speedup for OpenMP vs. scalar.
- **scripts/plot_image.py**: Visualize convolution timings and speedups.
- **Results/**: Contains CSV data and generated plots.

---

## Contributing

Contributions are welcome! Please fork the repository and open a pull request with improvements or new benchmarks.

---

## License

This project is released under the MIT License.

## Results site

`web/` is a static Vite + vanilla TypeScript notebook for the scalar and OpenMP circle kernels. No historical results, logs, CSVs or PDFs were present in the baseline checkout. The included observations are newly recorded headless cloud measurements, not original GUI application timings. OpenCL convolution and MPI performance are unmeasured; this repository contains no MPI implementation.

Requires Node.js 20.19+ or 22.12+ and npm. The full test suite also requires Python 3 and GCC with OpenMP for its compiler-backed benchmark validation.

```bash
cd web
npm ci --ignore-scripts
npm run data        # regenerate data/results.json from checked-in raw evidence
npm run dev         # local development
npm run typecheck
npm test
npm run build
npm run preview     # http://localhost:4173
# Separately, after building (no preview server needed):
npm run test:browser
```

The browser check uses the existing Chromium and Playwright in the authorized cloud environment. Elsewhere set `CHROME_PATH` and `PLAYWRIGHT_PATH` to existing installations; no browser downloads are performed. It serves the production build at a nested `/results/` path and checks 320px, 390px and 1280px layouts, every workload against the recorded chart and table values, byte-exact evidence downloads, navigation, uncaught errors and horizontal overflow. Screenshots are saved as `/tmp/clomp-c11-final-<width>.png`.

To replace the observations with your own run, use `npm run benchmark` (Python 3 and GCC with OpenMP required). This extracts the unchanged Taylor sine/cosine functions from the scalar source, uses the existing OpenMP `parallel for simd schedule(auto)` strategy, and records raw CSV plus machine/compiler/flags/quota/affinity/source hash in `web/raw/`. It preserves the original loop's **360 points**, regardless of the original program's allocation parameter. The portable harness removes OpenGL rendering, uses `steady_clock`, explicit 1/2/4 thread teams, one warm-up and five timed samples of 100 repetitions each. It verifies the actual OpenMP team sizes and scalar/parallel coordinate agreement within 1e-12. Each displayed runtime is a per-repetition median; the table exposes sample ranges. Source programs remain unchanged.

`npm run data` validates experiment metadata, the complete workload/thread matrix, nonempty numeric values, positive timings, sample counts, duplicate samples, scalar baselines and coordinate checks before writing JSON. Speedup is matched scalar median divided by OpenMP median, and efficiency is speedup divided by team size. Shared cloud scheduling, CPU quota, affinity and tiny workloads limit generalization. Fresh benchmark runs intentionally replace the committed evidence; commit raw and generated JSON together. The static build copies the evidence into its output for direct download.

The native application's build is separate. Its CMake, OpenCV, OpenGL/GLUT and OpenCL prerequisites are not installed by the results site workflow.

### Why measurements work while the native build is blocked

The recorded 60 CSV rows are **3 term counts (20, 500, 1500) × 4 modes (scalar, OpenMP 1/2/4 threads) × 5 samples**. Each sample is 100 calls after an untimed 100-call warmup. The harness divides the steady-clock interval in milliseconds by 100, so `runtime_ms` means milliseconds per 360-point circle, not milliseconds for the whole batch. The summary takes the median of the five per-call timings and shows their minimum and maximum. Speedup uses only the scalar median from the same term count; efficiency divides that speedup by the OpenMP team size. No original executable, GPU result or other attempt's result enters that baseline.

Python extracts the scalar Taylor functions into a temporary, graphics-free C++ harness and invokes the already-installed `g++ -O3 -std=c++17 -fopenmp` directly. This requires GCC/libgomp, not CMake, OpenCV, GLUT or OpenCL. It preserves the arithmetic, 360-point loop, radius 1, origin (0, 0), and OpenMP strategy, but replaces allocation, timing and rendering plumbing. The native project instead requests C++23 and links graphics/image dependencies. Passing these direct compiler checks therefore validates the headless experiment only. The committed metadata identifies the exact scalar source hash, compiler, flags and machine. Raw output records elapsed times and maximum coordinate differences, not complete coordinate arrays. Current compiler-backed tests verify finite coordinates for all configurations; the original recorded zero-error fields alone are not a retrospective finiteness proof. GCC 14.2 assembly inspection retained both sets of 100 repetitions; this is not a guarantee about every other compiler. Workloads and modes ran in a fixed order, so thermal/scheduling drift can bias comparisons. The harness forces `OMP_PROC_BIND=true` and `OMP_PLACES=cores`, disables dynamic teams and verifies actual team sizes, but other inherited OpenMP runtime settings (such as wait/spin policy) were not recorded. Their historical values cannot be reconstructed from these files.

The original CMake files register no `add_test`/CTest suite. `npm test` is the complete added data/harness test suite; `npm run test:browser` checks the built site, including keyboard selection, keyboard scrolling of the mobile table, navigation and exact chart/download content. Both `npm run build` and `npm run dev` regenerate evidence from raw input first, preventing stale JSON; empty, malformed or incomplete input fails before the site is built. Reordering valid CSV rows produces the same JSON bytes.

### Native validation prerequisites requiring approval

No additional software was installed during the follow-up review. This cloud environment is Debian 13. GCC 14.2, GNU Make, `build-essential`, `libgomp1`, and the OpenCL loader runtime are already present. CMake and the required development packages are absent. A proposed installation, **not executed and requiring approval**, is:

```bash
apt-get update
apt-get install --no-install-recommends cmake libopencv-dev libgl-dev libopengl-dev libglut-dev ocl-icd-opencl-dev
```

The repository requires CMake >= 3.30; Debian 13's [CMake package](https://packages.debian.org/trixie/cmake) is 3.31.6. The remaining packages supply [OpenCV development files](https://packages.debian.org/trixie/libopencv-dev), [GL](https://packages.debian.org/trixie/libgl-dev) and [OpenGL development files](https://packages.debian.org/trixie/libopengl-dev), [GLUT](https://packages.debian.org/trixie/libglut-dev), and [OpenCL development files and headers](https://packages.debian.org/trixie/ocl-icd-opencl-dev). Installing them is not sufficient by itself: the original sources unconditionally include macOS paths `<OpenGL/gl.h>`, `<GLUT/glut.h>` and `<OpenCL/opencl.h>`. A separately reviewed Linux portability change must use the corresponding Linux headers (`<GL/gl.h>`, `<GL/glut.h>`, `<CL/opencl.h>`) and address any further build errors. This results-site PR does not modify those programs.

After approved dependencies and portability fixes, the initial checks would be:

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel 2
ctest --test-dir build --output-on-failure --no-tests=error
```

The final command must not be mistaken for passing tests when no native tests are registered. Native correctness tests still need to be defined for these programs. Executing OpenCL also requires an installed device implementation and accessible hardware; the loader alone is insufficient. [PoCL](https://packages.debian.org/trixie/pocl-opencl-icd) could support separately approved CPU-only checks, but it would not validate GPU performance. Full GUI checks need a display/OpenGL context. None of these checks, installations or native portability changes are claimed complete here.

Observed blockers: `cmake -S . -B /tmp/clomp-c11-native-check` exits 127 (`cmake: command not found`); `g++ -std=c++23 -fsyntax-only Scalar/CircleGeneratorScalar.cpp` exits 1 (`OpenGL/gl.h: No such file or directory`).
