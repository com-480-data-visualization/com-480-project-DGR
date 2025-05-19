import gc
import airbase
import pandas as pd
import fastparquet as fp

DATA_PATH = "./data"

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
    

if __name__ == "__main__":
    client = airbase.AirbaseClient()
    countries = client.countries
    for country in countries:
        print(f"Aggregating data for {country}")
        aggregate_data(country)
        gc.collect()
        print("Data aggregated.")
        print("\n\n")
    print("All data aggregated.")