import pandas as pd
import matplotlib.pyplot as plt

# Read the merged CSV file
df = pd.read_csv('merged_images.csv')

# Calculate total time for each column (NaN values are skipped automatically)
total_scalar_cpu = df['Scalar_CPU_Time(ms)'].sum()
total_gpu = df['GPU_Time(ms)'].sum()
total_cpu = df['CPU_Time(ms)'].sum()

# Print results
print("Total Time Summary:")
print(f"Scalar CPU: {total_scalar_cpu:.2f} ms")
print(f"GPU: {total_gpu:.2f} ms")
print(f"CPU: {total_cpu:.2f} ms")

# Plot a bar chart
plt.figure(figsize=(10, 6))
categories = ['Scalar CPU', 'GPU', 'CPU']
times = [total_scalar_cpu, total_gpu, total_cpu]
colors = ['#1f77b4', '#2ca02c', '#d62728']

plt.bar(categories, times, color=colors, edgecolor='black')
plt.title('Total Time by Processing Type', fontsize=14)
plt.ylabel('Time (ms)', fontsize=12)
plt.grid(axis='y', linestyle='--', alpha=0.6)

# Add value labels on top of bars
for i, v in enumerate(times):
    plt.text(i, v + 0.5, f"{v:.1f}", ha='center', fontsize=10)

plt.tight_layout()
plt.savefig('total_time_summary.png', dpi=300)
plt.show()