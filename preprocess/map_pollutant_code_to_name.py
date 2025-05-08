import gc
import tqdm
import airbase
import pandas as pd

def map_code_to_name(code: int) -> str:
    """Map pollutant code to name.
    
    Args:
        code (int): Pollutant code.
    Returns:
        str: Pollutant name.
    """
    # NO3 is not in the mapping
    mapping = {
        1: "SO2",
        5: "PM10",
        7: "O3",
        8: "NO2",
        10: "CO",
        12: "Pb",
        35: "NH3",
        38: "NO",
        6001: "PM2.5",
    }
    return mapping[code]

if __name__ == "__main__":
    client = airbase.AirbaseClient()
    countries = client.countries
    for country in tqdm.tqdm(countries):
        print(f"Mapping codes to names for {country}")
        df = pd.read_csv(f"../data/aggregated_data/aggregated_{country}.csv", sep=",", low_memory=False)
        df["PollutantName"] = df["Pollutant"].apply(map_code_to_name)
        df.rename(
            columns={"Pollutant": "PollutantCode", "Start": "Date"},
            inplace=True
        )
        df.to_csv(f"../data/aggregated_data_mapped/{country}.csv", index=False)
        gc.collect()
        print(f"Data for {country} mapped.")
        print("\n\n")
    print("All codes mapped to names.")
    