# 1. CONDA ENV

To set up the environment with all required packages for data download & analysis, run:  

```sh
conda env create -f dataviz.yml
```

# 2. DATA DOWNLOAD

To download the data run the `` in the data folder:

```sh
python download_eea_air_quality_data.py
```

# 3. DATA ANALYSIS

Two notebooks:
- `eea_air_quality_data_analysis`: air quality data