//
// Created by Ali Hamza Azam on 20/03/2025.
// ID : 22I-2126
// Parallel and Distributed Computing - Assignment : 3
//

#include <chrono>
#include <iostream>
#include <opencv2/opencv.hpp>
#include <fstream>
#include <filesystem>
namespace fs = std::filesystem;

constexpr int filter_size = 3;
constexpr float filter[3][3] = {{1, 0, -1},
                                {1, 0, -1},
                                {1, 0, -1}};



void read_image(const std::string& file_path, float*& image, int& width, int& height) {
    cv::Mat img = cv::imread(file_path, cv::IMREAD_GRAYSCALE);
    if (img.empty()) {
        perror("Error reading image");
    }

    // Convert image to float
    img.convertTo(img, CV_32F);

    // Normalize image
    img /= 255.0;

    width = img.cols;
    height = img.rows;
    image = static_cast<float*>(malloc(width * height * sizeof(float)));

    // Copy image data to output array
    std::memcpy(image, img.data, img.total() * sizeof(float));


}

void write_image(const std::string& file_path, const float* image, const int width, const int height) {
    cv::Mat img(height, width, CV_32F, const_cast<float*>(image));

    // Normalize image
    img *= 255.0;

    // Convert image to 8-bit unsigned integer
    img.convertTo(img, CV_8U);

    // Write image to file
    cv::imwrite(file_path, img);
}



void convolution(
    const float* input,
    float* output,
    const float* filter,
    const int width,
    const int height,
    const int filter_size
) {
    for (int i = 0; i < height; i++) {
        for (int j = 0; j < width; j++) {
            float sum = 0;
            for (int k = 0; k < filter_size; k++) {
                for (int l = 0; l < filter_size; l++) {
                    int ii = i + k - filter_size / 2;
                    int jj = j + l - filter_size / 2;
                    if (ii >= 0 && ii < height && jj >= 0 && jj < width) {
                        sum += input[ii * width + jj] * filter[k * filter_size + l];
                    }
                }
            }
            output[i * width + j] = sum;
        }
    }
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


int main(int argc, char** argv) {
    if (argc != 2) {
        std::cerr << "Usage: " << argv[0] << " <folder_path>" << std::endl;
        return 1;
    }

    std::string folder_path = argv[1];
    fs::create_directory("output");
    std::ofstream csv_file("output/results.csv");

    if (!csv_file.is_open()) {
        std::cerr << "Failed to open output/results.csv" << std::endl;
        return 1;
    }

    csv_file << "Image,Width,Height,GPU_Time(ms),Scalar_CPU_Time(ms)\n";

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

            auto start = std::chrono::high_resolution_clock::now();
            float* output_image = new float[width * height];
            convolution(input_image, output_image, filter[0], width, height, filter_size);
            auto end = std::chrono::high_resolution_clock::now();
            double cpu_time = std::chrono::duration<double, std::milli>(end - start).count();

            // Record results
            csv_file << filename << "," << width << "," << height << "," << "," << cpu_time << "\n";
            write_image("output/scalar_" + filename, output_image, width, height);

            free(input_image);
            delete[] output_image;
        }
    }
    csv_file.close();
    return 0;
}