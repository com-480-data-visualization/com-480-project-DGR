import pandas as pd
import json
import os
import re  # Importa il modulo per le espressioni regolari

def extract_date_from_filename(filename):
    """
    Estrae la data dal nome del file Parquet.

    Args:
        filename (str): Il nome del file Parquet (e.g., 'SPO.IT0459A_6001_BETA_2006-02-20_00_00_00.parquet').

    Returns:
        str: La data estratta nel formato 'YYYY-MM-DD', o None se non viene trovata alcuna data.
    """
    match = re.search(r'(\d{4}-\d{2}-\d{2})', filename)
    if match:
        return match.group(1)
    else:
        return None
def create_df(country_code, country_name, data_folder="./air_quality_data/"):
    """
    Legge i dati Parquet per una specifica nazione, li unisce ai metadati, e restituisce un DataFrame processato.
    Gestisce potenziali problemi di memoria processando il file Parquet in chunks.

    Args:
        country_code (str): Il codice della nazione (e.g., 'IT', 'ES').
        country_name (str): Il nome completo della nazione (e.g., 'Italy', 'Spain').
        data_folder (str, optional): La directory dove sono memorizzati i dati. Di default './air_quality_data/'.

    Returns:
        pandas.DataFrame: Un DataFrame processato contenente i dati sulla qualità dell'aria e i metadati. Restituisce un DataFrame vuoto in caso di errore.
    """
    processed_chunks = []
    country_folder = os.path.join(data_folder, country_code)  # Path alla cartella della nazione
    parquet_files = [f for f in os.listdir(country_folder) if f.startswith("SPO.") and f.endswith(".parquet")] # Files nella cartella della nazione

    if not parquet_files:
        print(f"Error: No Parquet files found for {country_name} in {country_folder}")
        return pd.DataFrame()

    try:
        for parquet_file in parquet_files:
            file_path = os.path.join(country_folder, parquet_file) # Path completo
            for chunk in pd.read_parquet(file_path, chunksize=100000):  # Adjust chunksize as needed
                df_metadata = pd.read_csv(f"{data_folder}/metadata.csv", sep=",", low_memory=False)

                # Gestisci i casi in cui 'Samplingpoint' potrebbe mancare o essere già stata processata
                if 'Samplingpoint' in chunk.columns:
                    chunk['Samplingpoint'] = chunk['Samplingpoint'].astype(str).str.split('/').str[1]
                else:
                    print(f"Warning: 'Samplingpoint' column not found in chunk for {country_name}. Skipping split.")

                df_metadata_filtered = df_metadata[df_metadata['Country'] == country_name]
                df_metadata_filtered = df_metadata_filtered[['Sampling Point Id', 'Latitude', 'Longitude']]

                # Estrai la data dal nome del file e aggiungila al chunk
                date_str = extract_date_from_filename(parquet_file)
                if date_str:
                    chunk['Start'] = pd.to_datetime(date_str)  # Aggiungi la colonna 'Start'
                else:
                    chunk['Start'] = None
                    print(f"Warning: Could not extract date from filename {parquet_file} for {country_name}")

                # Gestisci l'operazione di merge con attenzione
                df_merged_chunk = chunk.merge(df_metadata_filtered, left_on='Samplingpoint', right_on='Sampling Point Id', how='inner')
                processed_chunks.append(df_merged_chunk)

        if processed_chunks:
            df_merged = pd.concat(processed_chunks, ignore_index=True)
        else:
            df_merged = pd.DataFrame()  # Restituisci un DataFrame vuoto se nessun chunk è stato processato

        return df_merged

    except FileNotFoundError:
        print(f"Error: Parquet file not found for {country_name} at {parquet_file}")
        return pd.DataFrame()  # Restituisci esplicitamente un DataFrame vuoto in caso di FileNotFoundError
    except Exception as e:
        print(f"Error processing data for {country_name}: {e}")
        return pd.DataFrame()

