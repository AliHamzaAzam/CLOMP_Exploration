# Root CMakeLists.txt
cmake_minimum_required(VERSION 3.30)
project(CLOMP_Exploration)

set(CMAKE_CXX_STANDARD 23)

if(APPLE)
    # Use Homebrew's LLVM Clang for OpenMP support
    set(CMAKE_C_COMPILER "/opt/homebrew/opt/llvm/bin/clang")
    set(CMAKE_CXX_COMPILER "/opt/homebrew/opt/llvm/bin/clang++")

    # Get libomp location from Homebrew
    execute_process(
            COMMAND brew --prefix libomp
            OUTPUT_VARIABLE HOMEBREW_LIBOMP_PREFIX
            OUTPUT_STRIP_TRAILING_WHITESPACE
    )
    set(OpenMP_ROOT ${HOMEBREW_LIBOMP_PREFIX})
endif()

find_package(OpenMP REQUIRED)
find_package(OpenCV REQUIRED)
find_package(OpenGL REQUIRED)
find_package(GLUT REQUIRED)

include_directories(${OpenCV_INCLUDE_DIRS})

add_subdirectory(OpenCL)
add_subdirectory(OpenMP)
add_subdirectory(Scalar)

# Only if you have a main.cpp that needs separate building
#add_executable(CLOMP_Exploration main.cpp)
#target_link_libraries(CLOMP_Exploration PRIVATE OpenMP::OpenMP_CXX ${OpenCV_LIBS} ${OPENGL_LIBRARIES} ${GLUT_LIBRARY})
