add_library(opencl_module opencl_module.cpp opencl_module.h)

find_package(OpenCL REQUIRED)
target_include_directories(opencl_module PUBLIC ${OpenCL_INCLUDE_DIRS})
target_link_libraries(opencl_module ${OpenCL_LIBRARIES})