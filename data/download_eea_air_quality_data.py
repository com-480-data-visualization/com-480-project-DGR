import airbase

"""
    Download data from the European Environment Agency (EEA) Air Quality Database.
    The data are downloaded using the 'airbase' client: https://github.com/JohnPaton/airbase
    Along with the data, the metadata containing information about the stations is also downloaded.
    
    The data are divided into 3 categories:
    - Verified: from 2013 to 2023 reported by countries by 30 September each year for the previous year.
    - Unverified: transmitted continuously data from the beginning of 2024.
    - Historical: data delivered between 2002 and 2012.
    
    Below, defined as constants, are defined the pollutants and countries for which the data will be downloaded.
"""

POLLUTANTS = ["PM2.5", "PM10", "NO", "NO2", "NO3", "O3", "CO", "Co", "SO2", "NH3", "Pb"]
COUNTRIES = ["IT", "DE", "PL", "FR", "CH", "GB", "ES"]

class DataCategory:
    VERIFIED = "Verified"
    UNVERIFIED = "Unverified"
    HISTORICAL = "Historical"

if __name__ == "__main__":
    client = airbase.AirbaseClient()
    
    # r = client.request("Verified", *COUNTRIES, poll=POLLUTANTS)
    
    # Testing with only PM2.5 data (just a matter of time and space)
    r = client.request(DataCategory.VERIFIED, "IT", "ES", "PL", "FI", poll=["PM2.5"])
    
    r.download(dir="./", skip_existing=True)
    client.download_metadata("metadata.csv")