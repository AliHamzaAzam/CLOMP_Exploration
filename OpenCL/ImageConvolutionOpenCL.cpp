//
// Created by Ali Hamza Azam on 20/03/2025.
// ID : 22I-2126
// Parallel and Distributed Computing - Assignment : 3
//

#define CL_TARGET_OPENCL_VERSION 220
#include <OpenCL/opencl.h>
#include <opencv2/opencv.hpp>
#include <iostream>
#include <filesystem>
#include <fstream>
#include <chrono>
#ifdef __APPLE__
#include <Accelerate/Accelerate.h>  // For CPU fallback on Apple
#endif

namespace fs = std::filesystem;

// Structure to hold OpenCL resources
struct OpenCLResources {
    cl_platform_id platform;
    cl_device_id device;
    cl_context context;
    cl_command_queue queue;
    cl_program program;
};

char* read_kernel_source(const char* filename) {
    FILE* file = fopen(filename, "r");
    if (!file) return nullptr;

    fseek(file, 0, SEEK_END);
    size_t length = ftell(file);
    rewind(file);

    auto* source = static_cast<char*>(malloc(length + 1));
    fread(source, 1, length, file);
    source[length] = '\0';

    fclose(file);
    return source;
}

constexpr size_t LOCAL_SIZE = 16;
constexpr int filter_size = 3;
constexpr float filter[3][3] = {{1, 0, -1},
                                {1, 0, -1},
                                {1, 0, -1}};

// Initialize OpenCL resources for a device type
OpenCLResources initialize_opencl(cl_device_type device_type) {
    cl_int err;
    OpenCLResources res;

    // Get platform
    err = clGetPlatformIDs(1, &res.platform, nullptr);
    if (err != CL_SUCCESS) {
        std::cerr << "Failed to get platform: " << err << std::endl;
        exit(EXIT_FAILURE);
    }

    // Get device
    err = clGetDeviceIDs(res.platform, device_type, 1, &res.device, nullptr);
    if (err != CL_SUCCESS) {
        std::cerr << "Failed to get " << (device_type == CL_DEVICE_TYPE_GPU ? "GPU" : "CPU") << " device: " << err << std::endl;
        exit(EXIT_FAILURE);
    }

    // Create context
    res.context = clCreateContext(nullptr, 1, &res.device, nullptr, nullptr, &err);
    if (err != CL_SUCCESS) {
        std::cerr << "Failed to create context: " << err << std::endl;
        exit(EXIT_FAILURE);
    }

    // Create command queue
    res.queue = clCreateCommandQueue(res.context, res.device, 0, &err);
    if (err != CL_SUCCESS) {
        std::cerr << "Failed to create command queue: " << err << std::endl;
        exit(EXIT_FAILURE);
    }

    // Load kernel source
    const char* kernelSource = read_kernel_source("ImageConvolution.cl");
    if (!kernelSource) {
        std::cerr << "Kernel source file not found!" << std::endl;
        exit(EXIT_FAILURE);
    }

    // Create and build program
    res.program = clCreateProgramWithSource(res.context, 1, &kernelSource, nullptr, &err);
    err = clBuildProgram(res.program, 1, &res.device, nullptr, nullptr, nullptr);

    if (err != CL_SUCCESS) {
        size_t log_size;
        clGetProgramBuildInfo(res.program, res.device, CL_PROGRAM_BUILD_LOG, 0, nullptr, &log_size);
        std::vector<char> buildLog(log_size+1);
        clGetProgramBuildInfo(res.program, res.device, CL_PROGRAM_BUILD_LOG, log_size, buildLog.data(), nullptr);
        buildLog[log_size] = '\0';
        std::cerr << "Error building program:\n" << buildLog.data() << std::endl;
        exit(1);
    }

    free((void*)kernelSource);
    return res;
}

// Cleanup OpenCL resources
void cleanup_opencl(OpenCLResources& res) {
    clReleaseProgram(res.program);
    clReleaseCommandQueue(res.queue);
    clReleaseContext(res.context);
}

bool is_image_file(const std::string& filename) {
    // Convert to lowercase for case-insensitive comparison
    std::string lower_filename = filename;
    std::transform(lower_filename.begin(), lower_filename.end(), lower_filename.begin(),
                   [](unsigned char c) { return std::tolower(c); });

    // Common image extensions
    static const std::vector<std::string> extensions = {
        ".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".gif"
    };

    for (const auto& ext : extensions) {
        if (lower_filename.size() >= ext.size() &&
            lower_filename.compare(lower_filename.size() - ext.size(), ext.size(), ext) == 0) {
            return true;
            }
    }

    return false;
}

