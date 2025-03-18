from bs4 import BeautifulSoup
import pandas as pd
import numpy as np
import requests
import time


"""
    WEB SCRAPER FOR THE WEBSITE 'immobiliare.it':
    The tool is used to get prices - sell and rent - by region, province, and city in Italy.

"""


"""
    Cookies are necessary to access the website and pass the captcha.
    
    You can get the cookies by inspecting the website and copying them from the network tab:
    - Chrome: Application -> Storage -> Cookies
    
    Cookies needed:
    - 'datadome': security-related HTTP cookie set by DataDome, a bot protection and fraud detection service.
    - 'sid': session ID.
"""
REQUEST_COOKIES = {
    'datadome': 'PUT_HERE_YOUR_VALUE',
    'sid': 'PUT_HERE_YOUR_VALUE'    
}

"""
    Changing the User-Agent is necessary to avoid being blocked by the website and better simulate a real user.
"""
REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
}

DATA_FOLDER = "./house_prices/"

BASE_URL = 'https://www.immobiliare.it/mercato-immobiliare/'

def build_regions_and_provinces_df(url: str = BASE_URL):
    """Create the dataframe containing data for all the provinces and regions.
    
    Args:
        url (str): the base url of the website.

    Returns:
        pd.DataFrame: dataframe containing data for all the provinces and regions.
    """
    df_provinces_regions = pd.DataFrame(columns = ['Comuni', 'Vendita(€/m²)', 'Affitto(€/m²)', 'Provincia'])
    
    for region_name in get_list_of_regions(url):
        print(f"Scraping data for region {region_name}")
        time.sleep(5)
        region_url = str(url + region_name.lower().replace(" ", "-").replace("'", "-").strip(" "))
        page = requests.get(region_url, headers = REQUEST_HEADERS, cookies = REQUEST_COOKIES)
        soup = BeautifulSoup(page.text, 'lxml')
                    
        table_province_region = soup.find("table", {"class": "nd-table nd-table--borderBottom"})
        
        headers = []
        for i in table_province_region.find_all('th'):
            title = i.text
            headers.append(title)
        
        df_province_region = pd.DataFrame(columns = headers)
        
        for j in table_province_region.find_all('tr')[1:]:
            row_data = j.find_all('td')
            row = [i.text for i in row_data]
            length = len(df_province_region)
            df_province_region.loc[length] = row

        if region_name == "Valle d'Aosta":
            provinces_region_list = ["Aosta"]
        else:
            provinces_region_list = df_province_region["Province"].values.tolist()
        
        print(f"Province in {region_name}: {provinces_region_list}")

        df_provinces_regions = pd.concat([df_provinces_regions, read_province_data(region_name, provinces_region_list, url)]).reset_index(drop=True)
    
    return df_provinces_regions
  
def get_list_of_regions(url: str = BASE_URL):
    """Get the list of regions by reading the main table.
    
    Args:
        url (str): the base url of the website.

    Returns:
        List[str]: List of regions.
    """
    page = requests.get(url, headers = REQUEST_HEADERS, cookies = REQUEST_COOKIES)
    soup = BeautifulSoup(page.text, 'lxml')    
    table_regions = soup.find("table", {"class": "nd-table nd-table--borderBottom"})

    headers = []
    for i in table_regions.find_all('th'):
        title = i.text
        headers.append(title)
 
    df_regions = pd.DataFrame(columns = headers)
    for j in table_regions.find_all('tr')[1:]:
        row_data = j.find_all('td')
        row = [i.text for i in row_data]
        length = len(df_regions)
        df_regions.loc[length] = row

    return df_regions["Regioni"].values.tolist()  
    
def read_province_data(region_name: str, provinces_region_list: pd.DataFrame, url: str = BASE_URL):
    """Read data for all the provinces of a specific region.

    Args:
        regione_name (str): the region name.
        province_regione_list (List[str]): list of all the provinces of the region. 
        url (str): the base url of the website.        
        
    Returns:
        pd.DataFrame: data for all the provinces of the region.
    """
    df_cities_province = pd.DataFrame(columns = ['Comuni', 'Vendita(€/m²)', 'Affitto(€/m²)', 'Provincia'])    
    
    for province in provinces_region_list:
        print(f"Scraping data for province {province} in {region_name}")
        time.sleep(8)
        
        if province == "San Marino":
            pass
        if province == "L'Aquila":
            province = "Aquila"
    
        province_url = str(url + region_name.lower().replace(" ", "-").replace("'", "-") + "/" + province.lower().replace(" ", "-").replace("'", "-").replace("-e-","-") + "-provincia")
                
        try: 
            page = requests.get(province_url, headers = REQUEST_HEADERS, cookies = REQUEST_COOKIES)
            soup = BeautifulSoup(page.text, 'lxml')
            table_comuni_provincia = soup.find("table", {"class": "nd-table nd-table--borderBottom"})

            headers = []
            for i in table_comuni_provincia.find_all('th'):
                title = i.text
                headers.append(title)
            
            df_city_province = pd.DataFrame(columns = headers)

            for j in table_comuni_provincia.find_all('tr')[1:]:
                row_data = j.find_all('td')
                row = [i.text for i in row_data]
                length = len(df_city_province)
                df_city_province.loc[length] = row
        
            df_city_province["Provincia"] = [province]*len(df_city_province)
            df_cities_province = pd.concat([df_cities_province, df_city_province]).reset_index(drop=True)
        except:
            print(f"Error in {province} - Data not found - {province_url}")
    
    return df_cities_province
    
if __name__ == '__main__':    
    for year in range(2019, 2000, -1):
        print(f"Scraping data for year {year}")
        archive_url = f"https://web.archive.org/web/{year}0317000000/{BASE_URL}"
        df_provinces_regions = build_regions_and_provinces_df(archive_url)
            
        # Properly format the data and save it to a csv file
        df_final = df_provinces_regions.copy(deep=True)
        df_final = df_final.replace('-', np.nan)
        df_final['Vendita(€/m²)'] = df_final['Vendita(€/m²)'].str.replace('[^\d,]', '').str.replace(',', '.').astype(float)
        df_final['Affitto(€/m²)'] = df_final['Affitto(€/m²)'].str.replace('[^\d,]', '').str.replace(',', '.').astype(float)
        df_final.to_csv(f"{DATA_FOLDER}italy_{year}.csv", encoding = "utf-8-sig", index = False, sep = ";")