cmake_minimum_required(VERSION 3.30)
project(CLOMP_Exploration)

set(CMAKE_CXX_STANDARD 23)

if(APPLE)
    set(CMAKE_C_COMPILER "/usr/bin/clang")
    set(CMAKE_CXX_COMPILER "/usr/bin/clang++")

    # Add OpenMP flags specifically for macOS
    set(OpenMP_C_FLAGS "-Xpreprocessor -fopenmp")
    set(OpenMP_CXX_FLAGS "-Xpreprocessor -fopenmp")
    set(OpenMP_C_LIB_NAMES "omp")
    set(OpenMP_CXX_LIB_NAMES "omp")
    set(OpenMP_omp_LIBRARY "/opt/homebrew/lib/libomp.dylib")

    # For Apple Silicon (M1/M2/M3), use this path
    if(CMAKE_SYSTEM_PROCESSOR MATCHES "arm64")
        set(OpenMP_omp_LIBRARY "/opt/homebrew/lib/libomp.dylib")
    else()
        # For Intel-based Macs
        set(OpenMP_omp_LIBRARY "/usr/local/lib/libomp.dylib")
    endif()
endif()

# Enable OpenMP
find_package(OpenMP REQUIRED)

# Add Subdirectories
add_subdirectory(OpenCL)
add_subdirectory(OpenMP)

add_executable(CLOMP_Exploration main.cpp)
target_link_libraries(CLOMP_Exploration opencl_module openmp_module OpenMP::OpenMP_CXX)