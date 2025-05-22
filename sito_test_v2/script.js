// Merged Air Quality Dashboard Script - V_Hybrid (Combines V27 animations with V34 features & V34 Popup HTML, Lollipop Labels Fix, Evolution Label Fix, Logging)
// MODIFICATO: Implementato grafico di distribuzione orizzontale, fix visibilità lollipop, stile label WHO evoluzione, rimossa potenziale label EV chart.
// MODIFICATO: Label WHO Limit (Evoluzione) colorata e più piccola. Punti Evoluzione nuovamente selezionabili e animazioni verificate. Rimosso potenziale tooltip/label indesiderato nel grafico EV.
// CORREZIONE: Fix errore "tooltip.transition(...).html is not a function", eliminazione tooltip specifico EV.
// NUOVE CORREZIONI: 1) Garantito almeno un pollutant selezionato in Evoluzione. 2) Impedito selezione stesso paese in EV.
// NUOVE CORREZIONI: 3) Riaggiunta animazione hover grafico EV. 4) Rese tratteggiate linee EV Purchases. 5) Abbellimenti estetici via pulizia codice/CSS ready.

// --- Selettori DOM (Generali) ---
const pollutantSelect = d3.select("#pollutant-select");
const flashcard = d3.select("#pollutant-info");
const tooltip = d3.select(".tooltip"); // Tooltip generico per grafici (da V27)
const themeToggleButton = d3.select("#theme-toggle-button"); // Da V34 per night mode
const currentYearFooterSpan = d3.select("#current-year-footer"); // Da V34 per footer

// --- Selettori DOM (Heatmap Europa - da V34) ---
const heatmapContainerEurope = d3.select("#heatmap-container-europe");
const heatmapTimeframeSelect = d3.select("#heatmap-timeframe-select");
const heatmapLegendContainer = d3.select("#heatmap-legend-europe");
const heatmapRadiusSlider = d3.select("#heatmap-radius-slider");
const heatmapRadiusValue = d3.select("#heatmap-radius-value");
const heatmapBlurSlider = d3.select("#heatmap-blur-slider");
const heatmapBlurValue = d3.select("#heatmap-blur-value");
const mapTooltip = d3.select("#map-tooltip"); // Tooltip specifico per la mappa AQI (heatmap - da V34)

// --- Selettori DOM (Overview - da V27) ---
const chartContainer = d3.select("#bar-chart");
const chartLoader = d3.select("#chart-loader");
const playPauseButton = d3.select("#play-pause-button");
const currentYearDisplay = d3.select("#current-year-display");
const yearSlider = d3.select("#year-slider");
const yearSliderValue = d3.select("#year-slider-value");

// --- Selettori DOM (Country View - da V27) ---
const countryViewSection = d3.select("#country-view");
const countrySelect = d3.select("#country-select");
const countryVisualizationContent = d3.select("#country-visualization-content");
const countryMapSection = d3.select("#country-map-section");
const countryStatsSection = d3.select("#country-stats-section");
const countryMapContainer = d3.select("#country-map");
const pollutantDistributionChartContainer = d3.select("#pollutant-distribution-chart");
const pollutantEvolutionChartContainer = d3.select("#pollutant-evolution-chart");
const evolutionCheckboxContainer = d3.select("#pollutant-checkbox-container");
const evolutionClickInfoContainer = d3.select("#evolution-click-info");
const selectedCountryNameMap = d3.select("#selected-country-name-map");
const selectedCountryNameStats = d3.select("#selected-country-name-stats");
const dominantPollutantDisplay = d3.select("#dominant-pollutant");
const cityComparisonChartContainer = d3.select("#city-comparison-chart");
const cityComparisonPollutantSpan = d3.select("#city-comparison-pollutant");
const cityPollutantSelect = d3.select("#city-pollutant-select");

// --- Selettori DOM (EV Air Quality Correlation - da V27) ---
const evCountrySelect1 = d3.select("#ev-country-select-1");
const evCountrySelect2 = d3.select("#ev-country-select-2");
const evAirQualityChartContainer = d3.select("#ev-air-quality-chart-container");
const evAirQualityChartDiv = d3.select("#ev-air-quality-chart");
// const evChartTooltip = d3.select("#ev-chart-tooltip"); // Rimosso: non useremo un tooltip custom per EV per ora
const evChartLegendContainer = d3.select("#ev-chart-legend");


// --- Variabili Globali e Costanti ---
let mapInstance = null; // Per la mappa specifica del paese (V27)
let currentMarkers = []; // (V27)
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'; // (V27)
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'; // (V27)
const DEFAULT_COUNTRY = "Italy"; // (V27)
const DEFAULT_POLLUTANT = "PM2.5"; // (V27)
let evolutionChartObserver = null; // (V27)
let evolutionChartAnimated = false; // (V27)
let currentlySelectedPoint = null; // (V27)
let dataForEvolutionChart = []; // (V27)
let lastCheckedPollutants = []; // (V27)

// Variabili per Heatmap (da V34)
let europeHeatmap = null;
let heatLayer = null;
let currentAqiDataPoints = [];

// --- Costanti Heatmap AQI (da V34) ---
const AQI_CATEGORIES_HEATMAP = [
    { level: "Good", min: 0, max: 50, color: "rgba(0, 228, 0, 0.7)", gradientPoint: 0.1 },
    { level: "Moderate", min: 51, max: 100, color: "rgba(255, 255, 0, 0.7)", gradientPoint: 0.25 },
    { level: "Unhealthy SG", min: 101, max: 150, color: "rgba(255, 126, 0, 0.7)", gradientPoint: 0.4 },
    { level: "Unhealthy", min: 151, max: 200, color: "rgba(255, 0, 0, 0.7)", gradientPoint: 0.6 },
    { level: "Very Unhealthy", min: 201, max: 300, color: "rgba(143, 63, 151, 0.8)", gradientPoint: 0.8 },
    { level: "Hazardous", min: 301, max: 500, color: "rgba(126, 0, 35, 0.8)", gradientPoint: 1.0 }
];
const MAX_AQI_FOR_HEATMAP = 350; // Max intensity for scaling

// --- Costanti per Popup Città (da V34) ---
const PM25_THRESHOLDS_FOR_POPUP = [
    { level: "Good", min: 0, max: 10, popupClass: 'aqi-good', icon: 'fas fa-seedling' }, // WHO Guideline 2021
    { level: "Moderate", min: 10.1, max: 25, popupClass: 'aqi-moderate', icon: 'fas fa-leaf' }, // WHO IT-1
    { level: "Unhealthy SG", min: 25.1, max: 50, popupClass: 'aqi-unhealthy-s', icon: 'fas fa-tree' }, // WHO IT-2
    { level: "Unhealthy", min: 50.1, max: 75, popupClass: 'aqi-unhealthy', icon: 'fas fa-smog' }, // Extended threshold
    { level: "Very Unhealthy", min: 75.1, max: 100, popupClass: 'aqi-very-unhealthy', icon: 'fas fa-cloud-sun' }, // Extended threshold
    { level: "Hazardous", min: 100.1, max: Infinity, popupClass: 'aqi-hazardous', icon: 'fas fa-industry' } // Extended threshold
    // Note: These are indicative thresholds, not strict official AQI boundaries for all regions.
];


// --- Costanti e Setup Grafico Overview (da V27) ---
let initialChartWidth = 600;
try { initialChartWidth = parseInt(d3.select("#bar-chart-container").style("width")) || 600; } catch (e) { console.warn("Could not parse overview chart container width.") }
let initialChartHeight = initialChartWidth > 0 ? initialChartWidth * 0.65 : 450;
const margin = { top: 30, right: 50, bottom: 75, left: 120 };
let currentChartWidth = initialChartWidth; let currentChartHeight = initialChartHeight;
function getInnerDimensions(currentWidth, currentHeight) { return { innerWidth: Math.max(10, currentWidth - margin.left - margin.right), innerHeight: Math.max(10, currentHeight - margin.top - margin.bottom) }; }
let { innerWidth, innerHeight } = getInnerDimensions(currentChartWidth, currentChartHeight);

