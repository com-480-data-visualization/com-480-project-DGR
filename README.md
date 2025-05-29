![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![Pandas](https://img.shields.io/badge/pandas-%23150458.svg?style=for-the-badge&logo=pandas&logoColor=white)

# SmogSense | Team DGR | EPFL COM-480

<img src="docs/assets/images/logo.png" alt="Logo" width="150" />

## 👥 Team DGR
| Student's name | SCIPER |
| -------------- | ------ |
| [Beatrice Grassano](https://github.com/beagrs) | 370780 |
| [Lorenzo Drudi](https://github.com/drudilorenzo/) | 367980 |
| [Emanuele Rimoldi](https://github.com/EmaRimoldi) | 377013 |

## 📄 Deliverables
- [Milestone1](./milestone1/Milestone1_DGR.pdf)
- [Milestone2](./milestone2/Milestone2_DGR.pdf)
- [Milestone3](./milestone3/ProcessBook_DGR.pdf)
- [Website](https://com-480-data-visualization.github.io/com-480-project-DGR/)
- [Screencast](https://drive.google.com/file/d/1fyN_-hBqwHdHoiiH7YAJzrIrMbOFt17y/view?usp=sharing)

## 🌍 Description

This project investigates how air quality in the European Union has evolved over the past 20 years and explores potential future trends based on current data. We analyze key pollutants, their sources, and their health and environmental impacts.

Through interactive visualizations, we aim to make complex data accessible and engaging for both experts and the general public. Additionally, a dedicated Curiosities section showcases compelling insights — such as the influence of electric vehicles on air quality — using striking and informative visuals.

## Data

### 📊 AirBase

Maintained by the European Environment Agency (EEA), [AirBase](https://www.eea.europa.eu/en/datahub/datahubitem-view/778ef9f5-6293-4846-badd-56a29c70880d?activeAccordion=1087599) is our primary data source. It compiles air quality measurements from EU Member States, EEA countries, and partner nations. The dataset includes a multiyear time series of pollutant levels, along with metadata on monitoring networks and stations.

🧪 Scripts & Notebooks:
- `data/download_eea_air_quality_data.py` — Python script to download AirBase data.
- `analysis/eea_air_quality_data_eda.ipynb` — Initial exploratory data analysis of the dataset.
- `preprocess/*` — Scripts used to aggregate and clean the data into the final file `air_quality_data.json`, which is consumed by the web app. 

🔗 Useful Links:
- 📄 [Official Datasheet](https://www.eea.europa.eu/data-and-maps/data/airbase-the-european-air-quality-database-6/airbase-products/data/file)
- 🐍 [Python Downloader](https://github.com/JohnPaton/airbase)

### 🌍 Global EV Outlook 2025

The Global EV Outlook [1] is an annual report that presents key trends and developments in electric mobility worldwide. It is developed with the support of the Electric Vehicles Initiative (EVI).

For further insights, refer to the dedicated article by Our World in Data [2].

🧪 Scripts & Notebooks:
- `preprocess/build_ev_share_json.ipynb` — Notebook used to clean and process the data into the file electric_car_share_data.json, which is consumed by the web app.

📚 Citations:
- [1] IEA (2025), Global EV Outlook 2025, IEA, Paris. https://www.iea.org/reports/global-ev-outlook-2025 — Licence: CC BY 4.0
- [2] Hannah Ritchie (2024), Tracking Global Data on Electric Vehicles. Published online at OurWorldinData.org. Retrieved from: https://ourworldindata.org/electric-car-sales

## 📦 Conda Env

To run the provided Python scripts and notebooks, use the `dataviz` conda environment.
You can create it by running the following command:

```bash
conda env create -f dataviz.yml
```

Once created, activate the environment with:

```bash
conda activate dataviz
```

## 🧱 Project Structure

```text
COM-480-PROJECT-DGR/
│
├── analysis/                         # Jupyter notebooks for EDA
│   └── eea_air_quality_data_eda.ipynb
│
├── data/                             # Datasets and Download scripts
│   ├── air_quality_data.json
│   ├── electric_car_share_data.json
│   ├── download_eea_air_quality_data.py
│   └── scraper_immobiliare_it.py
│
├── preprocess/                       # Scripts for cleaning and preprocessing
│   ├── aggregate_air_quality_data.py
│   ├── build_air_quality_json.ipynb
│   ├── build_ev_share_json.ipynb
│   └── map_pollutant_code_to_name.py
│
├── docs/                             # Website
│   ├── assets/...
│   ├── index.html
│   ├── .nojekyll
│
├── milestone1/                       # Reports
│   └── Milestone1_DGR.pdf
├── milestone2/
│   └── Milestone2_DGR.pdf
├── milestone3/
│   └── ProcessBook_DGR.pdf
│
├── dataviz.yml                       # Conda environment configuration
├── .gitignore
└── README.md                         # Project overview and instructions
```

## 🗂️ Folder Highlights

- `data/` — Contains data files, as well as scripts for downloading the datasets.
- `preprocess/` — Includes notebooks and scripts for cleaning and converting data into formats used by the web app.
- `analysis/` — Exploratory analysis of air quality data using Jupyter.
- `docs/` — Web app source code and assets, deployed via GitHub Pages.
- `milestone*/` — Milestone report PDFs documenting project progress.