def get_top_n_countries(df, pollutant, top_n=5, year=None):
    """
    Filtra un DataFrame per inquinante, opzionalmente per anno, e restituisce le prime N nazioni
    con i valori medi più alti di inquinante.

    Args:
        df (pandas.DataFrame): Il DataFrame di input.
        pollutant (str): L'inquinante per cui filtrare (e.g., 'PM2.5').
        top_n (int, optional): Il numero di top nazioni da restituire. Di default 5.
        year (int, optional): L'anno per cui filtrare. Di default None.

    Returns:
        list: Una lista delle top N nazioni.
    """
    # Controlla se il DataFrame è vuoto
    if df.empty:
        print("Warning: get_top_n_countries chiamato con un DataFrame vuoto.")
        return []

    filtered_df = df[df['Pollutant'] == pollutant].copy()
    if year is not None:  # Corretto il controllo su 'year'
        filtered_df = filtered_df[filtered_df['Year'] == year]
    avg_pollutant_by_country = filtered_df.groupby('Country')['Value'].mean().sort_values(
        ascending=False
    )
    top_countries = avg_pollutant_by_country.head(top_n).index.tolist()
    return top_countries



# Configuration
POLLUTANTS = ["PM2.5", "PM10", "O3", "NO2", "SO2"]
COUNTRIES = ["IT", "ES", "PL", "FI", "DE", "FR", "GB"]
DATA_FOLDER = "./air_quality_data/"
JSON_OUTPUT = "air_quality_data.json"

# Carica ed elabora i dati.
data = {}
country_names = {"IT": "Italy", "ES": "Spain", "PL": "Poland", "FI": "Finland",
                    "DE": "Germany", "FR": "France", "GB": "United Kingdom"}

print("Processing data...")
for code, name in country_names.items():
    data[name] = create_df(code, name, DATA_FOLDER)

# Concatenazione di tutti i dati nazionali.
all_data_df = pd.concat(data.values(), keys=data.keys(), names=['Country'], ignore_index=True)

# Assicurati che la colonna 'Start' esista prima di procedere.
if not all_data_df.empty and 'Start' in all_data_df.columns:
    all_data_df['Year'] = all_data_df['Start'].dt.year
else:
    print("Warning: 'Start' column not found in concatenated DataFrame. Skipping year extraction.")
    all_data_df['Year'] = None #added

# Trova le prime 5 nazioni per ogni inquinante.
top_n_countries_by_pollutant = {}
for pollutant in POLLUTANTS:
    print(f"Finding top countries for {pollutant}...")
    # Gestisci il caso in cui all_data_df è vuoto
    if not all_data_df.empty:
        top_n_countries_by_pollutant[pollutant] = get_top_n_countries(all_data_df, pollutant, top_n=5)
    else:
        top_n_countries_by_pollutant[pollutant] = []  # Assegna una lista vuota se non ci sono dati

# Carica i metadati.
print("Loading metadata...")
metadata_df = pd.read_csv(f"{DATA_FOLDER}metadata.csv", sep=",", low_memory=False)
metadata_dict = metadata_df.to_dict(orient='records')

# Prepara i dati per l'output JSON.
print("Preparing JSON data...")
output_data = {
    "pollutants": POLLUTANTS,
    "top_countries_by_pollutant": top_n_countries_by_pollutant,
    "country_data": {},
    "metadata": metadata_dict
}

for pollutant in POLLUTANTS:
    output_data["country_data"][pollutant] = {}
    # Gestisci il caso in cui top_n_countries_by_pollutant[pollutant] è vuoto
    if top_n_countries_by_pollutant[pollutant]:
        for country in top_n_countries_by_pollutant[pollutant]:
            # Controlla se la nazione è in all_data_df
            if country in all_data_df['Country'].unique():
                country_df = all_data_df[(all_data_df['Country'] == country) & (all_data_df['Pollutant'] == pollutant)]
                if not country_df.empty:
                    output_data["country_data"][pollutant][country] = {
                        "dates": country_df['Start'].dt.strftime('%Y-%m-%d').tolist(),
                        "values": country_df['Value'].tolist(),
                        "unit": country_df['Unit'].iloc[0]
                    }
                else:
                    output_data["country_data"][pollutant][country] = {
                        "dates": [],
                        "values": [],
                        "unit": ""
                    }

            else:
                output_data["country_data"][pollutant][country] = {
                    "dates": [],
                    "values": [],
                    "unit": ""
                }
    else:
        print(f"Warning: No top countries found for pollutant {pollutant}")

# Salva i dati come JSON.
print(f"Saving data to {JSON_OUTPUT}...")
with open(JSON_OUTPUT, "w") as f:
    json.dump(output_data, f, indent=4)

print("Data processing complete!")
