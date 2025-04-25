//
// Created by Ali Hamza Azam on 20/03/2025.
// ID : 22I-2126
// Parallel and Distributed Computing - Assignment : 3
//

#define GL_SILENCE_DEPRECATION

#define _USE_MATH_DEFINES
#include <cmath>
#include <cstring>
#include <chrono>
#include <iostream>
#include <OpenGL/gl.h>
#include <GLUT/glut.h>
#include <omp.h>

int NUM_POINTS = 360, NUM_TERMS = 750;
double *x_values, *y_values;
double radius = 1, x_origin = 0, y_origin = 0;


// double taylor_sin(double x, int n) {
//     double sum = 0.0;
//     #pragma omp parallel for reduction(+:sum) schedule(dynamic)
//     for (int i = 0; i < n; i++) {
//         // Power function
//         double pow_value = 0;
//         #pragma omp parallel for reduction(+:pow_value) schedule(dynamic)
//         for (int j = 0; j <= 2 * i + 1; j++) {
//             pow_value += x;
//         }
//
//         // Gamma function
//         double gamma_value = 1;
//         #pragma omp parallel for reduction(*:gamma_value) schedule(dynamic)
//         for (int j = 1; j <= 2 * i + 1; j++) {
//             gamma_value *= j;
//         }
//
//         sum += pow(-1, i) * pow_value / gamma_value;
//     }
//     return sum;
// }
//
// double taylor_cos(double x, int n) {
//     double sum = 0.0;
//     #pragma omp parallel for reduction(+:sum) schedule(static, 4)
//     for (int i = 0; i < n; i++) {
//         // Power function
//         double pow_value = 0;
//         #pragma omp parallel for reduction(+:pow_value) schedule(dynamic)
//         for (int j = 0; j <= 2 * i + 1; j++) {
//             pow_value += x;
//         }
//
//         // Gamma function
//         double gamma_value = 1;
//         #pragma omp parallel for reduction(*:gamma_value) schedule(dynamic)
//         for (int j = 1; j <= 2 * i + 1; j++) {
//             gamma_value *= j;
//         }
//
//         pow_value *= x;
//         sum += pow(-1, i) * pow_value / gamma_value;
//     }
//     return sum;
// }

double taylor_cos(double x, int n) {
    double sum = 1;
    double term = 1;
    // #pragma omp parallel for reduction(+:sum) schedule(dynamic)
    for (int i = 1; i < n; i++) {
        term *= -x * x / (2 * i * (2 * i - 1));
        sum += term;
    }
    return sum;
}

double taylor_sin(double x, int n) {
    double sum = x;
    double term = x;
    // #pragma omp parallel for reduction(+:sum) schedule(dynamic)
    for (int i = 1; i < n; i++) {
        term *= -x * x / (2 * i * (2 * i + 1));
        sum += term;
    }
    return sum;
}

void compute_circle() {
    #pragma omp parallel for simd schedule(auto)
    for (int t = 0; t < 360; t++) {
        const double angle = t * M_PI / 180.0;
        x_values[t] = radius * taylor_cos(angle, NUM_TERMS) + x_origin;
        y_values[t] = radius * taylor_sin(angle, NUM_TERMS) + y_origin;
    }
}

void draw_circle() {
    glBegin(GL_LINE_LOOP);
    for (int t = 0; t < 360; t++) {
        glVertex2f(x_values[t], y_values[t]);
    }
    glEnd();
}

void display() {
    glClear(GL_COLOR_BUFFER_BIT);
    glColor3f(1.0, 1.0, 1.0);
    draw_circle();
    glFlush();
}

int main(int argc, char** argv) {
    // argv[0] = NUM_POINTS, argv[1] = NUM_TERMS, argv[2] = radius, argv[3] = x_origin, argv[4] = y_origin, argv[5] = draw_circle
    if (argc > 1) {
        NUM_POINTS = atoi(argv[1]);
        NUM_TERMS = atoi(argv[2]);
        radius = atof(argv[3]);
        x_origin = atof(argv[4]);
        y_origin = atof(argv[5]);
        x_values = new double[NUM_POINTS];
        y_values = new double[NUM_POINTS];
    } else {
        std::cerr << "Usage: circleGeneratorScalar NUM_POINTS NUM_TERMS radius x_origin y_origin draw_circle\n";
    }
    omp_set_num_threads(omp_get_max_threads());
    const auto start = omp_get_wtime();
    compute_circle();
    const auto end = omp_get_wtime();
    std::cout << "Execution Time: " << std::chrono::duration<double, std::milli>(end - start).count() << "ms\n";

    if (argc > 6) {
        if (strcmp(argv[6], "draw_circle") == 0) {
            glutInit(&argc, argv);
            glutInitDisplayMode(GLUT_SINGLE | GLUT_RGB);
            glutInitWindowSize(500, 500);
            glutInitWindowPosition(100, 100);
            glutCreateWindow("Taylor Series Circle");

            glClearColor(0.0, 0.0, 0.0, 0.0);
            glMatrixMode(GL_PROJECTION);
            glLoadIdentity();
            glOrtho(-1.5, 1.5, -1.5, 1.5, -1.0, 1.0);

            glutDisplayFunc(display);
            glutMainLoop();
        }
    }
    return 0;
}