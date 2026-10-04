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
