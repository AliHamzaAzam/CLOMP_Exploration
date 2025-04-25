import pandas as pd

# Read the first CSV file
df1 = pd.read_csv('/Users/azaleas/Developer/CLionProjects/CLOMP-Exploration/OpenCL/output/results.csv', dtype={'Image': str})

# Read the second CSV file and drop redundant columns
df2 = pd.read_csv('/Users/azaleas/Developer/CLionProjects/CLOMP-Exploration/Scalar/output/results.csv', dtype={'Image': str})
df2 = df2.drop(columns=['Width', 'Height'])

# Merge the dataframes on 'Image' using outer join to include all images
merged_df = pd.merge(df1, df2, on='Image', how='outer')

# Save the merged dataframe to a new CSV file
merged_df.to_csv('merged_images.csv', index=False)