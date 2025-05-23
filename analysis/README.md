# 1. CONDA ENV

To set up the environment with all required packages for data download & analysis, run:  

```sh
conda env create -f dataviz.yml
```

# 2. DATA DOWNLOAD

To download the data run the `download_eea_air_quality_data.py` script in the data folder:

```sh
cd ../data
python download_eea_air_quality_data.py
```

# 3. DATA ANALYSIS

- `eea_air_quality_data_eda`: air quality data analysis