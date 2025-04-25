#!/bin/bash

# Define source files and executables
SOURCE_FILE_SCALAR="../Scalar/CircleGeneratorScalar.cpp"
SOURCE_FILE_OPENMP="../OpenMP/CircleGeneratorOpenMP.cpp"
EXECUTABLE_SCALAR="../Scalar/CircleGeneratorScalar"
EXECUTABLE_OPENMP="../OpenMP/CircleGeneratorOpenMP"
RESULTS_DIR="../Results"
CSV_FILE="$RESULTS_DIR/CircleGeneratorResults.csv"

# Ensure results directory exists
mkdir -p "$RESULTS_DIR"

# Compile Scalar version
g++-14 -O3 -march=native -std=c++23 -framework OpenGL -framework GLUT -o "$EXECUTABLE_SCALAR" "$SOURCE_FILE_SCALAR"
# Compile OpenMP version
g++-14 -O3 -march=native -std=c++23 -Xpreprocessor -fopenmp \
  -L/opt/homebrew/opt/libomp/lib -I/opt/homebrew/opt/libomp/include \
  -lomp -framework OpenGL -framework GLUT \
  -o "$EXECUTABLE_OPENMP" "$SOURCE_FILE_OPENMP"

# Check if compilation was successful
if [[ ! -f "$EXECUTABLE_SCALAR" ]]; then
    echo "Compilation failed for $SOURCE_FILE_SCALAR"
    exit 1
fi
if [[ ! -f "$EXECUTABLE_OPENMP" ]]; then
    echo "Compilation failed for $SOURCE_FILE_OPENMP"
    exit 1
fi

# Write CSV header
echo "NUM_POINTS,NUM_TERMS,RADIUS,X_ORIGIN,Y_ORIGIN,AVG_TIME_SCALAR(ms),AVG_TIME_OPENMP(ms)" > "$CSV_FILE"

# Define different values to test
NUM_POINTS_LIST=(360)
NUM_TERMS_LIST=(5 10 15 20 100 200 300 400 500 600 700 800 900 1000 1100 1200 1300 1400 1500 2000 2500 3000 3500 4000 4500 5000 6000 7000 8000 9000 10000)
RADIUS_LIST=(1.0)
X_ORIGIN_LIST=(0.0)
Y_ORIGIN_LIST=(0.0)
RUNS=15

# Function to run an executable and calculate the average execution time
run_executable() {
    local executable="$1"
    local num_points="$2"
    local num_terms="$3"
    local radius="$4"
    local x_origin="$5"
    local y_origin="$6"

    local total_time=0

    for ((i=1; i<=RUNS; i++)); do
        # Run program and capture execution time
        OUTPUT=$("$executable" "$num_points" "$num_terms" "$radius" "$x_origin" "$y_origin" 2>/dev/null)

        # Extract execution time from output
        EXECUTION_TIME=$(echo "$OUTPUT" | grep -oE '[0-9]+\.[0-9]+ms' | grep -oE '[0-9]+\.[0-9]+')

        # Ensure we got a valid execution time
        if [[ -z "$EXECUTION_TIME" ]]; then
            EXECUTION_TIME=0
        fi

        # Add to total time
        total_time=$(echo "$total_time + $EXECUTION_TIME" | bc)
    done

    # Compute and return average execution time
    echo "scale=3; $total_time / $RUNS" | bc
}

# Run the program with different combinations and store results
for NUM_POINTS in "${NUM_POINTS_LIST[@]}"; do
    for NUM_TERMS in "${NUM_TERMS_LIST[@]}"; do
        for RADIUS in "${RADIUS_LIST[@]}"; do
            for X_ORIGIN in "${X_ORIGIN_LIST[@]}"; do
                for Y_ORIGIN in "${Y_ORIGIN_LIST[@]}"; do
                    echo "Running with NUM_POINTS=$NUM_POINTS, NUM_TERMS=$NUM_TERMS, RADIUS=$RADIUS, X_ORIGIN=$X_ORIGIN, Y_ORIGIN=$Y_ORIGIN"

                    # Get average execution times for both versions
                    AVG_TIME_SCALAR=$(run_executable "$EXECUTABLE_SCALAR" "$NUM_POINTS" "$NUM_TERMS" "$RADIUS" "$X_ORIGIN" "$Y_ORIGIN")
                    AVG_TIME_OPENMP=$(run_executable "$EXECUTABLE_OPENMP" "$NUM_POINTS" "$NUM_TERMS" "$RADIUS" "$X_ORIGIN" "$Y_ORIGIN")

                    # Save result to CSV
                    echo "$NUM_POINTS,$NUM_TERMS,$RADIUS,$X_ORIGIN,$Y_ORIGIN,$AVG_TIME_SCALAR,$AVG_TIME_OPENMP" >> "$CSV_FILE"
                done
            done
        done
    done
done

echo "Results saved in $CSV_FILE"

# Clean up
rm -f "$EXECUTABLE_SCALAR" "$EXECUTABLE_OPENMP"
echo "Cleaned up executables."
echo "Script completed successfully."