void read_image(const std::string& file_path, float*& image, int& width, int& height) {
    // Check if file exists first
    if (!std::filesystem::exists(file_path)) {
        std::cerr << "Error: File does not exist: " << file_path << std::endl;
        exit(1);
    }

    cv::Mat img = cv::imread(file_path, cv::IMREAD_GRAYSCALE);
    if (img.empty()) {
        std::cerr << "Error: Failed to load image: " << file_path << std::endl;
        // Common causes: unsupported format, corrupted file, or missing codec
        exit(1);
    }

    width = img.cols;
    height = img.rows;
    image = new float[width * height];
    img.convertTo(img, CV_32F);
    img /= 255.0;
    std::memcpy(image, img.data, width * height * sizeof(float));
}

void write_image(const std::string& file_path, const float* image, int width, int height) {
    cv::Mat img(height, width, CV_32F, const_cast<float*>(image));
    img *= 255.0;
    img.convertTo(img, CV_8U);
    cv::imwrite(file_path, img);
}

// Process image using OpenCL with specified device
void process_image(OpenCLResources& res, float* input_image, float* output_image, int width, int height, double& time, bool is_gpu) {
    cl_int err;

    // Flatten the filter array
    float filter_flat[filter_size * filter_size];
    for (int i = 0; i < filter_size; i++) {
        for (int j = 0; j < filter_size; j++) {
            filter_flat[i * filter_size + j] = filter[i][j];
        }
    }

    // Create memory buffers
    cl_mem input_image_buffer = clCreateBuffer(res.context, CL_MEM_READ_ONLY, width * height * sizeof(float), nullptr, &err);
    cl_mem output_image_buffer = clCreateBuffer(res.context, CL_MEM_WRITE_ONLY, width * height * sizeof(float), nullptr, &err);
    cl_mem filter_buffer = clCreateBuffer(res.context, CL_MEM_READ_ONLY, filter_size * filter_size * sizeof(float), nullptr, &err);

    // Copy data to device
    clEnqueueWriteBuffer(res.queue, input_image_buffer, CL_TRUE, 0, width * height * sizeof(float), input_image, 0, nullptr, nullptr);
    clEnqueueWriteBuffer(res.queue, filter_buffer, CL_TRUE, 0, filter_size * filter_size * sizeof(float), filter_flat, 0, nullptr, nullptr);

    // Create kernel
    cl_kernel kernel = clCreateKernel(res.program, "convolution", &err);

    // Set kernel arguments
    clSetKernelArg(kernel, 0, sizeof(cl_mem), &input_image_buffer);
    clSetKernelArg(kernel, 1, sizeof(cl_mem), &output_image_buffer);
    clSetKernelArg(kernel, 2, sizeof(cl_mem), &filter_buffer);
    clSetKernelArg(kernel, 3, sizeof(int), &width);
    clSetKernelArg(kernel, 4, sizeof(int), &height);
    clSetKernelArg(kernel, 5, sizeof(int), &filter_size);

    // Define work sizes
    size_t globalSize[2] = {static_cast<size_t>(width), static_cast<size_t>(height)};
    size_t localSize[2] = {LOCAL_SIZE, LOCAL_SIZE};

    // Execute kernel
    auto start = std::chrono::high_resolution_clock::now();
    if (is_gpu) {
        err = clEnqueueNDRangeKernel(res.queue, kernel, 2, nullptr, globalSize, localSize, 0, nullptr, nullptr);
    } else {
        // CPU may not support the same local size, so use NULL
        err = clEnqueueNDRangeKernel(res.queue, kernel, 2, nullptr, globalSize, nullptr, 0, nullptr, nullptr);
    }

    if (err != CL_SUCCESS) {
        std::cerr << "Failed to execute kernel: " << err << std::endl;
        exit(EXIT_FAILURE);
    }

    clFinish(res.queue);
    auto end = std::chrono::high_resolution_clock::now();

    time = std::chrono::duration<double, std::milli>(end - start).count();

    // Read results back
    clEnqueueReadBuffer(res.queue, output_image_buffer, CL_TRUE, 0, width * height * sizeof(float), output_image, 0, nullptr, nullptr);

    // Cleanup
    clReleaseMemObject(input_image_buffer);
    clReleaseMemObject(output_image_buffer);
    clReleaseMemObject(filter_buffer);
    clReleaseKernel(kernel);
}

