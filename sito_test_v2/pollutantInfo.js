const pollutantInfo = {
    "PM2.5": {
        name: "Fine Particulate Matter (PM2.5)",
        acceptableRange: "0–5 µg/m³ (WHO Annual Guideline 2021)",
        healthRisks: "Increased risk of respiratory and cardiovascular diseases, premature mortality.",
        emissionSources: "Combustion (vehicles, industry, power plants), biomass burning, dust.",
        guidelineValue: 5
    },
    "PM10": {
        name: "Coarse Particulate Matter (PM10)",
        acceptableRange: "0–15 µg/m³ (WHO Annual Guideline 2021)",
        healthRisks: "Irritation of the eyes, nose, and throat; respiratory issues, especially in vulnerable groups.",
        emissionSources: "Road dust, construction, industrial processes, agriculture, natural sources (pollen, sea salt).",
        guidelineValue: 15
    },
    "O3": {
        name: "Ozone (O3)",
        acceptableRange: "Peak season avg: 60 µg/m³ (WHO Guideline 2021)",
        healthRisks: "Chest pain, coughing, throat irritation, airway inflammation, reduced lung function, asthma exacerbation.",
        emissionSources: "Secondary pollutant: formed from NOx and VOCs reacting in sunlight.",
        guidelineValue: 60
    },
    "NO2": {
        name: "Nitrogen Dioxide (NO2)",
        acceptableRange: "0–10 µg/m³ (WHO Annual Guideline 2021)",
        healthRisks: "Airway inflammation, increased respiratory infections, linked to asthma development.",
        emissionSources: "Mainly from burning fuel (vehicles, power plants, industry).",
        guidelineValue: 10
    },
    "SO2": {
        name: "Sulfur Dioxide (SO2)",
        acceptableRange: "0–40 µg/m³ (WHO 24-hour Guideline 2021)",
        healthRisks: "Affects respiratory system, irritation of eyes, aggravates asthma and chronic bronchitis.",
        emissionSources: "Burning sulfur-containing fossil fuels (coal, oil) in power plants and industry; volcanoes.",
        guidelineValue: 40
    },
    "CO": {
        name: "Carbon Monoxide (CO)",
        acceptableRange: "4 mg/m³ (24-hour WHO Guideline 2021)",
        healthRisks: "Reduces oxygen delivery to organs and tissues; high levels can lead to death.",
        emissionSources: "Incomplete combustion of fossil fuels; vehicle exhaust, residential heating, wildfires.",
        guidelineValue: 4000
    },
    "Pb": {
        name: "Lead (Pb)",
        acceptableRange: "0.5 µg/m³ (WHO annual average guideline)",
        healthRisks: "Neurotoxic, especially in children; affects cognitive development and cardiovascular function.",
        emissionSources: "Industrial processes, legacy use of leaded gasoline, waste incineration.",
        guidelineValue: 0.5
    },
    "NH3": {
        name: "Ammonia (NH3)",
        acceptableRange: "No WHO guideline, but lower is better",
        healthRisks: "Can irritate eyes, nose, and throat; contributes to secondary PM2.5 formation.",
        emissionSources: "Agriculture (fertilizers, livestock), industrial activities.",
        guidelineValue: null
    },
    "NO": {
        name: "Nitric Oxide (NO)",
        acceptableRange: "No specific WHO guideline; monitor as precursor to NO2 and ozone",
        healthRisks: "Converts to NO2 in the atmosphere, contributing to respiratory problems.",
        emissionSources: "Vehicle exhaust, combustion processes, power generation.",
        guidelineValue: null
    }
};

const availablePollutants = Object.keys(pollutantInfo);

export { pollutantInfo, availablePollutants };