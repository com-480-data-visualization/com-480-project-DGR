"""
    Python script to aggregate all the air quality data, at each sampling point, registered on the same date.
    The scripts:
    - Reads the data from parquet files
    - Filters the data to remove rows with NaN values in the "Value" column and negative values
    - Splits the "Samplingpoint" column to keep only the second part
    - Filters the data to keep only rows with "AggType" values of "hour" or "day"
    - Merges the data with metadata to add latitude and longitude
    - Aggregates the data by computing the mean value for each pollutant at each sampling point for each date
    - Saves the aggregated data to CSV files
    The script uses the AirbaseClient to get the list of countries and processes each country one by one.
    The script uses the fastparquet library to read parquet files and pandas for data manipulation.
"""

import gc
import airbase
import pandas as pd
import fastparquet as fp

DATA_PATH = "../data"


def aggregate_data(country: str) -> pd.DataFrame:
    """Compute the average value of each pollutant at each sampling point for each date.

    Args:
        country (str): Country code to filter data.

    Returns:
        pd.DataFrame: Aggregated DataFrame.
    """
    print("Reading data...")
    df = fp.ParquetFile(f"{DATA_PATH}/{country}").to_pandas()  
    start_length = len(df)  
    
    print("Filtering data...")
    df = df.dropna(subset=["Value"])
    df = df[(df["Value"] >= 0)]
    df["Samplingpoint"] = df["Samplingpoint"].astype(str).str.split("/").str[1]    
    df = df[df["AggType"].isin(["hour", "day"])]
    
    assert df.groupby("Pollutant")["Unit"].nunique().max() == 1, f"Multiple units for a single pollutant"
    assert set(df["AggType"].unique()) <= {"hour", "day"}, f"Unexpected AggType values: {df["AggType"].unique()}"
    
    print("Merging data...")
    df_metadata = pd.read_csv(f"{DATA_PATH}/metadata.csv", sep=",", low_memory=False)    
    df_metadata_filtered = df_metadata[["Sampling Point Id", "Latitude", "Longitude"]]
    df_merged = df[["Samplingpoint", "Pollutant", "Unit", "Start", "Value"]].merge(df_metadata_filtered, left_on="Samplingpoint", right_on="Sampling Point Id")
        
    df_merged["Start"] = df_merged["Start"].dt.date
    
    print("Aggregating data...")
    df_merged = df_merged.groupby(
        ["Samplingpoint", "Pollutant", "Start", "Latitude", "Longitude"],
        as_index=False
    ).agg({
        "Value": "mean",
        "Unit": "first"
    })    
    
    print(f"Start length: {start_length} - End length: {len(df_merged)}")
    df_merged.to_csv(f"./aggregated_data/aggregated_{country}.csv", index=False) 
 
   
def aggregate_data_monthly(country: str) -> pd.DataFrame:
    """Compute the average value of each pollutant at each sampling point for each month.

    Args:
        country (str): Country code to filter data.

    Returns:
        pd.DataFrame: Aggregated DataFrame.
    """
    print(f"Reading data for {country}")        
    df = pd.read_csv(f"../data/aggregated_air_quality/{country}.csv", sep=",", low_memory=False)
        
    start_length = len(df)  
    df = df.dropna(subset=['Value'])
    df = df[(df['Value'] >= 0)]
    
    # Convert to datetime and extract year-month
    df['Date'] = pd.to_datetime(df['Date'])
    df['Month'] = df['Date'].dt.to_period('M').dt.to_timestamp()

    # Group by month instead of full date
    df_aggregated = df.groupby(
        ['Samplingpoint', 'PollutantCode', 'PollutantName', 'Month', 'Latitude', 'Longitude'],
        as_index=False
    ).agg({
        'Value': 'mean',
        'Unit': 'first'
    })
    
    print(f"Start length: {start_length} - End length: {len(df_aggregated)}")
    df_aggregated.to_csv(f"../data/aggregated_air_quality_monthly/{country}.csv", index=False)  
    return df_aggregated


def create_full_df(year: int = None) -> pd.DataFrame:
    """Create a full DataFrame with all countries' data.

    Args:
        year (int, optional): used to filter out data before a specific year. Defaults to None.

    Returns:
        pd.DataFrame: merged DataFrame with data and metadata.
    """
    print(f"Reading data...")
    
    client = airbase.AirbaseClient()
    countries = client.countries
    df = pd.DataFrame()
    
    countries = ['IT']
    
    for country in countries:
        print(f"Reading data for {country}")        
        try:
            df_country = fp.ParquetFile(f"{DATA_PATH}{country}").to_pandas()
            
            if year:
                df_country = df_country[df_country['Start'] > f"{year}-01-01"]
            
            df_country = df_country.dropna(subset=['Value'])
            df_country = df_country[(df_country['Value'] >= 0) & (df_country['Value'] <= 1000)]
                        
            print(df_country['AggType'].unique())
            print(df_country['Unit'].unique())
            print(len(df_country[df_country['AggType'] == 'hour']))
            print(len(df_country[df_country['AggType'] == 'day']))
            
            df = pd.concat([df, df_country], ignore_index=True)
        except FileNotFoundError:
            print(f"File not found for {country}. Skipping.")
    
    df_metadata = pd.read_csv(f"{DATA_PATH}/metadata.csv", sep=",", low_memory=False)
    print("Data read.")
    
    df_metadata_filtered = df_metadata[['Sampling Point Id', 'Latitude', 'Longitude']]
    df['Samplingpoint'] = df['Samplingpoint'].astype(str).str.split('/').str[1]
    print(len(df))
    df_merged = df[['Samplingpoint', 'Pollutant', 'Unit', 'Start', 'Value']].merge(df_metadata_filtered, left_on='Samplingpoint', right_on='Sampling Point Id')
    print(len(df_merged))
    df_merged['Start'] = df_merged['Start'].dt.date
    df_merged = df_merged.groupby(['Samplingpoint', 'Pollutant', 'Start', 'Latitude', 'Longitude'], as_index=False).agg({'Value': 'mean'})    
    return df_merged


if __name__ == "__main__":
    client = airbase.AirbaseClient()
    countries = client.countries
    for country in countries:
        print(f"Aggregating data for {country}")
        aggregate_data_monthly(country)
        gc.collect()
        print("Data aggregated.")
        print("\n\n")
    print("All data aggregated.")