#ifdef __APPLE__
double cpu_convolution(const float* input, float* output, int width, int height) {
    // Use Accelerate framework for optimized CPU convolution
    auto start = std::chrono::high_resolution_clock::now();
    vImage_Buffer src = { const_cast<float*>(input), static_cast<vImagePixelCount>(height),
                  static_cast<vImagePixelCount>(width), static_cast<vImagePixelCount>(width)*sizeof(float) };
    vImage_Buffer dest = { output, static_cast<vImagePixelCount>(height),
                  static_cast<vImagePixelCount>(width), static_cast<vImagePixelCount>(width)*sizeof(float) };

    float kernel[9] = {1, 0, -1, 1, 0, -1, 1, 0, -1};

    // Allocate a temporary buffer first
    void* tempBuffer = nullptr;
    size_t tempBufferSize = vImageConvolve_PlanarF(&src, &dest, nullptr, 0, 0, kernel, 3, 3, 0, kvImageGetTempBufferSize);
    if (tempBufferSize > 0) {
        tempBuffer = malloc(tempBufferSize);
    }

    // Use edge extension for handling image boundaries
    vImage_Error err = vImageConvolve_PlanarF(&src, &dest, tempBuffer, 0, 0, kernel, 3, 3, 0, kvImageEdgeExtend);

    // Free temporary buffer
    if (tempBuffer) free(tempBuffer);

    if (err != kvImageNoError) {
        std::cerr << "vImage error: " << err << std::endl;
    }
    auto end = std::chrono::high_resolution_clock::now();
    return std::chrono::duration<double, std::milli>(end - start).count();
}
#else
double cpu_convolution(const float* input, float* output, int width, int height) {
    auto start = std::chrono::high_resolution_clock::now();
    #pragma omp parallel for
    for (int i = 1; i < height - 1; ++i) {
        #pragma omp parallel for
        for (int j = 1; j < width - 1; ++j) {
            float sum = 0.0f;
            for (int k = -1; k <= 1; ++k) {
                for (int l = -1; l <= 1; ++l) {
                    sum += input[(i + k) * width + (j + l)] * filter[k + 1][l + 1];
                }
            }
            output[i * width + j] = sum;
        }
    }
    auto end = std::chrono::high_resolution_clock::now();
    return std::chrono::duration<double, std::milli>(end - start).count();
}
#endif

int main(int argc, char** argv) {
    if (argc != 2) {
        std::cerr << "Usage: " << argv[0] << " <folder_path>" << std::endl;
        return 1;
    }

    std::string folder_path = argv[1];
    std::ofstream csv_file("output/results.csv");
    csv_file << "Image,Width,Height,GPU_Time(ms),CPU_Time(ms)\n";
    // csv_file << "Image,Width,Height,GPU_Time(ms)\n";

    // Initialize OpenCL for GPU and CPU
    OpenCLResources gpu_resources;
    // OpenCLResources cpu_resources;
    try {
        gpu_resources = initialize_opencl(CL_DEVICE_TYPE_GPU);
        // cpu_resources = initialize_opencl(CL_DEVICE_TYPE_CPU);
    } catch (const std::exception& e) {
        std::cerr << "Failed to initialize OpenCL: " << e.what() << std::endl;
        return 1;
    }

    fs::create_directory("output");
    for (const auto& entry : fs::directory_iterator(folder_path)) {
        if (entry.is_regular_file()) {
            std::string filename = entry.path().filename().string();

            // Skip hidden files and non-image files
            if (filename[0] == '.' || !is_image_file(filename)) {
                continue;
            }

            float* input_image = nullptr;
            int width, height;
            read_image(entry.path().string(), input_image, width, height);

            // Process with GPU
            auto* gpu_output = new float[width * height];
            double gpu_time = 0.0;
            process_image(gpu_resources, input_image, gpu_output, width, height, gpu_time, true);

            // Process with CPU
            auto* cpu_output = new float[width * height];
            double cpu_time = 0.0;
            cpu_time = cpu_convolution(input_image, cpu_output, width, height);
            // process_image(cpu_resources, input_image, cpu_output, width, height, cpu_time, false);

            // Save output image (use GPU result)
            std::string output_file = "output/" + filename;
            write_image(output_file, gpu_output, width, height);

            // Record results
            csv_file << filename << "," << width << "," << height << "," << gpu_time << "," << cpu_time << "\n";
            // csv_file << filename << "," << width << "," << height << "," << gpu_time << ",\n";
            delete[] input_image;
            delete[] gpu_output;
            delete[] cpu_output;
        }
    }

    cleanup_opencl(gpu_resources);
    // cleanup_opencl(cpu_resources);

    csv_file.close();
    return 0;
}