chartContainer.html('');
const overviewSVG = chartContainer.append("svg")
    .attr("id", "overview-bar-chart-svg")
    .attr("viewBox", `0 0 ${currentChartWidth} ${currentChartHeight}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%").style("height", "auto").style("display", "block");
const x = d3.scaleLinear().range([0, innerWidth]);
const y = d3.scaleBand().range([0, innerHeight]).padding(0.25);
const overviewG = overviewSVG.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
const colorScale = d3.scaleOrdinal(d3.schemeTableau10); // (V27)

// --- Pollutant Information (da V27, V34 is identical) ---
const pollutantInfo = { "PM2.5": { name: "Fine Particulate Matter (PM2.5)", acceptableRange: "0-5 µg/m³ (WHO Annual Guideline 2021)", healthRisks: "Increased risk of respiratory and cardiovascular diseases, premature mortality.", emissionSources: "Combustion (vehicles, industry, power plants), biomass burning, dust.", guidelineValue: 5 }, "PM10": { name: "Coarse Particulate Matter (PM10)", acceptableRange: "0-15 µg/m³ (WHO Annual Guideline 2021)", healthRisks: "Irritation of the eyes, nose, and throat; respiratory issues, especially in vulnerable groups.", emissionSources: "Road dust, construction, industrial processes, agriculture, natural sources (pollen, sea salt).", guidelineValue: 15 }, "O3": { name: "Ozone (O3)", acceptableRange: "Peak season avg: 60 µg/m³ (WHO Guideline 2021)", healthRisks: "Chest pain, coughing, throat irritation, airway inflammation, reduced lung function, asthma exacerbation.", emissionSources: "Secondary pollutant: formed from NOx and VOCs reacting in sunlight.", guidelineValue: 60 }, "NO2": { name: "Nitrogen Dioxide (NO2)", acceptableRange: "0-10 µg/m³ (WHO Annual Guideline 2021)", healthRisks: "Airway inflammation, increased respiratory infections, linked to asthma development.", emissionSources: "Mainly from burning fuel (vehicles, power plants, industry).", guidelineValue: 10 }, "SO2": { name: "Sulfur Dioxide (SO2)", acceptableRange: "0-40 µg/m³ (WHO 24-hour Guideline 2021)", healthRisks: "Affects respiratory system, irritation of eyes, aggravates asthma and chronic bronchitis.", emissionSources: "Burning sulfur-containing fossil fuels (coal, oil) in power plants and industry; volcanoes.", guidelineValue: 40 }, "CO": { name: "Carbon Monoxide (CO)", acceptableRange: "4 mg/m³ (WHO 24-hour Guideline 2021)", healthRisks: "Reduces oxygen transport in blood, affects cardiovascular and nervous systems, especially in vulnerable individuals.", emissionSources: "Incomplete combustion of fuel (vehicles, heating systems, industry), wildfires.", guidelineValue: 4 } };


// --- Dati Dummy Storici (da V27, V34 is identical) ---
const years = Array.from({ length: 2024 - 2013 + 1 }, (_, i) => 2013 + i);
const baseData2024 = { "PM2.5": [ { Paese: "Poland", Concentrazione: 22.5 }, { Paese: "Bulgaria", Concentrazione: 20.1 }, { Paese: "Croatia", Concentrazione: 18.9 }, { Paese: "Italy", Concentrazione: 17.5 }, { Paese: "Romania", Concentrazione: 16.8 }, { Paese: "Czech Republic", Concentrazione: 16.2 }, { Paese: "Hungary", Concentrazione: 15.5 }, { Paese: "Slovakia", Concentrazione: 14.9 }, { Paese: "Greece", Concentrazione: 14.2 }, { Paese: "Lithuania", Concentrazione: 12.1 } ], "PM10": [ { Paese: "Poland", Concentrazione: 35.2 }, { Paese: "Bulgaria", Concentrazione: 33.0 }, { Paese: "Cyprus", Concentrazione: 31.5 }, { Paese: "Italy", Concentrazione: 29.8 }, { Paese: "Greece", Concentrazione: 28.1 }, { Paese: "Malta", Concentrazione: 27.5 }, { Paese: "Romania", Concentrazione: 26.4 }, { Paese: "Spain", Concentrazione: 24.0 } ], "O3": [ { Paese: "Italy", Concentrazione: 118 }, { Paese: "Greece", Concentrazione: 115 }, { Paese: "Spain", Concentrazione: 112 }, { Paese: "France", Concentrazione: 109 }, { Paese: "Portugal", Concentrazione: 105 }, { Paese: "Croatia", Concentrazione: 102 }, { Paese: "Germany", Concentrazione: 95 }, { Paese: "Austria", Concentrazione: 92 } ], "NO2": [ { Paese: "Belgium", Concentrazione: 28.5 }, { Paese: "Netherlands", Concentrazione: 27.1 }, { Paese: "Italy", Concentrazione: 26.0 }, { Paese: "Germany", Concentrazione: 24.8 }, { Paese: "Spain", Concentrazione: 23.5 }, { Paese: "France", Concentrazione: 22.0 }, { Paese: "Poland", Concentrazione: 21.2 }, { Paese: "Luxembourg", Concentrazione: 20.5 } ], "SO2": [ { Paese: "Bulgaria", Concentrazione: 10.5 }, { Paese: "Poland", Concentrazione: 9.8 }, { Paese: "Germany", Concentrazione: 7.2 }, { Paese: "Czech Republic", Concentrazione: 6.5 }, { Paese: "Romania", Concentrazione: 5.9 }, { Paese: "Greece", Concentrazione: 5.1 }, { Paese: "Spain", Concentrazione: 4.8 }, { Paese: "Estonia", Concentrazione: 4.2 } ] };
const historicalDummyData = {}; years.forEach(year => { historicalDummyData[year] = {}; Object.keys(baseData2024).forEach(pollutant => { historicalDummyData[year][pollutant] = baseData2024[pollutant].map(countryData => { let multiplier = 1.0; const yearDiff = 2024 - year; if (pollutant === "SO2") multiplier = 1 + yearDiff * (0.03 + Math.random() * 0.05); else if (pollutant === "NO2") multiplier = 1 + yearDiff * (0.01 + Math.random() * 0.03); else if (pollutant === "O3") multiplier = 1 - yearDiff * (0.005 + Math.random() * 0.01); else multiplier = 1 + yearDiff * (0.015 + Math.random() * 0.03); const newConcentration = Math.max(0.1, countryData.Concentrazione * multiplier * (0.95 + Math.random() * 0.1)); return { Paese: countryData.Paese, Concentrazione: parseFloat(newConcentration.toFixed(1)) }; }); }); });

// --- Dati Dummy Specifici Paese (Base da V27, Aggiunto CO da V34 City Data) ---
const countrySpecificDummyData = { "Italy": { center: [41.9, 12.5], zoom: 5, cities: [ { name: "Rome", lat: 41.9028, lon: 12.4964, pollution: { "PM2.5": 18, "NO2": 28, "O3": 120, "PM10": 30, "SO2": 3, "CO": 0.4 } }, { name: "Milan", lat: 45.4642, lon: 9.1900, pollution: { "PM2.5": 25, "NO2": 35, "O3": 110, "PM10": 38, "SO2": 4, "CO": 0.7 } }, { name: "Naples", lat: 40.8518, lon: 14.2681, pollution: { "PM2.5": 19, "NO2": 30, "O3": 115, "PM10": 32, "SO2": 2, "CO": 0.3 } }, { name: "Turin", lat: 45.0703, lon: 7.6869, pollution: { "PM2.5": 22, "NO2": 33, "O3": 105, "PM10": 35, "SO2": 3, "CO": 0.5 } } ], pollutantEvolution: { "PM2.5": Object.fromEntries(years.map(y => [y, historicalDummyData[y]["PM2.5"]?.find(c => c.Paese === "Italy")?.Concentrazione || null])), "NO2": Object.fromEntries(years.map(y => [y, historicalDummyData[y]["NO2"]?.find(c => c.Paese === "Italy")?.Concentrazione || null])), "O3": Object.fromEntries(years.map(y => [y, historicalDummyData[y]["O3"]?.find(c => c.Paese === "Italy")?.Concentrazione || null])), "PM10": Object.fromEntries(years.map(y => [y, historicalDummyData[y]["PM10"]?.find(c => c.Paese === "Italy")?.Concentrazione || null])), "SO2": Object.fromEntries(years.map(y => [y, Math.max(0.5, (historicalDummyData[y]["SO2"]?.find(c => c.Paese === "Greece")?.Concentrazione || 5) * (0.6 + Math.random()*0.2))])) } }, "Germany": { center: [51.1, 10.4], zoom: 5, cities: [ { name: "Berlin", lat: 52.5200, lon: 13.4050, pollution: { "PM2.5": 12, "NO2": 25, "O3": 98, "PM10": 20, "SO2": 8, "CO": 0.2 } }, { name: "Hamburg", lat: 53.5511, lon: 9.9937, pollution: { "PM2.5": 11, "NO2": 22, "O3": 90, "PM10": 18, "SO2": 6, "CO": 0.1 } }, { name: "Munich", lat: 48.1351, lon: 11.5820, pollution: { "PM2.5": 4.5, "NO2": 28, "O3": 105, "PM10": 19, "SO2": 5, "CO": 0.3 } }, ], pollutantEvolution: { "PM2.5": Object.fromEntries(years.map(y => [y, (historicalDummyData[y]["PM2.5"]?.find(c => c.Paese === "Germany")?.Concentrazione || 13)*(1+(2024-y)*0.02) ])), "NO2": Object.fromEntries(years.map(y => [y, historicalDummyData[y]["NO2"]?.find(c => c.Paese === "Germany")?.Concentrazione || null])), "O3": Object.fromEntries(years.map(y => [y, historicalDummyData[y]["O3"]?.find(c => c.Paese === "Germany")?.Concentrazione || null])), "SO2": Object.fromEntries(years.map(y => [y, historicalDummyData[y]["SO2"]?.find(c => c.Paese === "Germany")?.Concentrazione || null])), } }, "Poland": { center: [52.2, 19.1], zoom: 6, cities: [ { name: "Warsaw", lat: 52.2297, lon: 21.0122, pollution: { "PM2.5": 24, "NO2": 22, "PM10": 36, "O3": 85, "SO2": 10, "CO": 0.8 } }, { name: "Krakow", lat: 50.0647, lon: 19.9450, pollution: { "PM2.5": 30, "NO2": 25, "PM10": 45, "O3": 78, "SO2": 12, "CO": 0.9 } }, { name: "Wroclaw", lat: 51.1079, lon: 17.0385, pollution: { "PM2.5": 13, "NO2": 24, "PM10": 40, "O3": 80, "SO2": 11, "CO": 0.6 } }, ], pollutantEvolution: { "PM2.5": Object.fromEntries(years.map(y => [y, historicalDummyData[y]["PM2.5"]?.find(c => c.Paese === "Poland")?.Concentrazione || null])), "NO2": Object.fromEntries(years.map(y => [y, historicalDummyData[y]["NO2"]?.find(c => c.Paese === "Poland")?.Concentrazione || null])), "PM10": Object.fromEntries(years.map(y => [y, historicalDummyData[y]["PM10"]?.find(c => c.Paese === "Poland")?.Concentrazione || null])), "SO2": Object.fromEntries(years.map(y => [y, historicalDummyData[y]["SO2"]?.find(c => c.Paese === "Poland")?.Concentrazione || null])), } } };
const availableCountries = Object.keys(countrySpecificDummyData); // (V27)
const availablePollutants = Object.keys(pollutantInfo); // (V27)

// --- Variabili di Stato (Overview - da V27) ---
let timelapseInterval = null; let currentYearIndex = 0; const timelapseSpeed = 1500; let currentPollutant = null; let currentDisplayYear = years[0]; let isPlaying = false;

// --- Dati Dummy EV e Qualità Aria (da V27, V34 is identical) ---
const evDummyData = { "Italy": { color: "#1f77b4", ev_purchases: { 2018: 5000, 2019: 9000, 2020: 25000, 2021: 60000, 2022: 75000, 2023: 90000, 2024: 110000 }, avg_pm25: { 2018: 18.5, 2019: 17.9, 2020: 15.2, 2021: 14.8, 2022: 14.5, 2023: 14.1, 2024: 13.8 } }, "Germany": { color: "#ff7f0e", ev_purchases: { 2018: 40000, 2019: 63000, 2020: 194000, 2021: 356000, 2022: 470000, 2023: 520000, 2024: 600000 }, avg_pm25: { 2018: 12.2, 2019: 11.8, 2020: 10.5, 2021: 10.1, 2022: 9.8, 2023: 9.5, 2024: 9.2 } }, "France": { color: "#2ca02c", ev_purchases: { 2018: 31000, 2019: 43000, 2020: 111000, 2021: 162000, 2022: 203000, 2023: 260000, 2024: 310000 }, avg_pm25: { 2018: 11.5, 2019: 11.0, 2020: 9.8, 2021: 9.5, 2022: 9.2, 2023: 8.9, 2024: 8.5 } }, "Norway": { color: "#d62728", ev_purchases: { 2018: 72000, 2019: 80000, 2020: 105000, 2021: 113000, 2022: 138000, 2023: 150000, 2024: 160000 }, avg_pm25: { 2018: 7.0, 2019: 6.8, 2020: 6.1, 2021: 5.9, 2022: 5.5, 2023: 5.2, 2024: 5.0 } }, "Poland": { color: "#9467bd", ev_purchases: { 2018: 1500, 2019: 3000, 2020: 9000, 2021: 20000, 2022: 35000, 2023: 55000, 2024: 70000 }, avg_pm25: { 2018: 22.5, 2019: 21.8, 2020: 19.5, 2021: 18.9, 2022: 18.2, 2023: 17.5, 2024: 17.0 } } };
const evAvailableCountries = Object.keys(evDummyData); // (V27)
const evYears = [...new Set(Object.values(evDummyData).flatMap(country => Object.keys(country.ev_purchases).map(Number)))].sort(); // (V27)

// --- Variabili Globali Grafico EV (da V27) ---
let evChartWidth, evChartHeight, evChartInnerWidth, evChartInnerHeight;
const evChartMargin = { top: 50, right: 100, bottom: 70, left: 90 };

// --- Funzioni Ausiliarie ---
// debounce, showLoader, hideLoader, calculateZScores from V27
function debounce(func, wait, immediate) { let timeout; return function executedFunction() { const context = this; const args = arguments; const later = function() { timeout = null; if (!immediate) func.apply(context, args); }; const callNow = immediate && !timeout; clearTimeout(timeout); timeout = setTimeout(later, wait); if (callNow) func.apply(context, args); }; }
function showLoader() { chartLoader.style("display", "flex").style("opacity", 1); }
function hideLoader() { chartLoader.transition("loaderFade").duration(200).style("opacity", 0).end().then(() => chartLoader.style("display", "none")).catch(() => chartLoader.style("display", "none")); }

function calculateZScores(data) { const values = Object.values(data).filter(v => typeof v === 'number' && isFinite(v)); if (values.length < 2) return Object.keys(data).reduce((acc, key) => { acc[key] = 0; return acc; }, {}); const mean = d3.mean(values); const stdDev = d3.deviation(values); if (stdDev === 0 || stdDev === undefined || !isFinite(stdDev)) return Object.keys(data).reduce((acc, key) => { acc[key] = (typeof data[key] === 'number' && isFinite(data[key])) ? 0 : NaN; return acc; }, {}); const zScores = {}; for (const key in data) { if (typeof data[key] === 'number' && isFinite(data[key])) zScores[key] = (data[key] - mean) / stdDev; else zScores[key] = NaN; } return zScores; }

// haversineDistance from V34 (for heatmap tooltip)
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    lat1 = lat1 * Math.PI / 180;
    lat2 = lat2 * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// --- GESTIONE TEMA (da V34) ---
function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    themeToggleButton.select("i").attr("class", theme === "dark" ? "fas fa-sun" : "fas fa-moon");
    localStorage.setItem("dashboardTheme", theme);
    console.log(`Theme applied: ${theme}`);
    // Update map tile layers if maps are initialized for better theme consistency
    if (europeHeatmap) {
        // May need to re-initialize or update tile layer appearance if using custom themed tiles
    }
    if (mapInstance) {
        // Same as above for country map
    }
}
function toggleTheme() {
    const currentTheme = document.documentElement.dataset.theme || "light";
    const newTheme = currentTheme === "light" ? "dark" : "light";
    applyTheme(newTheme);
}
function loadThemePreference() {
    const preferredTheme = localStorage.getItem("dashboardTheme");
    if (preferredTheme) {
        applyTheme(preferredTheme);
    } else {
        applyTheme(document.documentElement.dataset.theme || 'light');
    }
}


// --- FUNZIONI TOOLTIP GLOBALE (da V27) ---
// Helper function to position the tooltip
function positionTooltip(event, tooltipSelection) {
     if (tooltipSelection.empty()) return;
     const tooltipNode = tooltipSelection.node();
     if (!tooltipNode) return;

     // Get tooltip dimensions after content is set
     const rect = tooltipNode.getBoundingClientRect();
     const tooltipWidth = rect.width;
     const tooltipHeight = rect.height;

     // Get viewport dimensions
     const viewportWidth = window.innerWidth;
     const viewportHeight = window.innerHeight;

     // Calculate desired position
     let left = event.pageX + 12;
     let top = event.pageY - tooltipHeight - 12; // Position above the cursor

     // Adjust if it goes off the right edge
     if (left + tooltipWidth > viewportWidth - 20) { // 20px margin from right edge
         left = event.pageX - tooltipWidth - 12; // Position to the left of the cursor
     }

     // Adjust if it goes off the top edge
     if (top < 10) { // 10px margin from top edge
         top = event.pageY + 18; // Position below the cursor
     }

     // Apply position
     tooltipSelection.style("left", left + "px").style("top", top + "px");
}

function handleMouseOver(event, d) {
    // Set HTML content first
    let countryName = d.Paese || d.name || d.pollutant || "N/A";
    let value, unit, isZScore = false, yearInfo = d.year || null;

    if (d.hasOwnProperty('Concentrazione')) {
        value = d.Concentrazione;
        unit = 'µg/m³';
    } else if (d.hasOwnProperty('value') && d.hasOwnProperty('year')) {
        value = d.value;
        unit = 'µg/m³';
    } else if (d.hasOwnProperty('zScore')) { // Per Z-score Chart
        value = d.zScore;
        unit = 'Z';
        isZScore = true;
    } else if (d.hasOwnProperty('value')) { // Fallback per altre strutture con 'value' (es. EV chart points se usassero questo)
        value = d.value;
        unit = d.unit || 'µg/m³';
    } else {
        value = 0;
        unit = '';
    }

    tooltip.html(`
        <div class="tooltip-country">${countryName}</div>
        <div class="tooltip-detail">
            <span class="tooltip-value">${(value || 0).toFixed(isZScore ? 2 : 1)}</span>
            <span class="tooltip-unit">${unit}</span>
        </div>
        ${yearInfo ? `<div class="tooltip-year">(${yearInfo})</div>` : ''}
    `);

    // Then transition appearance
    tooltip.transition("tooltipFade").duration(100).style("opacity", 1).style("transform", "translateY(0px)");

    // Position the tooltip
    positionTooltip(event, tooltip);

    // Apply visual highlight to the element
    d3.select(this).style("filter", "brightness(0.85)");
}

function handleMouseOut(event, d) {
    // Transition appearance to hide
    tooltip.transition("tooltipFadeOut").duration(150).style("opacity", 0).style("transform", "translateY(5px)");

    // Revert visual highlight
    d3.select(this).style("filter", "brightness(1)");
}


// --- Funzioni Aggiornamento UI (Overview Chart - da V27) ---
function updateChart(pollutantKey, data, year, updateSlider = true) {

    console.log(`Updating chart for ${pollutantKey} in ${year}`);

    try { currentChartWidth = parseInt(d3.select("#bar-chart-container").style("width")) || currentChartWidth; } catch(e){}
    currentChartHeight = currentChartWidth * 0.65;
    overviewSVG.attr("viewBox", `0 0 ${currentChartWidth} ${currentChartHeight}`);
    const dims = getInnerDimensions(currentChartWidth, currentChartHeight);
    innerWidth = dims.innerWidth; innerHeight = dims.innerHeight;
    x.range([0, innerWidth]); y.range([0, innerHeight]);
    overviewG.attr("transform", `translate(${margin.left},${margin.top})`);
    const validData = Array.isArray(data) ? data : [];
    const sortedData = validData.sort((a, b) => b.Concentrazione - a.Concentrazione);
    const top5Data = sortedData.slice(0, 5);
    const guidelineValue = pollutantInfo[pollutantKey]?.guidelineValue;
    const maxConcentration = d3.max(top5Data, d => d.Concentrazione) || 0;
    const upperXDomain = guidelineValue !== undefined ? Math.max(maxConcentration, guidelineValue) : maxConcentration;
    x.domain([0, upperXDomain * 1.05 || 10]).nice();
    y.domain(top5Data.map(d => d.Paese));
    colorScale.domain(availableCountries);

    const t_overview = overviewSVG.transition("overviewTrans").duration(750).ease(d3.easeCubicOut); // V27 duration
    const t_fast_overview = overviewSVG.transition("overviewFastTrans").duration(300).ease(d3.easeLinear); // V27 duration
    const enterDelay = 100; // V27 delay

    const bars = overviewG.selectAll(".bar").data(top5Data, d => d.Paese);
    bars.exit().transition(t_overview).attr("width", 0).style("opacity", 0).remove();

    const barsEnter = bars.enter().append("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("y", d => y(d.Paese) ?? 0)
        .attr("width", 0)
        .attr("height", y.bandwidth())
        .style("opacity", 0)
        .style("fill", d => colorScale(d.Paese))
        .attr("aria-label", d => `${d.Paese}: ${d.Concentrazione.toFixed(2)} µg/m³`);

    barsEnter.merge(bars)
        .on("mouseover", handleMouseOver) // Usa il tooltip globale (V27)
        .on("mouseout", handleMouseOut)   // Usa il tooltip globale (V27)
        .on("click", function(event, d) { // Click to navigate (from V34, but simple and useful)
            console.log(`Bar clicked: ${d.Paese}`);
            if (availableCountries.includes(d.Paese)) {
                countrySelect.property("value", d.Paese);
                loadCountryData(d.Paese);
                const countryViewNode = countryViewSection.node();
                if (countryViewNode) {
                    countryViewNode.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            } else {
                console.warn(`Country ${d.Paese} not available in specific view.`);
            }
        })
        .transition(t_overview)
        .delay((d, i, nodes) => d3.select(nodes[i]).attr('width') === '0' ? i * enterDelay : 0)
        .attr("y", d => y(d.Paese) ?? 0)
        .attr("width", d => Math.max(0, x(d.Concentrazione)))
        .attr("height", y.bandwidth())
        .style("opacity", 1)
        .style("fill", d => colorScale(d.Paese));

    overviewG.selectAll(".bar-hover-label").remove(); // Remove V27 specific labels if any

    const yAxisGenerator = d3.axisLeft(y).tickSize(0).tickPadding(10);
    const yAxis = overviewG.selectAll(".y-axis.overview-axis").data([null]);
    yAxis.enter().append("g").attr("class", "y-axis overview-axis axis").attr("aria-hidden", "true").merge(yAxis).transition(t_overview).call(yAxisGenerator).selectAll(".tick text").attr("transform", "translate(-5, 0)");
    const xAxisGenerator = d3.axisBottom(x).ticks(Math.max(2, Math.floor(innerWidth / 80))).tickFormat(d => d).tickSizeInner(-(innerHeight)).tickPadding(10).tickSizeOuter(0);
    const xAxisYPosition = innerHeight;
    const xAxis = overviewG.selectAll(".x-axis.overview-axis").data([null]);
    const xAxisGroup = xAxis.enter().append("g").attr("class", "x-axis overview-axis axis").attr("transform", `translate(0,${xAxisYPosition})`).attr("aria-hidden", "true").merge(xAxis);
    xAxisGroup.transition(t_overview).attr("transform", `translate(0,${xAxisYPosition})`).call(xAxisGenerator);
    overviewG.selectAll(".x-axis.overview-axis .tick line").attr("stroke", "var(--grid-line-color)").attr("stroke-dasharray", "var(--grid-line-style)");
    overviewG.select(".x-axis.overview-axis .domain").attr("stroke", "var(--axis-line-color)");
    overviewG.selectAll(".x-axis-label.overview-label").remove();
    overviewG.append("text").attr("class", "x-axis-label overview-label axis-label").attr("x", innerWidth / 2).attr("y", innerHeight + margin.bottom - 25).text(`Average Concentration (${pollutantKey}, µg/m³ )`);
    overviewG.selectAll(".guideline-group").remove();
    if (guidelineValue !== undefined && guidelineValue > 0) { const guidelineX = x(guidelineValue); if (guidelineX >= 0 && guidelineX <= innerWidth) { const guidelineGroup = overviewG.append("g").attr("class", "guideline-group").attr("aria-label", `WHO Guideline limit: ${guidelineValue} µg/m³`); guidelineGroup.append("line").attr("x1", guidelineX).attr("x2", guidelineX).attr("y1", -5).attr("y2", innerHeight).style("opacity", 0).transition(t_overview.delay(200)).style("opacity", 0.8); guidelineGroup.append("text").attr("x", guidelineX).attr("y", -12).text(`WHO Guideline (${guidelineValue})`).style("opacity", 0).transition(t_overview.delay(200)).style("opacity", 1); } }
    const yearText = overviewG.selectAll(".year-overlay-text").data([year]);
    yearText.enter().append("text").attr("class", "year-overlay-text").attr("x", innerWidth - 5).attr("y", 5).style("opacity", 0).merge(yearText).text(d => d).transition(t_fast_overview).attr("x", innerWidth - 5).attr("y", 5).style("opacity", 0.65);

    currentYearDisplay.text(year); yearSliderValue.text(year); if (updateSlider) { yearSlider.property("value", year); }
}

function updatePollutantInfo(pollutantKey) { // (da V27)
    const info = pollutantInfo[pollutantKey]; flashcard.classed("updating", true);
    setTimeout(() => {
        flashcard.select("#pollutant-name").html(info ? info.name : "N/A");
        flashcard.select("#acceptable-range").text(info ? `${info.acceptableRange}` : "N/A");
        flashcard.select("#health-risks").text(info ? info.healthRisks : "N/A");
        flashcard.select("#emission-sources").text(info ? info.emissionSources : "N/A");
        setTimeout(() => { flashcard.classed("updating", false); }, 50);
    }, 100);
}
function stopTimelapse() { // (da V27)
    if (timelapseInterval) { clearInterval(timelapseInterval); timelapseInterval = null; isPlaying = false; playPauseButton.attr("aria-label", "Play timelapse").select("i").attr("class", "fas fa-play"); }
}
function runTimelapseStep() { // (da V27)
    if (!currentPollutant || !isPlaying) { stopTimelapse(); return; }
    currentDisplayYear = years[currentYearIndex];
    const dataForYear = historicalDummyData[currentDisplayYear]?.[currentPollutant];
    if (dataForYear) { updateChart(currentPollutant, dataForYear, currentDisplayYear, true); }
    else { console.warn(`No data for ${currentPollutant} in ${currentDisplayYear}`); updateChart(currentPollutant, [], currentDisplayYear, true); }
    currentYearIndex++; if (currentYearIndex >= years.length) { currentYearIndex = 0; }
}
function startTimelapse(pollutantKey) { // (da V27)
    stopTimelapse(); if (pollutantKey) { currentPollutant = pollutantKey; } else if (!currentPollutant) { console.error("Cannot start timelapse."); return; }
    isPlaying = true; playPauseButton.attr("aria-label", "Pause timelapse").select("i").attr("class", "fas fa-pause");
    runTimelapseStep(); timelapseInterval = setInterval(runTimelapseStep, timelapseSpeed);
}
function togglePlayPause() { // (da V27)
    if (isPlaying) { stopTimelapse(); }
    else { const selectedPollutant = pollutantSelect.property("value"); if (selectedPollutant) { startTimelapse(selectedPollutant); } else { console.warn("Select pollutant first."); } }
}


// --- Funzioni Heatmap Europa (da V34) ---
function generateDummyAQIData(timeframe) {
    console.log(`Generating AQI data for timeframe: ${timeframe}`);
    currentAqiDataPoints = [];
    const minLat = 34, maxLat = 71;
    const minLon = -25, maxLon = 45;
    let numPoints = 350 + Math.floor(Math.random() * 100) - 50;
    if (timeframe === 'month') numPoints = 300 + Math.floor(Math.random() * 80) - 40;
    else if (timeframe === 'year' || !isNaN(parseInt(timeframe))) numPoints = 250 + Math.floor(Math.random() * 60) - 30;

    const zones = [
        { name: "Scandinavia Rural", latRange: [59, 70], lonRange: [5, 28], baseMinAQI: 5, baseMaxAQI: 35, pointDensityFactor: 0.8 },
        { name: "UK Metro", lat: 51.5, lon: -0.1, radius: 1.5, baseMinAQI: 40, baseMaxAQI: 130, pointDensityFactor: 1.5 },
        { name: "Benelux Industrial", lat: 50.8, lon: 4.7, radius: 2.0, baseMinAQI: 60, baseMaxAQI: 180, pointDensityFactor: 1.8 },
        { name: "Paris Basin", lat: 48.85, lon: 2.35, radius: 1.8, baseMinAQI: 50, baseMaxAQI: 160, pointDensityFactor: 1.6 },
        { name: "German Industrial (Ruhr)", lat: 51.5, lon: 7.0, radius: 2.2, baseMinAQI: 70, baseMaxAQI: 190, pointDensityFactor: 2.0 },
        { name: "Alpine Clean", latRange: [45.5, 47.5], lonRange: [6, 14], baseMinAQI: 10, baseMaxAQI: 45, pointDensityFactor: 0.7 },
        { name: "Iberian Coast (Clean)", latRange: [36, 43], lonRange: [-9, 3], baseMinAQI: 15, baseMaxAQI: 60, pointDensityFactor: 0.9, isCoastal: true },
        { name: "Italian Po Valley", lat: 45.3, lon: 9.8, radius: 2.8, baseMinAQI: 80, baseMaxAQI: 220, pointDensityFactor: 2.2 },
        { name: "Eastern Europe Hotspot", lat: 50.0, lon: 21.0, radius: 2.5, baseMinAQI: 90, baseMaxAQI: 250, pointDensityFactor: 2.0 },
        { name: "Balkan Urban", lat: 44.0, lon: 21.0, radius: 2.0, baseMinAQI: 60, baseMaxAQI: 170, pointDensityFactor: 1.5 },
        { name: "Mediterranean Islands", latRange: [35, 42], lonRange: [5, 28], baseMinAQI: 20, baseMaxAQI: 70, pointDensityFactor: 0.6, isIsland: true }
    ];
    let timeMultiplier = 1.0;
    if (timeframe === 'month') timeMultiplier = 1.0 + (Math.random() * 0.1 - 0.05);
    else if (timeframe === 'year') timeMultiplier = 1.1 + (Math.random() * 0.15 - 0.07);
    else if (!isNaN(parseInt(timeframe))) {
        const yearDiff = new Date().getFullYear() - parseInt(timeframe);
        timeMultiplier = 1 + (yearDiff * (0.04 + (Math.random() * 0.03 - 0.015)));
    }

    for (let i = 0; i < numPoints; i++) {
        let lat, lon, aqi;
        const zone = zones[Math.floor(Math.random() * zones.length)];
        if (zone.radius) {
            const angle = Math.random() * 2 * Math.PI;
            const rFactor = Math.sqrt(Math.random());
            const currentRadius = zone.radius * (0.5 + Math.random() * 0.7);
            lat = zone.lat + currentRadius * rFactor * Math.sin(angle);
            lon = zone.lon + currentRadius * rFactor * Math.cos(angle) * 1.6; // Adjust longitude spread
            aqi = zone.baseMinAQI + Math.random() * (zone.baseMaxAQI - zone.baseMinAQI);
        } else { // Rectangular zone
            lat = zone.latRange[0] + Math.random() * (zone.latRange[1] - zone.latRange[0]);
            lon = zone.lonRange[0] + Math.random() * (zone.lonRange[1] - zone.lonRange[0]);
            aqi = zone.baseMinAQI + Math.random() * (zone.baseMaxAQI - zone.baseMinAQI);
        }
        aqi *= timeMultiplier * (0.85 + Math.random() * 0.3); // Apply time and random variation
        aqi = Math.max(5, Math.min(MAX_AQI_FOR_HEATMAP + 100, Math.round(aqi))); // Cap AQI, ensure minimum
        lat = Math.max(minLat - 2, Math.min(maxLat + 2, lat)); // Clamp latitude
        lon = Math.max(minLon - 2, Math.min(maxLon + 2, lon)); // Clamp longitude
        currentAqiDataPoints.push([lat, lon, aqi, zone.name]); // Store lat, lon, intensity, and zone name for tooltip
    }
    const aqiValuesOnly = currentAqiDataPoints.map(d => d[2]);
    console.log(`Generated AQI values for timeframe: ${timeframe}: Min=${Math.min(...aqiValuesOnly)}, Max=${Math.max(...aqiValuesOnly)}, Count=${currentAqiDataPoints.length}`);
    return currentAqiDataPoints;
}

function updateEuropeHeatmap(timeframe = null) {
    if (!europeHeatmap || typeof L.heatLayer === 'undefined') {
        console.warn("Europe heatmap or Leaflet.heat plugin not initialized. Cannot update.");
        heatmapContainerEurope.html('<p class="placeholder-text error-text">Heatmap library not ready. Update aborted.</p>');
        return;
    }
    if (timeframe) {
      heatmapTimeframeSelect.property("value", timeframe);
    } else {
      timeframe = heatmapTimeframeSelect.property("value");
    }

    heatmapContainerEurope.select(".placeholder-text").remove();
    console.log(`Updating Europe heatmap for timeframe: ${timeframe}`);

    // Generate new data points. The third element (index 2) is the AQI value for intensity.
    const aqiDataForLayer = generateDummyAQIData(timeframe).map(p => [p[0], p[1], p[2]]);

    if (heatLayer) {
        europeHeatmap.removeLayer(heatLayer);
    }

    const gradientAQI = {};
    AQI_CATEGORIES_HEATMAP.forEach(cat => { gradientAQI[cat.gradientPoint] = cat.color; });

    const radius = +heatmapRadiusSlider.property("value");
    const blur = +heatmapBlurSlider.property("value");

    heatLayer = L.heatLayer(aqiDataForLayer, {
        radius: radius,
        blur: blur,
        maxZoom: europeHeatmap.getMaxZoom(), // Use map's maxZoom
        max: MAX_AQI_FOR_HEATMAP,       // Max intensity for scaling
        gradient: gradientAQI,
        minOpacity: 0.25
    }).addTo(europeHeatmap);
    console.log(`New heatLayer added with radius: ${radius}, blur: ${blur}, maxIntensity: ${MAX_AQI_FOR_HEATMAP}`);

    createOrUpdateHeatmapLegend();
}

function createOrUpdateHeatmapLegend() {
    if (heatmapLegendContainer.empty()) {
        console.error("#heatmap-legend-europe container not found. Cannot create legend.");
        return;
    }
    heatmapLegendContainer.html(''); // Clear previous legend
    heatmapLegendContainer.append("h4").text("AQI Legend");
    const legendItems = heatmapLegendContainer.selectAll(".heatmap-legend-item")
        .data(AQI_CATEGORIES_HEATMAP) // Use the AQI categories
        .enter()
        .append("div")
        .attr("class", "heatmap-legend-item")
        .on("mouseover", function(event, d) { // Simple hover effect
            d3.select(this).style("background-color", "var(--border-secondary)");
        })
        .on("mouseout", function(event, d) {
            d3.select(this).style("background-color", "transparent");
        });

    legendItems.append("span")
        .attr("class", "legend-color-box")
        .style("background-color", d => d.color.replace(/, 0\.\d+\)/, ', 1)')); // Use full opacity for color box

    legendItems.append("span")
        .attr("class", "legend-text")
        .text(d => {
            if (d.max === 500) return `${d.level} (${d.min}+)`; // For the last category (Hazardous)
            return `${d.level} (${d.min} - ${d.max})`;
        });
    console.log("Heatmap legend created/updated.");
}

function initializeEuropeHeatmap() {
    console.log("Attempting to initialize Europe AQI heatmap...");
    if (typeof L === 'undefined' || typeof L.heatLayer === 'undefined') {
        console.error("Leaflet or Leaflet.heat is not loaded! Cannot initialize heatmap.");
        heatmapContainerEurope.html('<p class="placeholder-text error-text">Map library (Leaflet/Leaflet.heat) could not be loaded. Heatmap disabled.</p>');
        heatmapLegendContainer.html('<p class="error-text" style="text-align:center; font-size:0.9em;">Legend unavailable</p>');
        return;
    }
    heatmapContainerEurope.select(".placeholder-text").text("Initializing AQI heatmap...");

    try {
        // Define geographical bounds for Europe to restrict map panning
        const southWestEurope = L.latLng(32, -27); // Adjusted SW bound
        const northEastEurope = L.latLng(71, 50);  // Adjusted NE bound
        const europeBounds = L.latLngBounds(southWestEurope, northEastEurope);

        europeHeatmap = L.map('heatmap-container-europe', {
            scrollWheelZoom: true, // Enable scroll wheel zoom
            worldCopyJump: false,  // Prevent map copies when panning outside bounds
            maxBounds: europeBounds, // Restrict map to these bounds
            maxBoundsViscosity: 0.95 // How much the map resists dragging out of bounds
        }).setView([53, 15], 4); // Centered more on Europe, adjusted zoom
        europeHeatmap.setMinZoom(3); europeHeatmap.setMaxZoom(10); // Sensible zoom range

        L.tileLayer(TILE_URL, {
            attribution: TILE_ATTRIBUTION,
            minZoom: europeHeatmap.getMinZoom(), // Use map's minZoom
            maxZoom: 18, // Allow deeper zoom on tiles if needed, heatmap has its own maxZoom
            bounds: europeBounds // Helps performance by not loading tiles outside this
        }).addTo(europeHeatmap);

        // Set initial slider values from HTML or defaults
        heatmapRadiusSlider.property("value", 25);
        heatmapRadiusValue.text(25);
        heatmapBlurSlider.property("value", 15);
        heatmapBlurValue.text(15);

        updateEuropeHeatmap(heatmapTimeframeSelect.property("value")); // Initial load

        // Event listeners for controls
        heatmapTimeframeSelect.on("change", function() { updateEuropeHeatmap(d3.select(this).property("value")); });
        heatmapRadiusSlider.on("input", function() {
            const value = d3.select(this).property("value");
            heatmapRadiusValue.text(value);
            updateEuropeHeatmap(); // Update with current timeframe
        });
        heatmapBlurSlider.on("input", function() {
            const value = d3.select(this).property("value");
            heatmapBlurValue.text(value);
            updateEuropeHeatmap(); // Update with current timeframe
        });

        // Tooltip on hover
        europeHeatmap.on('mousemove', function(e) {
            if (!currentAqiDataPoints || currentAqiDataPoints.length === 0 || !heatLayer) {
                mapTooltip.style("display", "none");
                return;
            }
            // Find the nearest data point for more relevant tooltip info
            let nearestPoint = null;
            let minDist = Infinity;
            currentAqiDataPoints.forEach(point => { // point is [lat, lon, aqiValue, zoneName]
                const dist = haversineDistance(e.latlng.lat, e.latlng.lng, point[0], point[1]);
                // Adjust search radius based on zoom level (e.g., in pixels on screen)
                // Simple distance check, you might need more sophisticated screen-pixel distance check
                const screenDist = europeHeatmap.latLngToContainerPoint(e.latlng).distanceTo(europeHeatmap.latLngToContainerPoint(L.latLng(point[0], point[1])));
                if (screenDist < 50 && screenDist < minDist) { // Threshold 50 pixels
                     minDist = screenDist;
                     nearestPoint = point;
                }
            });

            if (nearestPoint) {
                mapTooltip
                    .style("display", "block")
                    .style("left", (e.containerPoint.x + 15) + "px")
                    .style("top", (e.containerPoint.y - 30) + "px")
                    .html(`Lat: ${nearestPoint[0].toFixed(2)}, Lon: ${nearestPoint[1].toFixed(2)}<br>Approx. AQI: <strong>${nearestPoint[2]}</strong>`); // Use nearest point coords for tooltip
            } else {
                mapTooltip.style("display", "none");
            }
        });
        europeHeatmap.on('mouseout', function() { mapTooltip.style("display", "none"); });

        // Enhanced popup on click
        europeHeatmap.on('click', function(e) {
            if (!currentAqiDataPoints || currentAqiDataPoints.length === 0 || !heatLayer) return;
            let nearestPoint = null;
            let minDist = Infinity;
             // Find the nearest data point on click too
            currentAqiDataPoints.forEach(point => { // point is [lat, lon, aqiValue, zoneName]
                const dist = haversineDistance(e.latlng.lat, e.latlng.lng, point[0], point[1]);
                if (dist < minDist) { // Search within a larger geographical radius on click? Or maybe same as hover?
                    minDist = dist; // Let's stick to geographical for click for simplicity
                    nearestPoint = point;
                }
            });

            let popupContent = `<strong>Location Details (Simulated)</strong><br>Lat: ${e.latlng.lat.toFixed(3)}, Lon: ${e.latlng.lng.toFixed(3)}`;
            if (nearestPoint && minDist < 200) { // Use a distance threshold for popup on click (e.g. 200km)
                popupContent += `<br>Approx. AQI: <strong>${nearestPoint[2]}</strong> (from zone: ${nearestPoint[3]})`;
                const simulatedFactors = ["local traffic", "regional transport", "weather patterns", "industrial activity", "natural sources"];
                popupContent += `<br><small>Possible factors: ${simulatedFactors[Math.floor(Math.random()*simulatedFactors.length)]} (example)</small>`;
            } else {
                popupContent += `<br>No detailed data nearby.`;
            }

            L.popup()
             .setLatLng(e.latlng)
             .setContent(popupContent)
             .openOn(europeHeatmap);
        });


        createOrUpdateHeatmapLegend();
        setTimeout(() => { if (europeHeatmap) europeHeatmap.invalidateSize(); }, 250); // Ensure map size is correct after init
        console.log("Europe AQI heatmap initialized successfully with interactive features.");

    } catch (error) {
        console.error("Error during Europe AQI heatmap initialization:", error);
        heatmapContainerEurope.html(`<p class="placeholder-text error-text">Error initializing heatmap: ${error.message}</p>`);
        heatmapLegendContainer.html('<p class="error-text" style="text-align:center; font-size:0.9em;">Legend unavailable due to error.</p>');
    }
}


// --- Funzioni Vista Paese (da V27 per animazioni e logica specifica, modificate per lollipop e evoluzione) ---
function populateCountryDropdowns() { // (da V27)
    countrySelect.selectAll("option").data([DEFAULT_COUNTRY, ...availableCountries.filter(c => c !== DEFAULT_COUNTRY)])
        .enter().append("option").attr("value", d => d).text(d => d);
    countrySelect.property("value", DEFAULT_COUNTRY);
}

// Function to create popup content for country map markers (DA V34 script.js per lo stile card)
function createPopupContent(city) {
    const pm25Value = city.pollution?.['PM2.5'];

    // Determine AQI category based on PM2.5 (simplified for popup)
    let aqiCategoryDetails = PM25_THRESHOLDS_FOR_POPUP.find(cat => pm25Value >= cat.min && (pm25Value <= cat.max || cat.max === Infinity));
    if (!aqiCategoryDetails && pm25Value !== undefined && pm25Value !== null) {
         // Fallback if value is outside known thresholds, default to highest
         aqiCategoryDetails = PM25_THRESHOLDS_FOR_POPUP[PM25_THRESHOLDS_FOR_POPUP.length -1]; // Hazardous
    } else if (!aqiCategoryDetails || pm25Value === undefined || pm25Value === null) {
         // Handle missing/null PM2.5
         aqiCategoryDetails = { level: 'Unknown', popupClass: 'aqi-unknown', icon: 'fas fa-question-circle' };
    }


    let pollutantListHtml = '<ul class="popup-pollutant-list">';
    // Ordine preferito con CO aggiunto da V34 data
    const displayOrder = ["PM2.5", "PM10", "NO2", "O3", "SO2", "CO"];
    // Filtra gli inquinanti disponibili per questa città in base all'ordine preferito
    const availablePollutantsForCity = displayOrder.filter(p => city.pollution && city.pollution.hasOwnProperty(p));


    if (availablePollutantsForCity.length > 0) {
         availablePollutantsForCity.forEach(pollutantKey => {
            const value = city.pollution[pollutantKey];
             const info = pollutantInfo[pollutantKey]; // Assuming pollutantInfo is available globally
             const unit = (pollutantKey === 'CO' ? 'mg/m³' : 'µg/m³'); // CO uses mg/m³
             // Formatta il valore, CO con 2 decimali, altri con 1
             let valueText = (value !== undefined && value !== null) ? value.toFixed(pollutantKey === 'CO' ? 2 : 1) : 'N/A';

            pollutantListHtml += `
                <li class="popup-pollutant-item">
                    <span class="pollutant-name">${info ? info.name.split("(")[0].trim() : pollutantKey}</span>
                    <span class="pollutant-value">${valueText} ${unit}</span>
                </li>`;
         });
    } else {
        pollutantListHtml += `<li class="popup-pollutant-item">No detailed data available.</li>`;
    }
    pollutantListHtml += '</ul>';


    // Dummy timestamp basato sull'ora corrente (esempio)
    const now = new Date();
    const timestamp = `Updated: ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} ${now.getDate()}/${now.getMonth() + 1}`;


    return `
        <div class="popup-header ${aqiCategoryDetails.popupClass}">
            <span class="popup-aqi-icon"><i class="${aqiCategoryDetails.icon}"></i></span>
            <span class="popup-aqi-category">${aqiCategoryDetails.level}</span>
        </div>
        <div class="popup-body">
            <h4 class="popup-city-name">${city.name}</h4>
            ${pollutantListHtml}
        </div>
        <div class="popup-timestamp">${timestamp}</div>`;
}


function updateCountryMap(countryName, countryData, initialLoad = true) { // (Base da V27, Modificata per usare createPopupContent V34)
    console.log(`Updating map for ${countryName}`); // Log di debug
    if (!countryMapContainer.node()) { console.error("Country map container not found."); return; }
    countryMapContainer.html(''); // Clear previous map or placeholder

    if (typeof L === 'undefined') {
        countryMapContainer.html('<p class="placeholder-text error-text">Map library (Leaflet) could not be loaded.</p>');
        return;
    }

    const mapId = `country-map-div-${new Date().getTime()}`; // Unique ID for map container
    countryMapContainer.append('div').attr('id', mapId).style('width', '100%').style('height', '100%');

    if (mapInstance) { mapInstance.remove(); mapInstance = null; }
    currentMarkers.forEach(marker => marker.remove()); currentMarkers = [];

    mapInstance = L.map(mapId).setView(countryData.center, countryData.zoom);
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, minZoom: 4, maxZoom: 12 }).addTo(mapInstance); // V27 zoom levels

    (countryData.cities || []).forEach(city => {
        if (city.lat !== undefined && city.lon !== undefined) {
            // Utilizza L.marker senza specificare un'icona custom per usare il default (come richiesto prima)
            const marker = L.marker([city.lat, city.lon], {}) // Opzioni vuote o default Leaflet
                .addTo(mapInstance)
                // Chiama la NUOVA funzione createPopupContent V34, passando l'oggetto city
                .bindPopup(createPopupContent(city), {offset: L.point(0, -15)}); // Aggiustato offset per default marker
            currentMarkers.push(marker);
        }
    });
    setTimeout(() => { if(mapInstance) mapInstance.invalidateSize({animate: true}); }, 100); // V27 animate:true
    selectedCountryNameMap.text(countryName);
    countryMapSection.style("opacity", 0).style("transform", "translateY(10px)")
        .transition().duration(500).delay(initialLoad ? 100 : 0) // V27 timings
        .style("opacity", 1).style("transform", "translateY(0px)");
}

// Function to update the pollutant distribution chart (MODIFICATA per grafico orizzontale)
function updatePollutantDistributionChart(countryName, countryData, selectedCityPollutant, initialLoad = true) {
    console.log(`Updating distribution chart for ${countryName} (Horizontal)`); // Log di debug
    if (!pollutantDistributionChartContainer.node()) return;
    pollutantDistributionChartContainer.html(''); // Clear previous

    const statsData = (countryData.cities || []).flatMap(city =>
        Object.entries(city.pollution || {}).map(([pollutant, value]) => ({ city: city.name, pollutant, value }))
    );
    console.log("Distribution chart raw data:", statsData); // Log di debug

    if (statsData.length === 0) {
        pollutantDistributionChartContainer.html('<p class="placeholder-text">No detailed city pollution data for Z-score distribution.</p>');
        dominantPollutantDisplay.html('N/A');
        return;
    }

    const avgPollutionByPollutant = {};
    const relevantPollutantsForStats = availablePollutants.filter(p => statsData.some(d => d.pollutant === p));

    relevantPollutantsForStats.forEach(p => {
        const values = statsData.filter(d => d.pollutant === p && typeof d.value === 'number').map(d => d.value);
        avgPollutionByPollutant[p] = values.length > 0 ? d3.mean(values) : NaN; // Store NaN if no data
    });

    console.log("Avg pollution by pollutant for distribution:", avgPollutionByPollutant); // Log di debug
    const zScores = calculateZScores(avgPollutionByPollutant);

    // Filter out NaN Z-scores and sort by Z-score magnitude for display order
    const zScoreData = Object.entries(zScores)
        .filter(([pollutant, zScore]) => !isNaN(zScore))
        .map(([pollutant, zScore]) => ({ pollutant, zScore: parseFloat(zScore.toFixed(2)) }));
        // Sort based on the order in the image (PM2.5, PM10, O3, NO2, SO2) if they exist
         const desiredOrder = ["O3", "PM10", "NO2", "PM2.5", "SO2"]; // Order from the photo
         zScoreData.sort((a, b) => {
             const orderA = desiredOrder.indexOf(a.pollutant);
             const orderB = desiredOrder.indexOf(b.pollutant);
             if (orderA === -1 && orderB === -1) return 0; // Maintain original order if both not in desired
             if (orderA === -1) return 1; // b comes first if a is not in desired
             if (orderB === -1) return -1; // a comes first if b is not in desired
             return orderA - orderB; // Sort by desired order
         });


    console.log("Z-score data for distribution:", zScoreData); // Log di debug

    if (zScoreData.length === 0) {
        pollutantDistributionChartContainer.html('<p class="placeholder-text">Could not calculate Z-scores (insufficient or uniform data).</p>');
        dominantPollutantDisplay.html('N/A');
        return;
    }

    // Find dominant pollutant based on absolute Z-score
    const dominantPollutantObj = zScoreData.length > 0 ? zScoreData.reduce((max, p) => Math.abs(p.zScore) > Math.abs(max.zScore) ? p : max, { zScore: -Infinity }) : null;
    const dominantPollutant = dominantPollutantObj && dominantPollutantObj.pollutant ? dominantPollutantObj.pollutant : "N/A";
    dominantPollutantDisplay.html(`Dominant Pollutant (highest Z-Score): <strong>${dominantPollutant} (${dominantPollutantObj?.zScore?.toFixed(2) || 'N/A'})</strong>`);


    const pDistChartWidth = parseInt(pollutantDistributionChartContainer.style("width")) || 300;
    // Adjust height based on the number of pollutants to show horizontal bars clearly
    const pDistChartHeight = Math.max(280, zScoreData.length * 35 + 70); // Dynamic height based on number of bars
    const pDistMargin = { top: 25, right: 30, bottom: 55, left: 80 }; // Adjusted margins for horizontal chart
     // Fallback for very small widths
    if (pDistChartWidth < pDistMargin.left + pDistMargin.right + 50) {
         pDistMargin.left = 50;
         pDistMargin.right = 10;
    }
    const pDistInnerWidth = pDistChartWidth - pDistMargin.left - pDistMargin.right;
    const pDistInnerHeight = pDistChartHeight - pDistMargin.top - pDistMargin.bottom;


    const svg = pollutantDistributionChartContainer.append("svg")
        .attr("width", pDistChartWidth).attr("height", pDistChartHeight)
        .append("g").attr("transform", `translate(${pDistMargin.left},${pDistMargin.top})`);

    // X scale for Z-score (linear)
    const xDistMax = d3.max(zScoreData, d => Math.abs(d.zScore)) || 1;
    const xDist = d3.scaleLinear().range([0, pDistInnerWidth]).domain([-xDistMax * 1.1, xDistMax * 1.1]).nice();

    // Y scale for pollutants (band)
    const yDist = d3.scaleBand().range([pDistInnerHeight, 0]).padding(0.4).domain(zScoreData.map(d => d.pollutant));


     // Assicurati che i domini e le dimensioni siano validi
     if (pDistInnerWidth <= 0 || pDistInnerHeight <= 0 || xDist.domain()[0] === undefined || yDist.domain().length === 0) {
         console.warn("Distribution chart has invalid dimensions or data domain.", {pDistInnerWidth, pDistInnerHeight, xDomain: xDist.domain(), yDomain: yDist.domain()});
         pollutantDistributionChartContainer.html('<p class="placeholder-text">Chart could not be rendered due to invalid dimensions or data.</p>');
         dominantPollutantDisplay.html('N/A');
         return;
     }


    // Draw X-axis (at y = 0 Z-score)
    svg.append("g").attr("class", "x-axis dist-axis axis")
        .attr("transform", `translate(0,${pDistInnerHeight})`) // Position at bottom for horizontal bars
        .call(d3.axisBottom(xDist).ticks(5).tickSizeInner(-pDistInnerHeight).tickPadding(8));
    svg.selectAll(".x-axis.dist-axis .tick line").style("stroke-dasharray", "var(--grid-line-style-dense)").style("opacity", 0.5);

    // Draw Y-axis
    svg.append("g").attr("class", "y-axis dist-axis axis")
        .call(d3.axisLeft(yDist).tickSize(0).tickPadding(10)); // Position at left

    // Draw zero line
    svg.append("line").attr("class", "zero-line")
        .attr("x1", xDist(0)).attr("x2", xDist(0)) // Vertical line at Z=0
        .attr("y1", 0).attr("y2", pDistInnerHeight);


    // Draw Bars
    svg.selectAll(".dist-bar").data(zScoreData).enter().append("rect")
        .attr("class", "dist-bar")
        .attr("x", d => xDist(Math.min(0, d.zScore))) // Start x position at 0 or the z-score value
        .attr("y", d => yDist(d.pollutant) ?? 0) // Y position based on pollutant band
        .attr("height", yDist.bandwidth()) // Height based on band width
        .attr("width", 0) // Start width at 0 for animation
        .style("fill", d => d.zScore >= 0 ? "var(--dist-bar-positive)" : "var(--dist-bar-negative)")
        .on("mouseover", handleMouseOver) // V27 tooltip
        .on("mouseout", handleMouseOut) // V27 tooltip
        .transition().duration(600).delay((d, i) => i * 70) // V27 timings
        .attr("x", d => xDist(Math.min(0, d.zScore))) // Final x position
        .attr("width", d => Math.abs(xDist(d.zScore) - xDist(0))); // Final width


     // Add X-axis label
     svg.append("text").attr("class", "x-axis-label dist-label axis-label")
         .attr("x", pDistInnerWidth / 2)
         .attr("y", pDistInnerHeight + pDistMargin.bottom - 25) // Position below the chart
         .text("Z-Score (Normalized Value)");

    selectedCountryNameStats.text(countryName);
}

// Function to update the city comparison lollipop chart
function updateCityLollipopChart(countryName, countryData, selectedPollutant, initialLoad = true) {
    console.log(`Updating city lollipop chart for ${countryName} - Pollutant: ${selectedPollutant}`); // Log di debug
    if (!cityComparisonChartContainer.node()) {
         console.error("City comparison chart container not found."); // Log di errore
         return;
    }
    cityComparisonChartContainer.html(''); // Clear previous
    cityComparisonPollutantSpan.text(pollutantInfo[selectedPollutant]?.name.split('(')[0].trim() || selectedPollutant); // Usa nome pulito
    // Assicurati che il select abbia il valore corrente. Questo dovrebbe essere già fatto in loadCountryData ma per sicurezza:
    cityPollutantSelect.property('value', selectedPollutant);


    const cityData = (countryData.cities || [])
        .map(city => ({ name: city.name, value: city.pollution ? city.pollution[selectedPollutant] : undefined }))
        .filter(d => d.value !== undefined && d.value !== null && !isNaN(d.value)) // Filter out null/undefined/NaN values
        .sort((a, b) => b.value - a.value);

    console.log("Lollipop chart data:", cityData); // Log di debug

    if (cityData.length === 0) {
        cityComparisonChartContainer.html(`<p class="placeholder-text">No data for ${pollutantInfo[selectedPollutant]?.name.split('(')[0].trim() || selectedPollutant} in cities of ${countryName}.</p>`);
         console.warn(`No city data found for ${selectedPollutant} in ${countryName}.`); // Log di avviso
        return;
    }

    const chartWidth = parseInt(cityComparisonChartContainer.style("width")) || 300;
    const chartHeight = Math.max(220, cityData.length * 28 + 60); // V27 dynamic height
    // Aumentato il margine destro per fare spazio alle etichette permanenti
    const marginLollipop = { top: 20, right: 80, bottom: 45, left: 95 }; // Increased right margin
     // Fallback se chartWidth è troppo piccolo per i margini
    if (chartWidth < marginLollipop.left + marginLollipop.right + 50) { // Assicurati che ci sia spazio utile
        marginLollipop.right = 20; // Riduci il margine destro se necessario
        marginLollipop.left = 60; // Riduci anche il sinistro se necessario
    }
    const innerWidthLollipop = chartWidth - marginLollipop.left - marginLollipop.right;
    const innerHeightLollipop = chartHeight - marginLollipop.top - marginLollipop.bottom;

    // Log dimensioni chart
    console.log(`Lollipop Chart Dims: Width=${chartWidth}, Height=${chartHeight}, InnerWidth=${innerWidthLollipop}, InnerHeight=${innerHeightLollipop}`);
    console.log("Lollipop Margins:", marginLollipop);


    const svg = cityComparisonChartContainer.append("svg")
        .attr("width", chartWidth).attr("height", chartHeight)
        .append("g").attr("transform", `translate(${marginLollipop.left},${marginLollipop.top})`); // Usa margine aggiustato

    const xLolli = d3.scaleLinear().domain([0, d3.max(cityData, d => d.value) * 1.1 || 10]).range([0, innerWidthLollipop]).nice();
    const yLolli = d3.scaleBand().domain(cityData.map(d => d.name)).range([0, innerHeightLollipop]).padding(0.5);

    // Assicurati che i domini siano validi
    if (innerWidthLollipop <= 0 || innerHeightLollipop <= 0 || xLolli.domain()[1] <= 0 || yLolli.domain().length === 0) {
         console.warn("Lollipop chart has invalid dimensions or data domain.", {innerWidthLollipop, innerHeightLollipop, xDomain: xLolli.domain(), yDomain: yLolli.domain()});
         cityComparisonChartContainer.html('<p class="placeholder-text">Chart could not be rendered due to invalid dimensions or data.</p>');
         return;
     }


    svg.append("g").attr("class", "x-axis lollipop-axis axis").attr("transform", `translate(0,${innerHeightLollipop})`)
        .call(d3.axisBottom(xLolli).ticks(Math.max(2, Math.floor(innerWidthLollipop/70))).tickFormat(d => d).tickSizeInner(-innerHeightLollipop).tickPadding(8));
    svg.selectAll(".x-axis.lollipop-axis .tick line").style("stroke-dasharray", "var(--grid-line-style-dense)").style("opacity", 0.6);

    svg.append("g").attr("class", "y-axis lollipop-axis axis")
        .call(d3.axisLeft(yLolli).tickSize(0).tickPadding(8));

    const groups = svg.selectAll(".lollipop-group").data(cityData, d => d.name).enter().append("g").attr("class", "lollipop-group")
        .attr("transform", d => `translate(0, ${yLolli(d.name) + yLolli.bandwidth() / 2})`);

    groups.append("line").attr("class", "lollipop-line")
        .attr("x1", 0) .attr("y1", 0)
        .attr("x2", 0) .attr("y2", 0) // Start at 0 for animation
        .transition().duration(600).delay((d,i) => i * 60) // V27 timings
        .attr("x2", d => xLolli(d.value));

    groups.append("circle").attr("class", "lollipop-dot")
        .attr("cy", 0)
        .attr("cx", 0) // Start at 0 for animation
        .attr("r", 0)  // Start radius at 0 for animation
        // Use numerical values for r in transitions and event handlers
        .on("mouseover", function(event, d) { // V27 tooltip - CORRECTED TOOLTIP HANDLING
             d3.select(this).transition("dotHoverLolli").duration(100).attr("r", 7.5).style("filter", "brightness(0.85)"); // Use numerical radius 7.5

             // Set tooltip content first
             tooltip.html(`<strong>${d.name}</strong><br>${pollutantInfo[selectedPollutant]?.name.split('(')[0].trim() || selectedPollutant}: ${d.value.toFixed(1)} µg/m³`);

             // Then transition appearance
             tooltip.transition("tooltipFade").duration(100).style("opacity", 1).style("transform", "translateY(0px)");

             // Position the tooltip
             positionTooltip(event, tooltip);

         })
        .on("mouseout", function(event, d) { // V27 tooltip
            d3.select(this).transition("dotHoverOutLolli").duration(150).attr("r", 5.5).style("filter", "brightness(1)"); // Use numerical radius 5.5
            // Rimuovi la label custom temporanea se esistesse (dal codice precedente)
             d3.select(this.parentNode).select(".on-lollipop-hover-label").transition().duration(150).style("opacity", 0).remove();

            tooltip.transition("tooltipFadeOut").duration(150).style("opacity", 0).style("transform", "translateY(5px)");
        })
        .transition().duration(600).delay((d,i) => i * 60 + 100) // V27 timings
        .attr("cx", d => xLolli(d.value))
        .attr("r", 5.5); // Set final radius numerically


    // AGGIUNGI ETICHETTE PERMANENTI ACCANTO AI PUNTI (come richiesto nella foto)
    groups.append("text")
        .attr("class", "lollipop-value-label") // Nuova classe per lo stile
        .attr("x", 0) // Start at 0 for animation
        .attr("y", 0)
        .attr("dy", "0.35em") // Allineamento verticale
        .style("text-anchor", "start") // Allinea il testo all'inizio (a destra del punto)
        .style("opacity", 0) // Inizia nascosto per l'animazione
        .text(d => `${d.value.toFixed(1)} µg/m³`) // Contenuto del testo
        .transition().duration(600).delay((d,i) => i * 60 + 200) // Ritardo animazione dopo il punto
        .attr("x", d => xLolli(d.value) + 8) // Posiziona 8px a destra del punto
        .style("opacity", 1);


    // Guideline per l'inquinante selezionato (logica V27, già presente)
    const guidelineVal = pollutantInfo[selectedPollutant]?.guidelineValue;
    // Aggiustato il controllo del bordo per usare innerWidthLollipop aggiornato
    if (guidelineVal !== undefined && guidelineVal > 0 && xLolli(guidelineVal) > 0 && xLolli(guidelineVal) <= innerWidthLollipop) {
        svg.append("line").attr("class", "guideline-line")
            .attr("x1", xLolli(guidelineVal)).attr("x2", xLolli(guidelineVal))
            .attr("y1", -5).attr("y2", innerHeightLollipop + 5)
            .style("opacity", 0).transition().duration(500).delay(400).style("opacity", 0.75); // V27 timings
        svg.append("text").attr("class", "guideline-label")
            .attr("x", xLolli(guidelineVal)).attr("y", -8)
            .text(`WHO Guideline (${guidelineVal})`)
            .style("opacity", 0).transition().duration(500).delay(400).style("opacity", 1); // V27 timings
    } else {
         console.log(`Guideline not drawn for ${selectedPollutant}. Value: ${guidelineVal}, Y Pos: ${yLolli(guidelineVal)}, InnerHeight: ${innerHeightLollipop}`); // Log se guideline non viene disegnata
    }
}


function getSelectedEvolutionPollutants() { // (da V27)
    const selected = [];
    evolutionCheckboxContainer.selectAll('input[type="checkbox"]:checked').each(function() { selected.push(d3.select(this).property("value")); });
    return selected;
}

function updatePollutantEvolutionChart(countryName, countryData, pollutantsToPlot, selectedPointInfo = null, animate = true) { // (da V27)
    console.log(`Updating evolution chart for ${countryName} - Pollutants: ${pollutantsToPlot.join(', ')}`); // Log di debug
    if (!pollutantEvolutionChartContainer.node()) {
        console.error("Pollutant evolution chart container not found."); // Log di errore
        return;
    }
    pollutantEvolutionChartContainer.html('');
    lastCheckedPollutants = pollutantsToPlot; // V27 logic
    currentlySelectedPoint = selectedPointInfo; // V27 logic
    if (!pollutantsToPlot || pollutantsToPlot.length === 0) {
        pollutantEvolutionChartContainer.html('<p class="placeholder-text">Select pollutants from checkboxes to view evolution.</p>');
        evolutionClickInfoContainer.html("Click on a point in the chart to see details."); return;
    }
    if (selectedPointInfo) {
        evolutionClickInfoContainer.html(`Selected: <strong>${selectedPointInfo.pollutant}</strong>, Year: ${selectedPointInfo.year}, Value: <span class="value">${selectedPointInfo.value.toFixed(1)} µg/m³</span>`);
    } else { evolutionClickInfoContainer.html("Click on a point in the chart to see details."); }

    dataForEvolutionChart = [];
    pollutantsToPlot.forEach(pollutant => {
        const evolutionData = countryData.pollutantEvolution ? countryData.pollutantEvolution[pollutant] : null;
        if (evolutionData) {
            const points = Object.entries(evolutionData)
                .map(([year, value]) => ({ year: +year, value: value !== null && !isNaN(value) ? +value : null }))
                .filter(d => d.value !== null && d.year >= Math.min(...years) && d.year <= Math.max(...years)) // Filter out null values and years outside range
                .sort((a, b) => a.year - b.year);
            if (points.length > 0) dataForEvolutionChart.push({ pollutant, points, color: colorScale(pollutant) });
        } else {
            console.warn(`No evolution data found for pollutant ${pollutant} in ${countryName}.`); // Log di avviso
        }
    });

    console.log("Evolution chart data:", dataForEvolutionChart); // Log di debug

    if (dataForEvolutionChart.length === 0) {
        pollutantEvolutionChartContainer.html(`<p class="placeholder-text">No evolution data for selected pollutants in ${countryName}.</p>`);
        return;
    }
    const pEvoChartWidth = parseInt(pollutantEvolutionChartContainer.style("width")) || 300;
    const pEvoChartHeight = 300; // V27 height
    const pEvoMargin = { top: 20, right: 45, bottom: 55, left: 50 }; // V27 margins
    let pEvoInnerWidth = pEvoChartWidth - pEvoMargin.left - pEvoMargin.right;
    let pEvoInnerHeight = pEvoChartHeight - pEvoMargin.top - pEvoMargin.bottom;

     // Fallback if pEvoChartWidth is too small for margins
    if (pEvoChartWidth < pEvoMargin.left + pEvoMargin.right + 50) {
         pEvoMargin.right = 10;
         pEvoMargin.left = 30;
         pEvoInnerWidth = pEvoChartWidth - pEvoMargin.left - pEvoMargin.right;
         pEvoInnerHeight = pEvoChartHeight - pEvoMargin.top - pEvoMargin.bottom;
    }

     console.log(`Evolution Chart Dims: Width=${pEvoChartWidth}, Height=${pEvoChartHeight}, InnerWidth=${pEvoInnerWidth}, InnerHeight=${pEvoInnerHeight}`); // Log di debug
     console.log("Evolution Margins:", pEvoMargin); // Log di debug


    const svg = pollutantEvolutionChartContainer.append("svg")
        .attr("width", pEvoChartWidth).attr("height", pEvoChartHeight)
        .append("g").attr("transform", `translate(${pEvoMargin.left},${pEvoMargin.top})`);

     // Assicurati che i domini siano validi
     const allYearsDomain = d3.extent(dataForEvolutionChart.flatMap(s => s.points.map(p => p.year)));
     const allValuesDomain = d3.extent(dataForEvolutionChart.flatMap(s => s.points.map(p => p.value)));
     if (pEvoInnerWidth <= 0 || pEvoInnerHeight <= 0 || allYearsDomain[0] === undefined || allValuesDomain[0] === undefined) {
         console.warn("Evolution chart has invalid dimensions or data domain.", {pEvoInnerWidth, pEvoInnerHeight, allYearsDomain, allValuesDomain});
         pollutantEvolutionChartContainer.html('<p class="placeholder-text">Chart could not be rendered due to invalid dimensions or data.</p>');
         return;
     }


    const allYears = dataForEvolutionChart.flatMap(s => s.points.map(p => p.year));
    const xEvo = d3.scaleLinear().domain(d3.extent(allYears)).range([0, pEvoInnerWidth]).nice();
    const allValues = dataForEvolutionChart.flatMap(s => s.points.map(p => p.value));
    const yEvo = d3.scaleLinear().domain([0, d3.max(allValues) * 1.05 || 10]).range([pEvoInnerHeight, 0]).nice();

    svg.append("g").attr("class", "x-axis evo-axis axis")
        .attr("transform", `translate(0,${pEvoInnerHeight})`)
        .call(d3.axisBottom(xEvo).tickFormat(d3.format("d")).ticks(Math.min(allYears.length, Math.floor(pEvoInnerWidth / 60))).tickSizeInner(-pEvoInnerHeight).tickPadding(8));
    svg.selectAll(".x-axis.evo-axis .tick line").style("stroke-dasharray", "var(--grid-line-style-dense)").style("opacity", 0.4);
    svg.append("g").attr("class", "y-axis evo-axis axis")
        .call(d3.axisLeft(yEvo).ticks(5).tickSizeInner(-pEvoInnerWidth).tickPadding(8));
    svg.selectAll(".y-axis.evo-axis .tick line").style("stroke-dasharray", "var(--grid-line-style-dense)").style("opacity", 0.5);

    const line = d3.line().x(d => xEvo(d.year)).y(d => yEvo(d.value)).defined(d => d.value !== null);
    dataForEvolutionChart.forEach(series => {
        const path = svg.append("path").datum(series.points).attr("class", "pollutant-line")
            .attr("fill", "none").attr("stroke", series.color).attr("stroke-width", "var(--line-stroke-width)").attr("d", line);
        if (animate) animateEvolutionChartLines(path); // V27 animation call

        // Add guidelines if data exists for it (Updated condition)
        const guidelineValue = pollutantInfo[series.pollutant]?.guidelineValue;
         // Check if guideline is within Y range and plot only if it makes sense visually
         if (guidelineValue !== undefined && guidelineValue > 0 && yEvo(guidelineValue) >= 0 && yEvo(guidelineValue) <= pEvoInnerHeight) {
            const guidelineGroup = svg.append("g").attr("class", "evolution-guideline-group");
            guidelineGroup.append("line").attr("class", "evolution-guideline-line")
                .attr("x1", 0).attr("x2", pEvoInnerWidth)
                .attr("y1", yEvo(guidelineValue)).attr("y2", yEvo(guidelineValue))
                .style("stroke", series.color).style("stroke-dasharray", "4,4").style("opacity", 0.45)
                .style("stroke-width", 1.2);

            // Add text label for the guideline (style adjusted in CSS)
            svg.append("text").attr("class", "evolution-guideline-label")
                 .attr("x", pEvoInnerWidth - 5) // Posiziona vicino al bordo destro
                 .attr("y", yEvo(guidelineValue) - 4) // Leggermente sopra la linea
                 .attr("text-anchor", "end") // Allinea a destra
                 .text(`${series.pollutant} WHO Limit (${guidelineValue})`) // Aggiungi valore alla label
                 .style("fill", series.color) // Set label color to pollutant color
                 .style("opacity", 0.85);
        } else {
             console.log(`Guideline not drawn for ${series.pollutant}. Value: ${guidelineValue}, Y Pos: ${yEvo(guidelineValue)}, InnerHeight: ${pEvoInnerHeight}`); // Log se guideline non viene disegnata
        }
    });

    dataForEvolutionChart.forEach(series => {
        svg.selectAll(`.point-${series.pollutant.replace('.', '')}`)
            .data(series.points.filter(p => p.value !== null)).enter()
            .append("circle").attr("class", `evolution-point point-${series.pollutant.replace('.', '')}`)
            .attr("cx", d => xEvo(d.year)).attr("cy", d => yEvo(d.value))
            // Set initial radius based on whether it's the selected point or animating
            .attr("r", d => {
                 if (animate) return 0; // Start from 0 if animating
                 return (currentlySelectedPoint && d.year === currentlySelectedPoint.year && series.pollutant === currentlySelectedPoint.pollutant) ? 6 : 4; // Use numerical 6 or 4
             })
            .style("fill", series.color)
            // Apply 'selected' class based on the currently selected point
            .classed("selected", d => currentlySelectedPoint && d.year === currentlySelectedPoint.year && series.pollutant === currentlySelectedPoint.pollutant)
            .on("mouseover", function(event, d) { // CORRECTED TOOLTIP HANDLING
                // Increase radius and opacity on hover, unless it's the selected point
                if (!(currentlySelectedPoint && d.year === currentlySelectedPoint.year && series.pollutant === currentlySelectedPoint.pollutant)) {
                    d3.select(this).transition("pointHover").duration(100).attr("r", 6.5).style("opacity", 1); // Changed to numerical 6.5
                }
                 // Set tooltip content first
                tooltip.html(`<strong>${series.pollutant}</strong><br>Year: ${d.year}<br>Value: ${d.value.toFixed(1)} µg/m³`);

                // Then transition appearance
                tooltip.transition("tooltipFade").duration(100).style("opacity", 1).style("transform", "translateY(0px)");

                 // Position the tooltip
                positionTooltip(event, tooltip);

            })
            .on("mouseout", function(event, d) {
                // Revert radius and opacity on mouseout, unless it's the selected point
                if (!(currentlySelectedPoint && d.year === currentlySelectedPoint.year && series.pollutant === currentlySelectedPoint.pollutant)) {
                    d3.select(this).transition("pointHoverOut").duration(100).attr("r", 4).style("opacity", 0.8); // Changed to numerical 4
                }
                tooltip.transition("tooltipFadeOut").duration(150).style("opacity", 0).style("transform", "translateY(5px)");
            })
            .on("click", function(event, d) {
                const clickedPollutant = series.pollutant;
                const clickedYear = d.year;
                console.log(`Point clicked: Pollutant=${clickedPollutant}, Year=${clickedYear}`); // Log di debug click

                // Check if the clicked point is already selected
                const isAlreadySelected = currentlySelectedPoint &&
                                          currentlySelectedPoint.pollutant === clickedPollutant &&
                                          currentlySelectedPoint.year === clickedYear;

                let newSelectedPoint = null;

                if (!isAlreadySelected) {
                    // If a different point is clicked, update the selected point
                    newSelectedPoint = { pollutant: clickedPollutant, year: clickedYear, value: d.value };
                    currentlySelectedPoint = newSelectedPoint; // Update global state
                     console.log("New point selected:", currentlySelectedPoint); // Log di debug

                } else {
                    // If the already selected point is clicked again, deselect it
                    currentlySelectedPoint = null; // Clear global state
                     console.log("Deselecting point."); // Log di debug
                }

                 // Update the 'selected' class and radius for ALL points based on the new state
                 svg.selectAll(".evolution-point").classed("selected", false).attr("r", 4); // Reset all first
                 if (currentlySelectedPoint) {
                     svg.selectAll(".evolution-point")
                         .filter(pt => pt.year === currentlySelectedPoint.year && dataForEvolutionChart.find(s => s.points.includes(pt))?.pollutant === currentlySelectedPoint.pollutant)
                         .classed("selected", true)
                         .attr("r", 6); // Set radius for the newly selected point
                 }

                // Update the click info container
                 if (currentlySelectedPoint) {
                     evolutionClickInfoContainer.html(`Selected: <strong>${currentlySelectedPoint.pollutant}</strong>, Year: ${currentlySelectedPoint.year}, Value: <span class="value">${currentlySelectedPoint.value.toFixed(1)} µg/m³</span>`);
                 } else {
                     evolutionClickInfoContainer.html("Click on a point in the chart to see details.");
                 }

            })
            .transition("pointAppear").duration(animate ? 600 : 0).delay(animate ? (d, i) => i * 20 + 500 : 0) // V27 animation
            .attr("cx", d => xEvo(d.year))
             // Set final radius numerically based on whether it's the selected point after animation
             .attr("r", d => {
                 if (currentlySelectedPoint && d.year === currentlySelectedPoint.year && series.pollutant === currentlySelectedPoint.pollutant) {
                     return 6; // Selected radius
                 } else {
                     return 4; // Default radius
                 }
             });
    });
    evolutionChartAnimated = true; // V27 flag
}


function animateEvolutionChartLines(pathSelection) { // (da V27)
    if (!pathSelection || pathSelection.empty()) return;
    pathSelection.each(function() {
        const pathNode = d3.select(this);
        const totalLength = pathNode.node().getTotalLength();
        pathNode.attr("stroke-dasharray", totalLength + " " + totalLength)
            .attr("stroke-dashoffset", totalLength)
            .transition("lineAnimEV").duration(1000).delay(100).ease(d3.easeLinear) // V27 timings
            .attr("stroke-dashoffset", 0);
    });
}

function setupEvolutionChartObserver() { // (da V27)
    if (evolutionChartObserver) evolutionChartObserver.disconnect();
    const options = { root: null, rootMargin: '0px', threshold: 0.3 };
    evolutionChartObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !evolutionChartAnimated && dataForEvolutionChart.length > 0) {
                const paths = pollutantEvolutionChartContainer.selectAll(".pollutant-line");
                animateEvolutionChartLines(paths);
                // Re-apply correct radius based on selected state after animation
                pollutantEvolutionChartContainer.selectAll(".evolution-point")
                    .transition("pointAppear").duration(600).delay((d,i) => i * 20 + 500) // V27 timings
                    .attr("r", d => (currentlySelectedPoint && d.year === currentlySelectedPoint.year && dataForEvolutionChart.find(s=>s.points.includes(d))?.pollutant === currentlySelectedPoint.pollutant) ? 6 : 4); // Changed to numerical 6 and 4
                evolutionChartAnimated = true;
            }
        });
    }, options);
    if (pollutantEvolutionChartContainer.node()) evolutionChartObserver.observe(pollutantEvolutionChartContainer.node());
}

function initializeCityPollutantSelect(countryData) { // (da V27, aggiornato per includere CO se presente)
     console.log("Initializing city pollutant select."); // Log di debug
    const pollutantsInCities = new Set();
    (countryData.cities || []).forEach(city => {
        if(city.pollution) Object.keys(city.pollution).forEach(p => pollutantsInCities.add(p));
    });
    // Filtra disponibili includendo CO
    const relevantPollutants = availablePollutants.filter(p => pollutantsInCities.has(p));

    console.log("Relevant pollutants for city select:", relevantPollutants); // Log di debug


    cityPollutantSelect.selectAll('option').remove();
    cityPollutantSelect.selectAll('option')
        .data(relevantPollutants.length > 0 ? relevantPollutants : [DEFAULT_POLLUTANT]) // Fallback to default if no data
        .enter().append('option')
        .attr('value', d => d)
        .text(d => pollutantInfo[d] ? pollutantInfo[d].name.split('(')[0].trim() : d);

    // Set default or first available for city comparison
    if (relevantPollutants.includes(DEFAULT_POLLUTANT)) cityPollutantSelect.property('value', DEFAULT_POLLUTANT);
    else if (relevantPollutants.length > 0) cityPollutantSelect.property('value', relevantPollutants[0]);
    else cityPollutantSelect.property('value', DEFAULT_POLLUTANT); // Double fallback
     console.log("City pollutant select initialized with value:", cityPollutantSelect.property('value')); // Log di debug
}

function loadCountryData(countryName, initialLoad = true) { // (da V27)
    console.log(`Loading data for country: ${countryName}, Initial load: ${initialLoad}`); // Log di debug
    countryVisualizationContent.classed("hidden", true); // V27 class for hide/show
    if (!countryName || !countrySpecificDummyData[countryName]) {
        console.warn(`No data for country: ${countryName}. Displaying placeholders.`); // Log di avviso
        countryMapContainer.html('<p class="placeholder-text">Select a country to view data.</p>');
        pollutantDistributionChartContainer.html('<p class="placeholder-text">Select a country.</p>');
        pollutantEvolutionChartContainer.html('<p class="placeholder-text">Select a country.</p>');
        cityComparisonChartContainer.html('<p class="placeholder-text">Select a country.</p>');
        selectedCountryNameMap.text("N/A"); selectedCountryNameStats.text("N/A");
        dominantPollutantDisplay.text("N/A");
        evolutionCheckboxContainer.html('<p class="placeholder-text" style="margin: 5px 0; font-size: 0.85em;">Select a country first.</p>');
        // Clear city pollutant select options as well
        cityPollutantSelect.selectAll('option').remove();
        cityPollutantSelect.append('option').attr('value', '').text('Select pollutant...');

        return;
    }
    const countryData = countrySpecificDummyData[countryName];
    updateCountryMap(countryName, countryData, initialLoad);
    initializeCityPollutantSelect(countryData); // Populate before updating lollipop
    const defaultCityPollutant = cityPollutantSelect.property("value");
     console.log("Default city pollutant after select init:", defaultCityPollutant); // Log di debug

    updateCityLollipopChart(countryName, countryData, defaultCityPollutant, initialLoad);
    updatePollutantDistributionChart(countryName, countryData, defaultCityPollutant, initialLoad);

    evolutionCheckboxContainer.html(''); // Clear previous checkboxes
    const availableEvoPollutants = Object.keys(countryData.pollutantEvolution || {});
     // Include CO if present in pollutantInfo and dummy data
    const relevantEvoPollutants = availablePollutants.filter(p => availableEvoPollutants.includes(p));

    console.log("Relevant evolution pollutants for checkboxes:", relevantEvoPollutants); // Log di debug


    if(relevantEvoPollutants.length > 0) {
        relevantEvoPollutants.forEach(pollutant => {
            const label = evolutionCheckboxContainer.append("label").attr("class", "checkbox-item");
            label.append("input").attr("type", "checkbox").attr("value", pollutant)
                 .property("checked", ["PM2.5", "NO2"].includes(pollutant)) // Default checked (V27)
                 .on("change", function() {
                     const checkbox = d3.select(this);
                     const isCheckedAfterChange = checkbox.property("checked");
                     const currentlyCheckedCount = evolutionCheckboxContainer.selectAll('input[type="checkbox"]:checked').size(); // Count *after* native change

                     // Prevent unchecking the last selected pollutant
                     if (!isCheckedAfterChange && currentlyCheckedCount === 0) {
                         checkbox.property("checked", true); // Revert the check state
                         console.warn(`Prevented unchecking the last pollutant (${pollutant}). At least one pollutant must be selected.`);
                         // Optional: Display a user-facing message (e.g., fading text)
                         return; // Stop processing this change
                     }

                     // If we reach here, the change is allowed.
                     const selectedPollutants = getSelectedEvolutionPollutants();
                     evolutionChartAnimated = false; // Reset flag for re-animation on scroll
                     // Keep selected point if it's still among the plotted pollutants, otherwise reset
                     const newSelectedPoint = (currentlySelectedPoint && selectedPollutants.includes(currentlySelectedPoint.pollutant)) ? currentlySelectedPoint : null;
                     updatePollutantEvolutionChart(countryName, countryData, selectedPollutants, newSelectedPoint, true); // Pass animate=true to allow animation on change
                 });
            label.append("span").attr("class","checkbox-label-text").style("color", colorScale(pollutant)).text(pollutantInfo[pollutant]?.name.split("(")[0].trim() || pollutant);
        });
    } else {
         evolutionCheckboxContainer.html('<p class="placeholder-text" style="margin: 5px 0; font-size: 0.85em;">No evolution data for this country.</p>');
    }
    const initialEvoPollutants = getSelectedEvolutionPollutants();
     console.log("Initial evolution pollutants to plot:", initialEvoPollutants); // Log di debug
    evolutionChartAnimated = false; // V27 flag
    currentlySelectedPoint = null; // Reset selected point on country or pollutant change
    updatePollutantEvolutionChart(countryName, countryData, initialEvoPollutants, null, initialLoad); // V27 animate
    if(initialLoad) setupEvolutionChartObserver(); // V27 observer

    countryStatsSection.style("opacity", 0).style("transform", "translateY(10px)")
        .transition().duration(500).delay(initialLoad ? 250 : 50) // V27 timings
        .style("opacity", 1).style("transform", "translateY(0px)");
    setTimeout(() => { countryVisualizationContent.classed("hidden", false); }, initialLoad ? 50 : 0); // V27 show after content potentially loaded
     console.log("Finished loading country data."); // Log di debug
}

function initializeCountryView() { // (da V27)
    console.log("Initializing country view."); // Log di debug
    populateCountryDropdowns();
    countrySelect.on("change", function() {
        const selectedCountry = d3.select(this).property("value");
        loadCountryData(selectedCountry, false); // Not initial load for subsequent changes
    });
    cityPollutantSelect.on("change", function() {
        const selectedCountry = countrySelect.property("value");
        const selectedCityPollutant = d3.select(this).property("value");
        const countryData = countrySpecificDummyData[selectedCountry];
        if (countryData) {
             console.log(`City pollutant select changed to ${selectedCityPollutant}. Updating lollipop chart.`); // Log di debug
            updateCityLollipopChart(selectedCountry, countryData, selectedCityPollutant, false);
        } else {
            console.warn(`Country data not available for ${selectedCountry} on city pollutant select change.`); // Log di avviso
        }
    });
    loadCountryData(DEFAULT_COUNTRY, true); // Initial load
     console.log("Country view initialized."); // Log di debug
}

// --- Funzioni Grafico Correlazione EV (da V27 per animazioni) ---
function setupEVChartDimensions() { // (da V27)
    evChartWidth = parseInt(evAirQualityChartContainer.style("width")) || 600;
    evChartHeight = Math.max(380, evChartWidth * 0.55); // V27 height
    evChartInnerWidth = evChartWidth - evChartMargin.left - evChartMargin.right;
    evChartInnerHeight = evChartHeight - evChartMargin.top - evChartMargin.bottom;
    evAirQualityChartDiv.select("svg").remove(); // Clear previous
    const svgEV = evAirQualityChartDiv.append("svg")
        .attr("width", evChartWidth).attr("height", evChartHeight)
        .append("g").attr("transform", `translate(${evChartMargin.left},${evChartMargin.top})`);
    return { svgEV, xEV: d3.scaleLinear().range([0, evChartInnerWidth]), yEVLeft: d3.scaleLinear().range([evChartInnerHeight, 0]), yEVRight: d3.scaleLinear().range([evChartInnerHeight, 0]) };
}

function animateLineEV(pathSelection) { // (da V27)
    if (!pathSelection || pathSelection.empty()) return;
    pathSelection.each(function() {
        const pathNode = d3.select(this);
        const totalLength = pathNode.node().getTotalLength();
        pathNode.attr("stroke-dasharray", totalLength + " " + totalLength)
            .attr("stroke-dashoffset", totalLength)
            .transition("lineAnimEV").duration(1200).delay(150).ease(d3.easeSinInOut) // V27 timings
            .attr("stroke-dashoffset", 0);
    });
}

// Helper function to update disabled states of EV country dropdowns
function updateEVCountryDropdownsDisabledState() {
    const selected1 = evCountrySelect1.property("value");
    const selected2 = evCountrySelect2.property("value");

    // Disable selected country in the other dropdown
    evCountrySelect1.selectAll("option")
        .property("disabled", d => d !== "none" && d === selected2);

    evCountrySelect2.selectAll("option")
        .property("disabled", d => d !== "none" && d === selected1);
}


function drawEVAirQualityCorrelationChart(animate = true) { // (da V27)
     console.log("Drawing EV air quality chart."); // Log di debug
    const selectedCountry1 = evCountrySelect1.property("value");
    const selectedCountry2 = evCountrySelect2.property("value");
     console.log("EV Countries selected:", selectedCountry1, selectedCountry2); // Log di debug
    if (!selectedCountry1) {
        evAirQualityChartDiv.html('<p class="placeholder-text">Select at least one country to view data.</p>');
        evChartLegendContainer.html('');
         console.warn("No country selected for EV chart."); // Log di avviso
        return;
    }

    const { svgEV, xEV, yEVLeft, yEVRight } = setupEVChartDimensions();
    const countriesToPlot = [selectedCountry1];
    if (selectedCountry2 && selectedCountry2 !== "none" && selectedCountry2 !== selectedCountry1) countriesToPlot.push(selectedCountry2);

    const plotData = countriesToPlot.map(country => {
        const data = evDummyData[country];
        // Ensure data exists for the country
        if (!data) return null;
        return {
            name: country, color: data.color,
            purchases: evYears.map(year => ({ year, value: data.ev_purchases[year] === undefined ? null : data.ev_purchases[year] })).filter(d => d.value !== null),
            pm25: evYears.map(year => ({ year, value: data.avg_pm25[year] === undefined ? null : data.avg_pm25[year] })).filter(d => d.value !== null)
        };
    }).filter(d => d !== null); // Filter out null entries if country data was missing

     console.log("EV Chart plot data:", plotData); // Log di debug

    if (plotData.every(d => d.purchases.length === 0 && d.pm25.length === 0)) {
        evAirQualityChartDiv.html('<p class="placeholder-text">No data available for selected countries/years.</p>');
        evChartLegendContainer.html('');
         console.warn("No plot data available for EV chart."); // Log di avviso
        return;
    }

    xEV.domain(d3.extent(evYears));
    const maxPurchases = d3.max(plotData, d => d3.max(d.purchases, p => p.value)) || 0;
    const maxPM25 = d3.max(plotData, d => d3.max(d.pm25, p => p.value)) || 0;
    yEVLeft.domain([0, maxPurchases * 1.1 || 10000]).nice();
    yEVRight.domain([0, maxPM25 * 1.1 || 25]).nice();

     // Assicurati che i domini siano validi
    if (evChartInnerWidth <= 0 || evChartInnerHeight <= 0 || xEV.domain()[0] === undefined || yEVLeft.domain()[1] <= 0 || yEVRight.domain()[1] <= 0) {
        console.warn("EV chart has invalid dimensions or data domain.", {evChartInnerWidth, evChartInnerHeight, xDomain: xEV.domain(), yLeftDomain: yEVLeft.domain(), yRightDomain: yEVRight.domain()});
        evAirQualityChartDiv.html('<p class="placeholder-text">Chart could not be rendered due to invalid dimensions or data.</p>');
        evChartLegendContainer.html('');
        return;
    }


    // Assi (V27 style)
    svgEV.append("g").attr("class", "x-axis ev-axis axis").attr("transform", `translate(0,${evChartInnerHeight})`).call(d3.axisBottom(xEV).tickFormat(d3.format("d")).ticks(Math.min(evYears.length, Math.floor(evChartInnerWidth/70))).tickSizeInner(-evChartInnerHeight).tickPadding(8));
    svgEV.append("g").attr("class", "y-axis ev-axis ev-axis-left axis").call(d3.axisLeft(yEVLeft).ticks(6).tickSizeInner(-evChartInnerWidth).tickPadding(8));
    svgEV.append("g").attr("class", "y-axis ev-axis ev-axis-right axis").attr("transform", `translate(${evChartInnerWidth},0)`).call(d3.axisRight(yEVRight).ticks(6).tickPadding(8));
    svgEV.selectAll(".ev-axis .tick line").style("stroke-dasharray", "var(--grid-line-style-dense)").style("opacity",0.5);
    svgEV.append("text").attr("class", "axis-label y-left-label").attr("transform", "rotate(-90)").attr("y", 0 - evChartMargin.left + 20).attr("x", 0 - (evChartInnerHeight / 2)).attr("dy", "1em").style("text-anchor", "middle").text("EV Purchases");
    svgEV.append("text").attr("class", "axis-label y-right-label").attr("transform", "rotate(-90)").attr("y", evChartInnerWidth + evChartMargin.right - 25).attr("x", 0 - (evChartInnerHeight / 2)).attr("dy", "1em").style("text-anchor", "middle").text("Avg. PM2.5 (µg/m³)");


    // Reference lines (example: average EV and PM2.5 for the selected year range)
    const avgEVAll = d3.mean(plotData.flatMap(d => d.purchases.map(p => p.value)));
    const avgPM25All = d3.mean(plotData.flatMap(d => d.pm25.map(p => p.value)));

     if (avgEVAll !== undefined && avgEVAll !== null && !isNaN(avgEVAll)) {
        svgEV.append("line")
            .attr("class", "reference-line ev-reference-line")
            .attr("x1", 0).attr("x2", evChartInnerWidth)
            .attr("y1", yEVLeft(avgEVAll)).attr("y2", yEVLeft(avgEVAll))
            .style("stroke", "#999").style("stroke-dasharray", "2,2").style("stroke-width", 1);
        svgEV.append("text")
            .attr("class", "reference-line-label ev-reference-label")
            .attr("x", evChartInnerWidth).attr("y", yEVLeft(avgEVAll) - 5)
            .attr("text-anchor", "end")
            .style("fill", "#999") // Default fill color, might be overridden by CSS
            .text(`Avg. EV: ${Math.round(avgEVAll).toLocaleString()}`);
    }

    if (avgPM25All !== undefined && avgPM25All !== null && !isNaN(avgPM25All)) {
        svgEV.append("line")
            .attr("class", "reference-line pm25-reference-line")
            .attr("x1", 0).attr("x2", evChartInnerWidth)
            .attr("y1", yEVRight(avgPM25All)).attr("y2", yEVRight(avgPM25All))
            .style("stroke", "#999").style("stroke-dasharray", "2,2").style("stroke-width", 1);
         svgEV.append("text")
             .attr("class", "reference-line-label pm25-reference-label")
             .attr("x", 0).attr("y", yEVRight(avgPM25All) - 5)
             .attr("text-anchor", "start")
             .style("fill", "#999") // Default fill color, might be overridden by CSS
             .text(`Avg. PM2.5: ${avgPM25All.toFixed(1)}`);
     }


    const linePurchases = d3.line().x(d => xEV(d.year)).y(d => yEVLeft(d.value)).defined(d => d.value !== null);
    const linePM25 = d3.line().x(d => xEV(d.year)).y(d => yEVRight(d.value)).defined(d => d.value !== null);
    const chartG_ev = svgEV.append("g").attr("class", "ev-chart-content"); // Gruppo per hover effects (V27)

    plotData.forEach((countryData, index) => {
        // Linea EV Purchases (V27 animation) - Ensure dashed attribute
        const pathPurchases = chartG_ev.append("path").datum(countryData.purchases).attr("class", `line-data ev-line ev-purchases-line series-${index}`)
            .attr("fill", "none").attr("stroke", countryData.color).attr("stroke-width", 2.5)
            .attr("stroke-dasharray", "5,3") // Dashed line for purchases
            .attr("d", linePurchases);
        if(animate) animateLineEV(pathPurchases);

        // Linea PM2.5 (V27 animation) - Ensure solid line
        const pathPM25 = chartG_ev.append("path").datum(countryData.pm25).attr("class", `line-data ev-line ev-pm25-line series-${index}`)
            .attr("fill", "none").attr("stroke", countryData.color).attr("stroke-width", 2.5)
             .attr("stroke-dasharray", null) // Solid line for PM2.5
            .attr("d", linePM25);
        if(animate) animateLineEV(pathPM25);

        // Punti per EV Purchases (V27 animation) - Re-add Hover Logic for Animation
        chartG_ev.selectAll(`.dot-purchases-${index}`).data(countryData.purchases).enter().append("circle")
            .attr("class", `chart-dot ev-dot dot-purchases-${index} series-${index}`)
            .attr("cx", d => xEV(d.year)).attr("cy", d => yEVLeft(d.value))
            .attr("r", animate ? 0 : 4).style("fill", countryData.color)
            .on("mouseover", function(event, d) {
                // Highlight this series, dim others
                const hoveredSeriesClass = d3.select(this).attr("class").split(" ").find(c => c.startsWith("series-"));
                chartG_ev.selectAll(".ev-line").classed("series-dimmed", true);
                chartG_ev.selectAll(".ev-dot").classed("series-dimmed", true);
                chartG_ev.selectAll(`.${hoveredSeriesClass}`).classed("series-dimmed", false).classed("series-hovered", true);
                d3.select(this).classed("dot-series-hovered", true).raise(); // Raise dot to top
            })
            .on("mouseout", function(event, d) {
                // Revert dimming and highlighting
                chartG_ev.selectAll(".ev-line").classed("series-dimmed", false).classed("series-hovered", false);
                chartG_ev.selectAll(".ev-dot").classed("series-dimmed", false).classed("dot-series-hovered", false);
            })
            .transition("dotAppearEV").duration(animate ? 700:0).delay(animate ? (d,i)=> i*30 + 800:0).attr("r", 4);

        // Punti per PM2.5 (V27 animation) - Re-add Hover Logic for Animation
        chartG_ev.selectAll(`.dot-pm25-${index}`).data(countryData.pm25).enter().append("circle")
            .attr("class", `chart-dot ev-dot dot-pm25-${index} series-${index}`)
            .attr("cx", d => xEV(d.year)).attr("cy", d => yEVRight(d.value))
            .attr("r", animate ? 0 : 4).style("fill", countryData.color)
             .on("mouseover", function(event, d) {
                 // Highlight this series, dim others
                 const hoveredSeriesClass = d3.select(this).attr("class").split(" ").find(c => c.startsWith("series-"));
                 chartG_ev.selectAll(".ev-line").classed("series-dimmed", true);
                 chartG_ev.selectAll(".ev-dot").classed("series-dimmed", true);
                 chartG_ev.selectAll(`.${hoveredSeriesClass}`).classed("series-dimmed", false).classed("series-hovered", true);
                  d3.select(this).classed("dot-series-hovered", true).raise(); // Raise dot to top
             })
             .on("mouseout", function(event, d) {
                 // Revert dimming and highlighting
                 chartG_ev.selectAll(".ev-line").classed("series-dimmed", false).classed("series-hovered", false);
                 chartG_ev.selectAll(".ev-dot").classed("series-dimmed", false).classed("dot-series-hovered", false);
             })
            .transition("dotAppearEV").duration(animate ? 700:0).delay(animate ? (d,i)=> i*30 + 800:0).attr("r", 4);
    });

    // Legenda (V27 style)
    evChartLegendContainer.html('');
    plotData.forEach(countryData => {
        const legendItem = evChartLegendContainer.append("div").attr("class", "legend-item");
        legendItem.append("span").attr("class", "legend-color-box").style("background-color", countryData.color);
        legendItem.append("span").text(countryData.name);
    });
     console.log("Finished drawing EV air quality chart."); // Log di debug
}


function populateEVCountryDropdowns() { // (da V27)
     console.log("Populating EV country dropdowns."); // Log di debug
    // Store current values to restore them if possible
    const currentVal1 = evCountrySelect1.property("value");
    const currentVal2 = evCountrySelect2.property("value");

    evCountrySelect1.selectAll("option").remove();
    evCountrySelect1.selectAll("option").data(evAvailableCountries).enter()
        .append("option").attr("value", d => d).text(d => d);

    evCountrySelect2.selectAll("option").remove();
    evCountrySelect2.selectAll("option").data(["none", ...evAvailableCountries]).enter()
        .append("option").attr("value", d => d).text(d => d === "none" ? "Select to compare..." : d);

    // Attempt to restore values, default if not possible
    evCountrySelect1.property("value", evAvailableCountries.includes(currentVal1) ? currentVal1 : evAvailableCountries[0] || "none");
    evCountrySelect2.property("value", evAvailableCountries.includes(currentVal2) || currentVal2 === "none" ? currentVal2 : "none");

     console.log("EV country dropdowns populated."); // Log di debug
 }
function initializeEVCorrelationSection() { // (da V27)
     console.log("Initializing EV correlation section."); // Log di debug
    populateEVCountryDropdowns(); // This populates initial options

    // Set initial disabled states
    updateEVCountryDropdownsDisabledState();

    // Add event listeners
    evCountrySelect1.on("change", () => {
        updateEVCountryDropdownsDisabledState(); // Update disabled states
        drawEVAirQualityCorrelationChart(true); // Redraw chart
    });
    evCountrySelect2.on("change", () => {
         // Check if the newly selected value in select2 is the same as select1
         const selected1 = evCountrySelect1.property("value");
         const selected2 = evCountrySelect2.property("value");
         if (selected2 !== "none" && selected1 === selected2) {
             console.warn(`Prevented selecting the same country (${selected2}) in EV Country 2 dropdown.`);
             evCountrySelect2.property("value", "none"); // Revert to "none"
             // No need to redraw chart or update disabled states yet, change handler will fire again for "none"
             return; // Stop processing this specific change event
         }
        updateEVCountryDropdownsDisabledState(); // Update disabled states
        drawEVAirQualityCorrelationChart(true); // Redraw chart
    });


    drawEVAirQualityCorrelationChart(true); // Initial draw (V27 animate)
     console.log("EV correlation section initialized."); // Log di debug
}


// --- Inizializzazione Dashboard (Merged: V27 base + V34 additions + Fixes) ---
function initializeDashboard() {
    console.log("Initializing dashboard V_Hybrid..."); // Log di debug
    // Setup Iniziale (da V27)
    pollutantSelect.selectAll("option").data(Object.keys(pollutantInfo))
        .enter().append("option").attr("value", d => d).text(d => pollutantInfo[d].name);
    pollutantSelect.property("value", DEFAULT_POLLUTANT);
    updatePollutantInfo(DEFAULT_POLLUTANT);
    currentPollutant = DEFAULT_POLLUTANT;
    currentDisplayYear = years[0];
    yearSlider.attr("min", years[0]).attr("max", years[years.length - 1]).property("value", currentDisplayYear);
    yearSliderValue.text(currentDisplayYear); currentYearDisplay.text(currentDisplayYear);
    const initialData = historicalDummyData[currentDisplayYear]?.[currentPollutant];
    if (initialData) { updateChart(currentPollutant, initialData, currentDisplayYear); }
    else { updateChart(currentPollutant, [], currentDisplayYear); }
    startTimelapse(currentPollutant); // (V27)

    // Integrazione V34: Theme
    loadThemePreference();
    if (themeToggleButton && !themeToggleButton.empty()) {
      themeToggleButton.on("click", toggleTheme);
    } else {
      console.warn("Theme toggle button not found.");
    }
    // Integrazione V34: Current year footer
    if (currentYearFooterSpan && !currentYearFooterSpan.empty()) {
        currentYearFooterSpan.text(new Date().getFullYear());
    }

    // Integrazione V34: Heatmap (con correzione popup)
    initializeEuropeHeatmap();

    // Setup Event Listeners (da V27, con aggiunte V34 se necessario)
    pollutantSelect.on("change", function() {
        const selectedPollutant = d3.select(this).property("value");
        updatePollutantInfo(selectedPollutant);
        currentPollutant = selectedPollutant; // Update global currentPollutant
        if (isPlaying) { startTimelapse(selectedPollutant); } // Restart timelapse with new pollutant if playing
        else { // If not playing, just update the chart for the current year slider value
            const yearFromSlider = parseInt(yearSlider.property("value"));
            const dataForYear = historicalDummyData[yearFromSlider]?.[selectedPollutant];
            if(dataForYear) updateChart(selectedPollutant, dataForYear, yearFromSlider, false);
            else updateChart(selectedPollutant, [], yearFromSlider, false);
            // No need to sync currentYearIndex here if not playing timelapse
        }
    });
    playPauseButton.on("click", togglePlayPause);
    yearSlider.on("input", function() {
        stopTimelapse();
        const selectedYear = parseInt(d3.select(this).property("value"));
        currentDisplayYear = selectedYear;
        currentYearIndex = years.indexOf(selectedYear); // Sync index
        const dataForYear = historicalDummyData[selectedYear]?.[currentPollutant];
        if(dataForYear) updateChart(currentPollutant, dataForYear, selectedYear, false);
        else updateChart(currentPollutant, [], selectedYear, false);
    });

    initializeCountryView(); // (da V27, con fix lollipop/evoluzione)
    initializeEVCorrelationSection(); // (da V27)

    // Gestione Resize (Merged: V27 base + V34 heatmap resize)
    window.addEventListener("resize", debounce(() => {
        console.log("Window resized, re-rendering charts...");
        // Overview chart resize (da V27)
        const selectedPollutantOverview = pollutantSelect.property("value");
        const yearForOverviewResize = parseInt(yearSlider.property("value"));
        const dataForOverviewResize = historicalDummyData[yearForOverviewResize]?.[selectedPollutantOverview];
        if (dataForOverviewResize) { updateChart(selectedPollutantOverview, dataForOverviewResize, yearForOverviewResize, false); }
        else { updateChart(selectedPollutantOverview, [], yearForOverviewResize, false); }

        // Country view resize (da V27)
        const selectedCountryForCountryView = countrySelect.property("value");
        if (countrySpecificDummyData[selectedCountryForCountryView] && !countryVisualizationContent.classed("hidden")) {
            const countryData = countrySpecificDummyData[selectedCountryForCountryView];
            const selectedCityPollutant = cityPollutantSelect.property("value");
            const pollutantsForEvoResize = lastCheckedPollutants.length > 0 ? lastCheckedPollutants : getSelectedEvolutionPollutants();
            evolutionChartAnimated = false; // V27 flag for re-animation on scroll
            // Update country view charts without animation, then re-validate map size
            updateCountryMap(selectedCountryForCountryView, countryData, false); // Re-init map for size
            updatePollutantDistributionChart(selectedCountryForCountryView, countryData, selectedCityPollutant, false);
            updatePollutantEvolutionChart(selectedCountryForCountryView, countryData, pollutantsForEvoResize, currentlySelectedPoint, false);
            updateCityLollipopChart(selectedCountryForCountryView, countryData, selectedCityPollutant, false); // Refresh lollipop with labels
            if(mapInstance) { requestAnimationFrame(() => { if(mapInstance) { mapInstance.invalidateSize({ animate: false }); } }); } // V27 map resize
            setupEvolutionChartObserver(); // Re-setup observer (V27)
        }

        // EV chart resize (da V27)
        const selectedEVCountry1 = evCountrySelect1.property("value");
        const selectedEVCountry2 = evCountrySelect2.property("value");
        if (selectedEVCountry1 || (selectedEVCountry2 && selectedEVCountry2 !== "none")) {
             drawEVAirQualityCorrelationChart(false); // Non animare al resize (V27)
        }

        // Heatmap resize (da V34)
        if (europeHeatmap && europeHeatmap.invalidateSize) {
            europeHeatmap.invalidateSize();
        }
    }, 250));
    console.log("Window resized, re-rendering charts...");
}

// --- Run Initialization (da V34 per check Leaflet.heat e D3) ---
document.addEventListener("DOMContentLoaded", () => {
    let leafletCoreLoaded = typeof L !== 'undefined';
    let leafletHeatLoaded = leafletCoreLoaded && typeof L.heatLayer !== 'undefined';
    let d3Loaded = typeof d3 !== 'undefined'; // Check D3 as well

     if (!d3Loaded) {
         console.error("D3.js library not loaded before DOMContentLoaded! Many features will not work.");
          // Aggiungi messaggi di errore nei contenitori principali se D3 manca
          // Usiamo document.getElementById o querySelector standard se d3 non è caricato
         const barChartContainer = document.getElementById("bar-chart-container");
         const countryVizContent = document.getElementById("country-visualization-content");
         const evChartContainer = document.getElementById("ev-air-quality-chart-container");
         if (barChartContainer) barChartContainer.innerHTML = '<p class="placeholder-text error-text">Data visualization library (D3.js) not loaded.</p>';
         if (countryVizContent) countryVizContent.innerHTML = '<p class="placeholder-text error-text">Data visualization library (D3.js) not loaded.</p>';
         if (evChartContainer) evChartContainer.innerHTML = '<p class="placeholder-text error-text">Data visualization library (D3.js) not loaded.</p>';
          // Disabilita i controlli che dipendono da D3? O lascia che falliscano? Lasciamo che falliscano per ora.
     }


    if (!leafletCoreLoaded) {
        console.error("LEAFLET CORE (L) IS UNDEFINED AT DOMCONTENTLOADED!");
        // Usiamo document.getElementById o querySelector standard se d3 (e quindi d3.select) non è caricato
        const countryMapNode = document.getElementById("country-map");
        const heatmapNode = document.getElementById("heatmap-container-europe");
        const legendNode = document.getElementById("heatmap-legend-europe");

        if (countryMapNode) countryMapNode.innerHTML = '<p class="placeholder-text error-text">Core Map library (Leaflet) not loaded.</p>';
        if (heatmapNode) heatmapNode.innerHTML = '<p class="placeholder-text error-text">Core Map library (Leaflet) not loaded. Heatmap failed.</p>';
        if (legendNode) legendNode.innerHTML = '<p class="error-text" style="text-align:center; font-size:0.9em;">Legend failed.</p>';
    } else if (!leafletHeatLoaded && d3Loaded) { // Check d3Loaded before using d3.select here
         console.warn("LEAFLET.HEAT (L.heatLayer) IS UNDEFINED AT DOMCONTENTLOADED! Heatmap functionality will be affected.");
         // Usiamo d3.select se d3 è caricato, altrimenti standard JS
         const heatmapNode = d3Loaded ? d3.select("#heatmap-container-europe").node() : document.getElementById("heatmap-container-europe");
         const legendNode = d3Loaded ? d3.select("#heatmap-legend-europe").node() : document.getElementById("heatmap-legend-europe");

         if (heatmapNode) heatmapNode.innerHTML = '<p class="placeholder-text error-text">Heatmap plugin (Leaflet.heat) not loaded. Heatmap functionality is disabled.</p>';
         if (legendNode) legendNode.innerHTML = '<p class="error-text" style="text-align:center; font-size:0.9em;">Legend unavailable (plugin error).</p>';
    }

     if (d3Loaded) { // Only initialize dashboard functions if D3 is loaded
        initializeDashboard();
     } else {
         console.error("Dashboard initialization skipped due to missing D3.js.");
     }
});

console.log("Air quality dashboard script V_Hybrid (V27 animations + V34 heatmap/theme + V34 Popup HTML + Lollipop/Evolution Fixes) loaded.");
