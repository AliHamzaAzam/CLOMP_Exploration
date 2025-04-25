import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import os

# Use pastel colors for better visuals
sns.set_palette("pastel")
sns.set_style("whitegrid")

# Load CSV file (Modify the path accordingly)
csv_file = "../Results/CircleGeneratorResults.csv"  # Change if needed
df = pd.read_csv(csv_file)

# Filter unique NUM_TERMS values (assumes other parameters remain unchanged)
df_filtered = df.groupby("NUM_TERMS").mean().reset_index()

# Extract relevant data
num_terms = df_filtered["NUM_TERMS"]
scalar_times = df_filtered["AVG_TIME_SCALAR(ms)"]
openmp_times = df_filtered["AVG_TIME_OPENMP(ms)"]
speedup = scalar_times / openmp_times  # Speedup = Scalar Time / OpenMP Time

# Create execution time plot
plt.figure(figsize=(8, 5))
plt.plot(num_terms, scalar_times, label="Scalar", marker="o", linestyle="-", color="#ff9999")  # Light Red
plt.plot(num_terms, openmp_times, label="OpenMP", marker="s", linestyle="--", color="#66b3ff")  # Light Blue
plt.xlabel("NUM_TERMS")
plt.ylabel("Execution Time (ms)")
plt.title("Execution Time vs. NUM_TERMS")
plt.legend()
plt.savefig("../Results/execution_time_comparison.png")
plt.show()

# Create speedup plot
plt.figure(figsize=(8, 5))
plt.plot(num_terms, speedup, marker="o", linestyle="-", color="#99ff99")  # Light Green
plt.xlabel("NUM_TERMS")
plt.ylabel("Speedup (Scalar / OpenMP)")
plt.title("Speedup vs. NUM_TERMS")
plt.savefig("../Results/speedup_plot.png")
plt.show()

print("Plots saved in ../Results/")