async function loadAndTransformData() {
    const res = await fetch('../data/aggregated_air_quality_yearly_json/all.json');
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
    const response = await fetch("../data/aggregated_air_quality_yearly_json/all.json");
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
                        if (!cities[entry.Samplingpoint]) {
                            cities[entry.Samplingpoint] = {
                                name: entry.Samplingpoint,
                                lat: entry.Latitude,
                                lon: entry.Longitude,
                                pollution: {},
                            };
                        }
                        if (!cities[entry.Samplingpoint].pollution[pollutant]) {
                            cities[entry.Samplingpoint].pollution[pollutant] = [];
                        }
                        cities[entry.Samplingpoint].pollution[pollutant].push(entry.Concentration);
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

export { loadAndTransformData, loadCountrySpecificData };