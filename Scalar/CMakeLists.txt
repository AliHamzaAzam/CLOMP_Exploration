# Scalar/CMakeLists.txt
file(GLOB SCALAR_SOURCES *.cpp)

foreach(source_file ${SCALAR_SOURCES})
    get_filename_component(exe_name ${source_file} NAME_WE)
    add_executable(${exe_name} ${source_file})
    target_include_directories(${exe_name} PRIVATE ${OpenCV_INCLUDE_DIRS})

    if(APPLE)
        target_link_libraries(${exe_name} PRIVATE
                ${OpenCV_LIBS}
                "-framework OpenGL"
                "-framework GLUT"
        )
    else()
        target_link_libraries(${exe_name} PRIVATE
                ${OpenCV_LIBS}
                ${OPENGL_LIBRARIES}
                ${GLUT_LIBRARY}
        )
    endif()
endforeach()