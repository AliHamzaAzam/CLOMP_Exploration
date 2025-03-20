add_library(openmp_module openmp_module.cpp openmp_module.h)
target_link_libraries(openmp_module OpenMP::OpenMP_CXX)