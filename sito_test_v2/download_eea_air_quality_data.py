import airbase
import pandas as pd
import json

class DataCategory:
    VERIFIED = "Verified"
    UNVERIFIED = "Unverified"
    HISTORICAL = "Historical"

def download_eea_data(pollutants, countries, data_folder="./air_quality/"):
    client = airbase.AirbaseClient()
    r = client.request(DataCategory.VERIFIED, *countries, poll=pollutants)
    r.download(dir=data_folder, skip_existing=True)
    client.download_metadata(f"{data_folder}metadata.csv")

def create_df(country_code, country_name, data_folder="./air_quality/"):
    df = pd.read_parquet(f"{data_folder}{country_code}")  # Use read_parquet
    df_metadata = pd.read_csv(f"{data_folder}/metadata.csv", sep=",", low_memory=False)
    df['Samplingpoint'] = df['Samplingpoint'].astype(str).str.split('/').str[1]
    df_metadata_filtered = df_metadata[df_metadata['Country'] == country_name]
    df_metadata_filtered = df_metadata_filtered[['Sampling Point Id', 'Latitude', 'Longitude']]
    df_merged = df[['Samplingpoint', 'Start', 'Pollutant', 'Value', 'Unit']].merge(
        df_metadata_filtered, left_on='Samplingpoint', right_on='Sampling Point Id'
    )
    return df_merged

def get_top_n_countries(df, pollutant, top_n=5, year=None):
    filtered_df = df[df['Pollutant'] == pollutant].copy()
    if year:
        filtered_df = filtered_df[filtered_df['Year'] == year]
    avg_pollutant_by_country = filtered_df.groupby('Country')['Value'].mean().sort_values(
        ascending=False
    )
    top_countries = avg_pollutant_by_country.head(top_n).index.tolist()
    return top_countries

# Configuration
POLLUTANTS = ["PM2.5"]
COUNTRIES = ["IT", "ES", "PL", "FI", "DE", "FR", "GB"]
DATA_FOLDER = "./air_quality_data/"
JSON_OUTPUT = "air_quality_data.json"  # File for website

# Download data (if needed)
download_eea_data(POLLUTANTS, COUNTRIES, DATA_FOLDER)

# Load and process data
data = {}
country_names = {"IT": "Italy", "ES": "Spain", "PL": "Poland", "FI": "Finland",
                "DE": "Germany", "FR": "France", "GB": "United Kingdom"}

for code, name in country_names.items():
    try:
        data[name] = create_df(code, name, DATA_FOLDER)
    except FileNotFoundError:
        print(f"Data for {name} not found. Skipping.")

all_data_df = pd.concat(data.values(), keys=data.keys(), names=['Country'])
all_data_df = all_data_df.reset_index(level='Country')
all_data_df['Year'] = all_data_df['Start'].dt.year

# Find top 5 countries
TOP_N = 5
TOP_POLLUTANT = POLLUTANTS[0]
top_5_countries = get_top_n_countries(all_data_df, TOP_POLLUTANT, TOP_N)

# Prepare data for JSON output
output_data = {
    "pollutant": TOP_POLLUTANT,
    "top_countries": top_5_countries,
    "country_data": {}
}

for country in top_5_countries:
    country_df = all_data_df[
        (all_data_df['Country'] == country) & (all_data_df['Pollutant'] == TOP_POLLUTANT)
    ]
    output_data["country_data"][country] = {
        "dates": country_df['Start'].dt.strftime('%Y-%m-%d').tolist(),  # Format dates
        "values": country_df['Value'].tolist(),
        "unit": country_df['Unit'].iloc[0]
    }

# Save as JSON
with open(JSON_OUTPUT, "w") as f:
    json.dump(output_data, f, indent=4)  #  indent for readability
