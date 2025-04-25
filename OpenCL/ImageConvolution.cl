// Kernel for image convolution
__kernel void convolution(
    __global const float* input,
    __global float* output,
    __constant const float* filter,
    const int width,
    const int height,
    const int filter_size
) {
    int y = get_global_id(0);
    int x = get_global_id(1);

    if (x >= width || y >= height) return;

    float sum = 0.0f;
    int half_filter = filter_size / 2;

    for (int i = 0; i < filter_size; i++) {
        for (int j = 0; j < filter_size; j++) {
            int image_y = y + i - half_filter; // i affects y (row)
            int image_x = x + j - half_filter; // j affects x (column)

            if (image_x >= 0 && image_x < width && image_y >= 0 && image_y < height) {
                sum += input[image_y * width + image_x] * filter[i * filter_size + j];
            }
        }
    }

    output[y * width + x] = sum;
}