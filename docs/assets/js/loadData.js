// Functions used to load and transform data for the air quality dashboard

import { availableCountries } from "./countries.js";

async function loadAndTransformData() {
    const res = await fetch('./assets/data/air_quality_data_with_cities.json');
    const rawData = await res.json();
    const data = {};
  
    for (const year in rawData) {
      data[year] = {};
      for (const pollutant in rawData[year]) {
        data[year][pollutant] = [];
        for (const country in rawData[year][pollutant]) {
          const entries = rawData[year][pollutant][country];
          const avg =
            entries.reduce((sum, e) => sum + e.Concentration, 0) / entries.length;
  
          data[year][pollutant].push({
            Paese: country,
            Concentrazione: parseFloat(avg.toFixed(1)),
          });
        }
  
        data[year][pollutant].sort(
          (a, b) => b.Concentrazione - a.Concentrazione
        );
      }
    }
    return data;
}

async function loadCountrySpecificData() {
    const response = await fetch("./assets/data/air_quality_data_with_cities.json");
    const rawData = await response.json();
  
    const result = {};
  
    const years = Object.keys(rawData).map(Number).sort((a, b) => a - b);
    const pollutantsSet = new Set();
    for (const year in rawData) {
        for (const pollutant in rawData[year]) {
            pollutantsSet.add(pollutant);
        }
    }
    const pollutants = Array.from(pollutantsSet);

    const countrySet = new Set();
    for (const year in rawData) {
        for (const pollutant in rawData[year]) {
            for (const country in rawData[year][pollutant]) {
                countrySet.add(country);
            }
        }
    }
    const countries = Array.from(countrySet);

    for (const country of countries) {
        const countryEntry = {
            center: [],
            zoom: 5,
            cities: [],
            pollutantEvolution: {},
        };
  
        let latSum = 0;
        let lonSum = 0;
        let latLonCount = 0;
        let cities = {};

        for (const pollutant of pollutants) {
            countryEntry.pollutantEvolution[pollutant] = {};  
            for (const year of years) {
                const yearStr = String(year);
                const countryData = rawData?.[yearStr]?.[pollutant]?.[country];

                if (countryData && countryData.length > 0) {
                    const avg =
                        countryData.reduce((sum, e) => sum + e.Concentration, 0) /
                        countryData.length;
                    countryEntry.pollutantEvolution[pollutant][year] = parseFloat(avg.toFixed(2));

                    latSum += countryData.reduce((sum, e) => sum + e.Latitude, 0)
                    lonSum += countryData.reduce((sum, e) => sum + e.Longitude, 0)
                    latLonCount += countryData.length;

                    for (const entry of countryData) {
                        if (!cities[entry.City]) {
                            cities[entry.City] = {
                                name: entry.City,
                                lat: entry.Latitude,
                                lon: entry.Longitude,
                                pollution: {},
                            };
                        }
                        if (!cities[entry.City].pollution[pollutant]) {
                            cities[entry.City].pollution[pollutant] = [];
                        }
                        cities[entry.City].pollution[pollutant].push(entry.Concentration);
                    }
                } else {
                    countryEntry.pollutantEvolution[pollutant][year] = null;
                }
            }
        }

        const avgLat = latSum / latLonCount;
        const avgLon = lonSum / latLonCount;
        countryEntry.center = [avgLat, avgLon];

        for (const pollutant of pollutants) {
            const cityList = Object.values(cities)
              .filter((city) => city.pollution[pollutant])
              .map((city) => ({
                ...city,
                avgConcentration:
                  city.pollution[pollutant].reduce((sum, v) => sum + v, 0) /
                  city.pollution[pollutant].length,
              }))
              .sort((a, b) => b.avgConcentration - a.avgConcentration)
              .slice(0, 4)
              .map(({ name, lat, lon, avgConcentration }) => ({
                name,
                lat,
                lon,
                pollution: { [pollutant]: parseFloat(avgConcentration.toFixed(1)) },
              }));

            for (const city of cityList) {
                let existing = countryEntry.cities.find((c) => c.name === city.name);
                if (existing) {
                    existing.pollution = { ...existing.pollution, ...city.pollution };
                } else {
                    countryEntry.cities.push(city);
                }
            }
        }
        
    
        result[country] = countryEntry;
    }
  
    return result;
}

function getAQIFromPM25(pm) {
  const breakpoints = [
    { c_low: 0.0, c_high: 12.0, i_low: 0,   i_high: 50 },
    { c_low: 12.1, c_high: 35.4, i_low: 51, i_high: 100 },
    { c_low: 35.5, c_high: 55.4, i_low: 101, i_high: 150 },
    { c_low: 55.5, c_high: 150.4, i_low: 151, i_high: 200 },
    { c_low: 150.5, c_high: 250.4, i_low: 201, i_high: 300 },
    { c_low: 250.5, c_high: 350.4, i_low: 301, i_high: 400 },
    { c_low: 350.5, c_high: Infinity, i_low: 401, i_high: 500 },
  ];

  for (const bp of breakpoints) {
    if (pm >= bp.c_low && pm <= bp.c_high) {
      return Math.round(
        ((bp.i_high - bp.i_low) / (bp.c_high - bp.c_low)) * (pm - bp.c_low) + bp.i_low
      );
    }
  }

  return null;
}

async function loadAQIData(timeframe) {
    const response = await fetch("./assets/data/air_quality_data_with_cities.json");
    const rawData = await response.json();

    const results = [];
    const years = Object.keys(rawData).map(Number).sort((a, b) => a - b);

    let data = null;
    switch (timeframe) {
        case "2023":
            data = rawData[2023]["PM2.5"];
            break;
        case "2022":
            data = rawData[2022]["PM2.5"];
            break;
        case "year":
            data = rawData[years[years.length - 1]]["PM2.5"];
            break;
        default:
            data = rawData[years[years.length - 1]]["PM2.5"];
            break;
    }

    for (const country of availableCountries) {
        if (!data[country]) {
            continue;
        }
        for (const entry of data[country]) {
            if (!entry.Latitude || !entry.Longitude) {
                continue;
            }
            const aqi = getAQIFromPM25(entry.Concentration);
            results.push([
                entry.Latitude,
                entry.Longitude,
                aqi
            ])
        }
    }
    return results;
}

async function loadEVData() {
    const rawData = await fetch("./assets/data/electric_car_share_data.json");
    const evData = await rawData.json();

    const colorScale = d3.scaleOrdinal(d3.schemeTableau10);
    const countryColors = availableCountries.map(country => colorScale(country));

    const results = {};
    for (const country of availableCountries) {
        results[country] = {
            ev_purchases: {},
            avg_pm25: {},
            color: countryColors[availableCountries.indexOf(country)],
        };

        let evDataCountry = evData[country];
        if (!evDataCountry) {
            evDataCountry = evData["Europe"]
        }
        for (const year in evDataCountry) {
            results[country].ev_purchases[year] = evDataCountry[year];
        }
    }

    const countryData = await loadAndTransformData();
    for (const year in countryData) {
        const pm25Data = countryData[year]?.["PM2.5"];
        if (pm25Data) {
            for (const entry of pm25Data) {
                if (entry.Paese in results) {
                    results[entry.Paese].avg_pm25[year] = entry.Concentrazione;
                }
            }
        }
    }

    return results;
}

export { loadAndTransformData, loadCountrySpecificData, loadAQIData, loadEVData  };