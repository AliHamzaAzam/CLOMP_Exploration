if(APPLE)
    # macOS Framework configuration
    set(OpenCL_FOUND TRUE)
    # Add Accelerate framework for vImage functions
    find_library(ACCELERATE_LIBRARY Accelerate REQUIRED)
else()
    find_package(OpenCL REQUIRED)
endif()

# Copy kernel files to the build directory
file(GLOB KERNEL_FILES *.cl)
foreach(KERNEL_FILE ${KERNEL_FILES})
    get_filename_component(KERNEL_NAME ${KERNEL_FILE} NAME)
    configure_file(${KERNEL_FILE} ${CMAKE_CURRENT_BINARY_DIR}/${KERNEL_NAME} COPYONLY)
endforeach()

# Add executables
file(GLOB OPENCL_SOURCES *.cpp)
foreach(source_file ${OPENCL_SOURCES})
    get_filename_component(exe_name ${source_file} NAME_WE)
    add_executable(${exe_name} ${source_file} ${KERNEL_FILES})

    if(APPLE)
        # macOS Framework configuration
        target_link_options(${exe_name} PRIVATE -framework OpenCL)
        target_link_libraries(${exe_name} PRIVATE ${ACCELERATE_LIBRARY})
        target_compile_options(${exe_name} PRIVATE -Wno-deprecated-declarations)
    else()
        # Linux/Windows configuration
        target_include_directories(${exe_name} PRIVATE ${OpenCL_INCLUDE_DIRS})
        target_link_libraries(${exe_name} PRIVATE ${OpenCL_LIBRARIES})
    endif()

    target_include_directories(${exe_name} PRIVATE ${OpenCV_INCLUDE_DIRS})
    target_link_libraries(${exe_name} PRIVATE ${OpenCV_LIBS})
endforeach()