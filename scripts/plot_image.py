import pandas as pd
import matplotlib.pyplot as plt

# Number of rows to plot
num_rows = 50

# Read the merged CSV file
df = pd.read_csv('merged_images.csv')

# Limit to the first num_rows
df_limited = df.head(num_rows)

# Create a figure and plot the data
plt.figure(figsize=(12, 6))

# Plot each time series with markers
plt.plot(df_limited.index, df_limited['Scalar_CPU_Time(ms)'], marker='o', linestyle='-', label='Scalar CPU Time')
plt.plot(df_limited.index, df_limited['GPU_Time(ms)'], marker='s', linestyle='--', label='GPU Time')
plt.plot(df_limited.index, df_limited['CPU_Time(ms)'], marker='^', linestyle='-.', label='CPU Time')

# Customize the plot
plt.xticks(df_limited.index, df_limited['Image'], rotation=45, ha='right')  # Use image names as x-labels
plt.xlabel('Image Name')
plt.ylabel('Time (ms)')
plt.title(f'CPU, GPU, and Scalar CPU Time Comparison (First {num_rows} Images)')
plt.legend()
plt.grid(True, linestyle='--', alpha=0.7)
plt.tight_layout()  # Adjust layout to prevent label cutoff

# Save and show the plot
plt.savefig(f'time_comparison_{num_rows}.png', dpi=300)
plt.show()