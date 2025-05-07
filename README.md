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