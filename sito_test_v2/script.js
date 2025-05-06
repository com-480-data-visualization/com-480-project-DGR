// script.js

// --- Selettori DOM (Generali) ---
const pollutantSelect = d3.select("#pollutant-select");
const flashcard = d3.select("#pollutant-info");
const tooltip = d3.select(".tooltip"); // Il tooltip globale

// --- Selettori DOM (Overview) ---
const chartContainer = d3.select("#bar-chart");
const chartLoader = d3.select("#chart-loader");
const playPauseButton = d3.select("#play-pause-button");
const currentYearDisplay = d3.select("#current-year-display");
const yearSlider = d3.select("#year-slider");
const yearSliderValue = d3.select("#year-slider-value");

// --- Selettori DOM (Country View) ---
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

// --- Selettori DOM (EV Air Quality Correlation) ---
const evCountrySelect1 = d3.select("#ev-country-select-1");
const evCountrySelect2 = d3.select("#ev-country-select-2");
const evAirQualityChartContainer = d3.select("#ev-air-quality-chart-container");
const evAirQualityChartDiv = d3.select("#ev-air-quality-chart");
const evChartTooltip = d3.select("#ev-chart-tooltip"); // Tooltip specifico per EV Chart
const evChartLegendContainer = d3.select("#ev-chart-legend");


// --- Variabili Globali e Costanti ---
let mapInstance = null;
let currentMarkers = [];
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const DEFAULT_COUNTRY = "Italy";
const DEFAULT_POLLUTANT = "PM2.5";
let evolutionChartObserver = null;
let evolutionChartAnimated = false;
let currentlySelectedPoint = null;
let dataForEvolutionChart = [];
let lastCheckedPollutants = [];


// --- Costanti e Setup Grafico Overview ---
let initialChartWidth = 600;
try { initialChartWidth = parseInt(d3.select("#bar-chart-container").style("width")) || 600; } catch (e) { console.warn("Could not parse overview chart container width.") }
let initialChartHeight = initialChartWidth > 0 ? initialChartWidth * 0.65 : 450;
const margin = { top: 30, right: 50, bottom: 75, left: 120 }; // Ridotto top margin dato che non c'è più label sopra la barra
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
const colorScale = d3.scaleOrdinal(d3.schemeTableau10);

// --- Pollutant Information ---
const pollutantInfo = { "PM2.5": { name: "Fine Particulate Matter (PM2.5)", acceptableRange: "0-5 µg/m³ (WHO Annual Guideline 2021)", healthRisks: "Increased risk of respiratory and cardiovascular diseases, premature mortality.", emissionSources: "Combustion (vehicles, industry, power plants), biomass burning, dust.", guidelineValue: 5 }, "PM10": { name: "Coarse Particulate Matter (PM10)", acceptableRange: "0-15 µg/m³ (WHO Annual Guideline 2021)", healthRisks: "Irritation of the eyes, nose, and throat; respiratory issues, especially in vulnerable groups.", emissionSources: "Road dust, construction, industrial processes, agriculture, natural sources (pollen, sea salt).", guidelineValue: 15 }, "O3": { name: "Ozone (O3)", acceptableRange: "Peak season avg: 60 µg/m³ (WHO Guideline 2021)", healthRisks: "Chest pain, coughing, throat irritation, airway inflammation, reduced lung function, asthma exacerbation.", emissionSources: "Secondary pollutant: formed from NOx and VOCs reacting in sunlight.", guidelineValue: 60 }, "NO2": { name: "Nitrogen Dioxide (NO2)", acceptableRange: "0-10 µg/m³ (WHO Annual Guideline 2021)", healthRisks: "Airway inflammation, increased respiratory infections, linked to asthma development.", emissionSources: "Mainly from burning fuel (vehicles, power plants, industry).", guidelineValue: 10 }, "SO2": { name: "Sulfur Dioxide (SO2)", acceptableRange: "0-40 µg/m³ (WHO 24-hour Guideline 2021)", healthRisks: "Affects respiratory system, irritation of eyes, aggravates asthma and chronic bronchitis.", emissionSources: "Burning sulfur-containing fossil fuels (coal, oil) in power plants and industry; volcanoes.", guidelineValue: 40 } };

// --- Dati Dummy Storici ---
const years = Array.from({ length: 2024 - 2013 + 1 }, (_, i) => 2013 + i);
const baseData2024 = { "PM2.5": [ { Paese: "Poland", Concentrazione: 22.5 }, { Paese: "Bulgaria", Concentrazione: 20.1 }, { Paese: "Croatia", Concentrazione: 18.9 }, { Paese: "Italy", Concentrazione: 17.5 }, { Paese: "Romania", Concentrazione: 16.8 }, { Paese: "Czech Republic", Concentrazione: 16.2 }, { Paese: "Hungary", Concentrazione: 15.5 }, { Paese: "Slovakia", Concentrazione: 14.9 }, { Paese: "Greece", Concentrazione: 14.2 }, { Paese: "Lithuania", Concentrazione: 12.1 } ], "PM10": [ { Paese: "Poland", Concentrazione: 35.2 }, { Paese: "Bulgaria", Concentrazione: 33.0 }, { Paese: "Cyprus", Concentrazione: 31.5 }, { Paese: "Italy", Concentrazione: 29.8 }, { Paese: "Greece", Concentrazione: 28.1 }, { Paese: "Malta", Concentrazione: 27.5 }, { Paese: "Romania", Concentrazione: 26.4 }, { Paese: "Spain", Concentrazione: 24.0 } ], "O3": [ { Paese: "Italy", Concentrazione: 118 }, { Paese: "Greece", Concentrazione: 115 }, { Paese: "Spain", Concentrazione: 112 }, { Paese: "France", Concentrazione: 109 }, { Paese: "Portugal", Concentrazione: 105 }, { Paese: "Croatia", Concentrazione: 102 }, { Paese: "Germany", Concentrazione: 95 }, { Paese: "Austria", Concentrazione: 92 } ], "NO2": [ { Paese: "Belgium", Concentrazione: 28.5 }, { Paese: "Netherlands", Concentrazione: 27.1 }, { Paese: "Italy", Concentrazione: 26.0 }, { Paese: "Germany", Concentrazione: 24.8 }, { Paese: "Spain", Concentrazione: 23.5 }, { Paese: "France", Concentrazione: 22.0 }, { Paese: "Poland", Concentrazione: 21.2 }, { Paese: "Luxembourg", Concentrazione: 20.5 } ], "SO2": [ { Paese: "Bulgaria", Concentrazione: 10.5 }, { Paese: "Poland", Concentrazione: 9.8 }, { Paese: "Germany", Concentrazione: 7.2 }, { Paese: "Czech Republic", Concentrazione: 6.5 }, { Paese: "Romania", Concentrazione: 5.9 }, { Paese: "Greece", Concentrazione: 5.1 }, { Paese: "Spain", Concentrazione: 4.8 }, { Paese: "Estonia", Concentrazione: 4.2 } ] };
const historicalDummyData = {}; years.forEach(year => { historicalDummyData[year] = {}; Object.keys(baseData2024).forEach(pollutant => { historicalDummyData[year][pollutant] = baseData2024[pollutant].map(countryData => { let multiplier = 1.0; const yearDiff = 2024 - year; if (pollutant === "SO2") multiplier = 1 + yearDiff * (0.03 + Math.random() * 0.05); else if (pollutant === "NO2") multiplier = 1 + yearDiff * (0.01 + Math.random() * 0.03); else if (pollutant === "O3") multiplier = 1 - yearDiff * (0.005 + Math.random() * 0.01); else multiplier = 1 + yearDiff * (0.015 + Math.random() * 0.03); const newConcentration = Math.max(0.1, countryData.Concentrazione * multiplier * (0.95 + Math.random() * 0.1)); return { Paese: countryData.Paese, Concentrazione: parseFloat(newConcentration.toFixed(1)) }; }); }); });

// --- Dati Dummy Specifici Paese ---
const countrySpecificDummyData = { "Italy": { center: [41.9, 12.5], zoom: 5, cities: [ { name: "Rome", lat: 41.9028, lon: 12.4964, pollution: { "PM2.5": 18, "NO2": 28, "O3": 120, "PM10": 30, "SO2": 3 } }, { name: "Milan", lat: 45.4642, lon: 9.1900, pollution: { "PM2.5": 25, "NO2": 35, "O3": 110, "PM10": 38, "SO2": 4 } }, { name: "Naples", lat: 40.8518, lon: 14.2681, pollution: { "PM2.5": 19, "NO2": 30, "O3": 115, "PM10": 32, "SO2": 2 } }, { name: "Turin", lat: 45.0703, lon: 7.6869, pollution: { "PM2.5": 22, "NO2": 33, "O3": 105, "PM10": 35, "SO2": 3 } } ], pollutantEvolution: { "PM2.5": Object.fromEntries(years.map(y => [y, historicalDummyData[y]["PM2.5"]?.find(c => c.Paese === "Italy")?.Concentrazione || null])), "NO2": Object.fromEntries(years.map(y => [y, historicalDummyData[y]["NO2"]?.find(c => c.Paese === "Italy")?.Concentrazione || null])), "O3": Object.fromEntries(years.map(y => [y, historicalDummyData[y]["O3"]?.find(c => c.Paese === "Italy")?.Concentrazione || null])), "PM10": Object.fromEntries(years.map(y => [y, historicalDummyData[y]["PM10"]?.find(c => c.Paese === "Italy")?.Concentrazione || null])), "SO2": Object.fromEntries(years.map(y => [y, Math.max(0.5, (historicalDummyData[y]["SO2"]?.find(c => c.Paese === "Greece")?.Concentrazione || 5) * (0.6 + Math.random()*0.2))])) } }, "Germany": { center: [51.1, 10.4], zoom: 5, cities: [ { name: "Berlin", lat: 52.5200, lon: 13.4050, pollution: { "PM2.5": 12, "NO2": 25, "O3": 98, "PM10": 20, "SO2": 8 } }, { name: "Hamburg", lat: 53.5511, lon: 9.9937, pollution: { "PM2.5": 11, "NO2": 22, "O3": 90, "PM10": 18, "SO2": 6 } }, { name: "Munich", lat: 48.1351, lon: 11.5820, pollution: { "PM2.5": 4.5, "NO2": 28, "O3": 105, "PM10": 19, "SO2": 5 } }, ], pollutantEvolution: { "PM2.5": Object.fromEntries(years.map(y => [y, (historicalDummyData[y]["PM2.5"]?.find(c => c.Paese === "Germany")?.Concentrazione || 13)*(1+(2024-y)*0.02) ])), "NO2": Object.fromEntries(years.map(y => [y, historicalDummyData[y]["NO2"]?.find(c => c.Paese === "Germany")?.Concentrazione || null])), "O3": Object.fromEntries(years.map(y => [y, historicalDummyData[y]["O3"]?.find(c => c.Paese === "Germany")?.Concentrazione || null])), "SO2": Object.fromEntries(years.map(y => [y, historicalDummyData[y]["SO2"]?.find(c => c.Paese === "Germany")?.Concentrazione || null])), } }, "Poland": { center: [52.2, 19.1], zoom: 6, cities: [ { name: "Warsaw", lat: 52.2297, lon: 21.0122, pollution: { "PM2.5": 24, "NO2": 22, "PM10": 36, "O3": 85, "SO2": 10 } }, { name: "Krakow", lat: 50.0647, lon: 19.9450, pollution: { "PM2.5": 30, "NO2": 25, "PM10": 45, "O3": 78, "SO2": 12 } }, { name: "Wroclaw", lat: 51.1079, lon: 17.0385, pollution: { "PM2.5": 13, "NO2": 24, "PM10": 40, "O3": 80, "SO2": 11 } }, ], pollutantEvolution: { "PM2.5": Object.fromEntries(years.map(y => [y, historicalDummyData[y]["PM2.5"]?.find(c => c.Paese === "Poland")?.Concentrazione || null])), "NO2": Object.fromEntries(years.map(y => [y, historicalDummyData[y]["NO2"]?.find(c => c.Paese === "Poland")?.Concentrazione || null])), "PM10": Object.fromEntries(years.map(y => [y, historicalDummyData[y]["PM10"]?.find(c => c.Paese === "Poland")?.Concentrazione || null])), "SO2": Object.fromEntries(years.map(y => [y, historicalDummyData[y]["SO2"]?.find(c => c.Paese === "Poland")?.Concentrazione || null])), } } };
const availableCountries = Object.keys(countrySpecificDummyData);
const availablePollutants = Object.keys(pollutantInfo);

// --- Variabili di Stato (Overview) ---
let timelapseInterval = null; let currentYearIndex = 0; const timelapseSpeed = 1500; let currentPollutant = null; let currentDisplayYear = years[0]; let isPlaying = false;


// --- Dati Dummy EV e Qualità Aria (Estendibili) ---
const evDummyData = { "Italy": { color: "#1f77b4", ev_purchases: { 2018: 5000, 2019: 9000, 2020: 25000, 2021: 60000, 2022: 75000, 2023: 90000, 2024: 110000 }, avg_pm25: { 2018: 18.5, 2019: 17.9, 2020: 15.2, 2021: 14.8, 2022: 14.5, 2023: 14.1, 2024: 13.8 } }, "Germany": { color: "#ff7f0e", ev_purchases: { 2018: 40000, 2019: 63000, 2020: 194000, 2021: 356000, 2022: 470000, 2023: 520000, 2024: 600000 }, avg_pm25: { 2018: 12.2, 2019: 11.8, 2020: 10.5, 2021: 10.1, 2022: 9.8, 2023: 9.5, 2024: 9.2 } }, "France": { color: "#2ca02c", ev_purchases: { 2018: 31000, 2019: 43000, 2020: 111000, 2021: 162000, 2022: 203000, 2023: 260000, 2024: 310000 }, avg_pm25: { 2018: 11.5, 2019: 11.0, 2020: 9.8, 2021: 9.5, 2022: 9.2, 2023: 8.9, 2024: 8.5 } }, "Norway": { color: "#d62728", ev_purchases: { 2018: 72000, 2019: 80000, 2020: 105000, 2021: 113000, 2022: 138000, 2023: 150000, 2024: 160000 }, avg_pm25: { 2018: 7.0, 2019: 6.8, 2020: 6.1, 2021: 5.9, 2022: 5.5, 2023: 5.2, 2024: 5.0 } }, "Poland": { color: "#9467bd", ev_purchases: { 2018: 1500, 2019: 3000, 2020: 9000, 2021: 20000, 2022: 35000, 2023: 55000, 2024: 70000 }, avg_pm25: { 2018: 22.5, 2019: 21.8, 2020: 19.5, 2021: 18.9, 2022: 18.2, 2023: 17.5, 2024: 17.0 } } };
const evAvailableCountries = Object.keys(evDummyData);
const evYears = [...new Set(Object.values(evDummyData).flatMap(country => Object.keys(country.ev_purchases).map(Number)))].sort();

// --- Variabili Globali Grafico EV ---
let evChartWidth, evChartHeight, evChartInnerWidth, evChartInnerHeight;
const evChartMargin = { top: 50, right: 100, bottom: 70, left: 90 };

// --- Funzioni Ausiliarie ---
function debounce(func, wait, immediate) { let timeout; return function executedFunction() { const context = this; const args = arguments; const later = function() { timeout = null; if (!immediate) func.apply(context, args); }; const callNow = immediate && !timeout; clearTimeout(timeout); timeout = setTimeout(later, wait); if (callNow) func.apply(context, args); }; }
function showLoader() { chartLoader.style("display", "flex").style("opacity", 1); }
function hideLoader() { chartLoader.transition("loaderFade").duration(200).style("opacity", 0).end().then(() => chartLoader.style("display", "none")).catch(() => chartLoader.style("display", "none")); }
function calculateZScores(data) { const values = Object.values(data).filter(v => typeof v === 'number' && isFinite(v)); if (values.length < 2) return Object.keys(data).reduce((acc, key) => { acc[key] = 0; return acc; }, {}); const mean = d3.mean(values); const stdDev = d3.deviation(values); if (stdDev === 0 || stdDev === undefined || !isFinite(stdDev)) return Object.keys(data).reduce((acc, key) => { acc[key] = (typeof data[key] === 'number' && isFinite(data[key])) ? 0 : NaN; return acc; }, {}); const zScores = {}; for (const key in data) { if (typeof data[key] === 'number' && isFinite(data[key])) zScores[key] = (data[key] - mean) / stdDev; else zScores[key] = NaN; } return zScores; }


// --- FUNZIONI TOOLTIP GLOBALE (Aggiornate per il nuovo stile) ---
function handleMouseOver(event, d) {
    tooltip.transition("tooltipFade").duration(100).style("opacity", 1).style("transform", "translateY(0px)"); // Effetto entrata

    let countryName = d.Paese || d.name || d.pollutant || "N/A";
    let value, unit, isZScore = false, yearInfo = d.year || null;

    if (d.hasOwnProperty('Concentrazione')) { // Per Overview Chart
        value = d.Concentrazione;
        unit = 'µg/m³';
    } else if (d.hasOwnProperty('value') && d.hasOwnProperty('year')) { // Per Evolution Chart Points
        value = d.value;
        unit = 'µg/m³';
    } else if (d.hasOwnProperty('zScore')) { // Per Z-Score Chart
        value = d.zScore;
        unit = 'Z';
        isZScore = true;
    } else if (d.hasOwnProperty('value')) { // Fallback per altre strutture con 'value'
        value = d.value;
        unit = 'µg/m³'; // Assumiamo µg/m³ se non specificato altrimenti
    } else {
        value = 0; // Valore di default se non trovato
        unit = '';
    }

    tooltip.html(`
        <div class="tooltip-country">${countryName}</div>
        <div class="tooltip-detail">
            <span class="tooltip-value">${(value || 0).toFixed(isZScore ? 2 : 1)}</span>
            <span class="tooltip-unit">${unit}</span>
        </div>
        ${yearInfo ? `<div class="tooltip-year">(${yearInfo})</div>` : ''}
    `)
    .style("left", (event.pageX + 12) + "px") // Offset leggermente aumentato
    .style("top", (event.pageY - tooltip.node().getBoundingClientRect().height - 12) + "px"); // Posiziona sopra il cursore

    d3.select(this).style("filter", "brightness(0.85)");
}

function handleMouseOut(event, d) {
    tooltip.transition("tooltipFadeOut").duration(150).style("opacity", 0).style("transform", "translateY(5px)"); // Effetto uscita
    d3.select(this).style("filter", "brightness(1)");
}


// --- Funzioni Aggiornamento UI (Overview Chart) ---
function updateChart(pollutantKey, data, year, updateSlider = true) {
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
    const allPossibleCountries = [...new Set(baseData2024[pollutantKey]?.map(d => d.Paese) || [])];
    colorScale.domain(allPossibleCountries);

    const t_overview = overviewSVG.transition("overviewTrans").duration(750).ease(d3.easeCubicOut);
    const t_fast_overview = overviewSVG.transition("overviewFastTrans").duration(300).ease(d3.easeLinear);
    const enterDelay = 100;

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
        // MODIFICATO: Usa il tooltip globale invece della label sulla barra
        .on("mouseover", handleMouseOver) // Chiama la funzione handleMouseOver globale
        .on("mouseout", handleMouseOut)   // Chiama la funzione handleMouseOut globale
        .transition(t_overview)
        .delay((d, i, nodes) => d3.select(nodes[i]).attr('width') === '0' ? i * enterDelay : 0)
        .attr("y", d => y(d.Paese) ?? 0)
        .attr("width", d => Math.max(0, x(d.Concentrazione)))
        .attr("height", y.bandwidth())
        .style("opacity", 1)
        .style("fill", d => colorScale(d.Paese));

    // Rimuovi le vecchie bar-hover-label se presenti da versioni precedenti
    overviewG.selectAll(".bar-hover-label").remove();

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


function updatePollutantInfo(pollutantKey) { const info = pollutantInfo[pollutantKey]; flashcard.classed("updating", true); setTimeout(() => { flashcard.select("#pollutant-name").html(info ? info.name : "N/A"); flashcard.select("#acceptable-range").text(info ? `${info.acceptableRange}` : "N/A"); flashcard.select("#health-risks").text(info ? info.healthRisks : "N/A"); flashcard.select("#emission-sources").text(info ? info.emissionSources : "N/A"); setTimeout(() => { flashcard.classed("updating", false); }, 50); }, 100); }
function stopTimelapse() { if (timelapseInterval) { clearInterval(timelapseInterval); timelapseInterval = null; isPlaying = false; playPauseButton.attr("aria-label", "Play timelapse").select("i").attr("class", "fas fa-play"); } }
function runTimelapseStep() { if (!currentPollutant || !isPlaying) { stopTimelapse(); return; } currentDisplayYear = years[currentYearIndex]; const dataForYear = historicalDummyData[currentDisplayYear]?.[currentPollutant]; if (dataForYear) { updateChart(currentPollutant, dataForYear, currentDisplayYear, true); } else { console.warn(`No data for ${currentPollutant} in ${currentDisplayYear}`); updateChart(currentPollutant, [], currentDisplayYear, true); } currentYearIndex++; if (currentYearIndex >= years.length) { currentYearIndex = 0; } }
function startTimelapse(pollutantKey) { stopTimelapse(); if (pollutantKey) { currentPollutant = pollutantKey; } else if (!currentPollutant) { console.error("Cannot start timelapse."); return; } isPlaying = true; playPauseButton.attr("aria-label", "Pause timelapse").select("i").attr("class", "fas fa-pause"); runTimelapseStep(); timelapseInterval = setInterval(runTimelapseStep, timelapseSpeed); }
function togglePlayPause() { if (isPlaying) { stopTimelapse(); } else { const selectedPollutant = pollutantSelect.property("value"); if (selectedPollutant) { startTimelapse(selectedPollutant); } else { console.warn("Select pollutant first."); } } }


// --- Funzioni Vista Paese  ---
function initializeCountryView() {
    countrySelect.selectAll("option").remove();
    countrySelect.append("option").attr("value", "").text("-- Select Country --").property("disabled", true);
    countrySelect.selectAll("option.country-option")
        .data(availableCountries)
        .enter().append("option")
        .attr("class", "country-option")
        .attr("value", d => d)
        .text(d => d);
    countryVisualizationContent.classed("hidden", true);
    evolutionClickInfoContainer.html("Click on a point to see details. (Select from Top 3)");
    cityComparisonChartContainer.html('<p class="placeholder-text">Select a country and pollutant...</p>');
    cityComparisonPollutantSpan.text('N/A');
    cityPollutantSelect.selectAll("option").remove();
    cityPollutantSelect.selectAll("option.city-poll-option")
       .data(availablePollutants)
       .enter().append("option")
       .attr("class", "city-poll-option")
       .attr("value", d => d)
       .text(d => pollutantInfo[d]?.name || d);
   evolutionCheckboxContainer.html('');
}
async function loadCountryData(countryName) {
    console.log("[V27 Lollipop Label Fix] Loading data for:", countryName);
    selectedCountryNameMap.text(countryName); selectedCountryNameStats.text(countryName); countrySelect.property("value", countryName);
    evolutionClickInfoContainer.html("Click on a point to see details. (Select from Top 3)");
    currentlySelectedPoint = null;
    evolutionChartAnimated = false;
    countryMapSection.style("opacity", 0).style("transform", "translateY(15px)"); countryStatsSection.style("opacity", 0).style("transform", "translateY(15px)"); countryMapContainer.html('<p class="placeholder-text">Loading map...</p>'); pollutantDistributionChartContainer.html('<p class="placeholder-text">Loading statistics...</p>'); pollutantEvolutionChartContainer.html('<p class="placeholder-text">Loading evolution data...</p>'); dominantPollutantDisplay.text("N/A");
    cityComparisonChartContainer.html('<p class="placeholder-text">Loading city comparison...</p>');
    evolutionCheckboxContainer.html('<p class="placeholder-text" style="margin: 5px 0; font-size: 0.85em;">Loading pollutant options...</p>');
    countryVisualizationContent.classed("hidden", false);
    const countryData = countrySpecificDummyData[countryName];
    if (!countryData) { console.error(`[V27] No data found for country: ${countryName}`); countryMapSection.style("opacity", 1).style("transform", "translateY(0px)"); countryStatsSection.style("opacity", 1).style("transform", "translateY(0px)"); if (mapInstance) { try { mapInstance.remove(); } catch(e){} mapInstance = null; } cityComparisonChartContainer.html('<p class="placeholder-text error-text">Country data not found.</p>'); evolutionCheckboxContainer.html('<p class="placeholder-text error-text" style="margin: 5px 0; font-size: 0.85em;">No pollutants.</p>'); return; }
    const initialCityPollutant = currentPollutant || DEFAULT_POLLUTANT;
    cityPollutantSelect.property("value", initialCityPollutant);
    cityComparisonPollutantSpan.text(initialCityPollutant || 'N/A');
    initializeEvolutionCheckboxes(countryName, countryData);
    const initialEvolutionPollutants = getSelectedEvolutionPollutants();
    lastCheckedPollutants = initialEvolutionPollutants;
    countryMapSection.transition("sectionFadeInMap").duration(500).delay(100).style("opacity", 1).style("transform", "translateY(0px)");
    countryStatsSection.transition("sectionFadeInStats").duration(500).delay(250).style("opacity", 1).style("transform", "translateY(0px)");
    await new Promise(resolve => setTimeout(resolve, 150));
    updateCountryMap(countryName, countryData);
    const distChartPromise = new Promise(resolve => { setTimeout(() => { updatePollutantDistributionChart(countryName, countryData, resolve); }, 300); });
    const evolChartPromise = new Promise(resolve => { setTimeout(() => { updatePollutantEvolutionChart(countryName, countryData, initialEvolutionPollutants, resolve, true); }, 400); });
    const cityCompPromise = new Promise(resolve => { setTimeout(() => { updateCityLollipopChart(countryName, countryData, initialCityPollutant, resolve); }, 280); });
    await Promise.all([distChartPromise, evolChartPromise, cityCompPromise]);
    console.log("[V27] Charts updated for:", countryName);
    setupEvolutionChartObserver();
}
function updateCountryMap(countryName, countryData) {
    countryMapContainer.html(''); countryMapContainer.style("opacity", 1).style("background-color", "var(--container-bg)");
    const mapId = 'country-map'; const mapElement = countryMapContainer.node();
    const centerCoords = countryData.center || [50, 15]; const zoomLevel = countryData.zoom || 4;
    const createPopupContent = (city) => { const pm25Value = city.pollution?.['PM2.5']; let aqiCategory = 'N/A'; let aqiClass = 'aqi-unknown'; let aqiIcon = 'fas fa-question-circle'; if (typeof pm25Value === 'number' && isFinite(pm25Value)) { if (pm25Value <= 5) { aqiCategory = 'Good'; aqiClass = 'aqi-good'; aqiIcon = 'fas fa-smile'; } else if (pm25Value <= 10) { aqiCategory = 'Moderate'; aqiClass = 'aqi-moderate'; aqiIcon = 'fas fa-meh'; } else if (pm25Value <= 15) { aqiCategory = 'Unhealthy (Sensitive)'; aqiClass = 'aqi-unhealthy-s'; aqiIcon = 'fas fa-frown'; } else { aqiCategory = 'Unhealthy'; aqiClass = 'aqi-unhealthy'; aqiIcon = 'fas fa-sad-tear'; } } let pollutantListHtml = '<ul class="popup-pollutant-list">'; const pollutantsToShow = ["PM2.5", "NO2", "O3", "PM10"]; pollutantsToShow.forEach(poll => { const value = city.pollution?.[poll]; if (typeof value === 'number' && isFinite(value)) { pollutantListHtml += `<li class="popup-pollutant-item"><span class="pollutant-name">${poll}:</span><span class="pollutant-value">${value.toFixed(1)} µg/m³</span></li>`; } }); pollutantListHtml += '</ul>'; let content = `<div class="popup-header ${aqiClass}"><span class="popup-aqi-icon"><i class="${aqiIcon}"></i></span><span class="popup-aqi-category">${aqiCategory}</span></div><div class="popup-body"><h4 class="popup-city-name">${city.name}</h4>${pollutantListHtml}</div>`; return content; };
    try { if (typeof L === 'undefined') throw new Error("Leaflet (L) is not defined!"); if (mapInstance) { mapInstance.remove(); mapInstance = null; } if (!mapElement || mapElement.offsetHeight <= 0) { setTimeout(() => { const currentSelectedCountry = countrySelect.property("value"); if (currentSelectedCountry === countryName) { updateCountryMap(countryName, countryData); } }, 250); return; } mapInstance = L.map(mapId, { scrollWheelZoom: false }).setView(centerCoords, zoomLevel); L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 18 }).addTo(mapInstance); currentMarkers = []; let markersAdded = 0; if (countryData.cities && countryData.cities.length > 0) { countryData.cities.forEach(city => { const popupContent = createPopupContent(city); const marker = L.marker([city.lat, city.lon]).addTo(mapInstance).bindPopup(popupContent, { minWidth: 220 }); currentMarkers.push(marker); markersAdded++; }); } else { const marker = L.marker(centerCoords).addTo(mapInstance).bindPopup(`<strong>${countryName}</strong><br>(No specific city data)`); currentMarkers.push(marker); markersAdded++; } setTimeout(() => { requestAnimationFrame(() => { if (mapInstance) { mapInstance.invalidateSize(true); } }); }, 100);
    } catch (error) { console.error("Map update error:", error); countryMapContainer.html(`<p class="placeholder-text error-text">Error updating map: ${error.message}</p>`); if (mapInstance) { try { mapInstance.remove(); } catch (e) {} mapInstance = null; } }
}

function updateCityLollipopChart(countryName, countryData, pollutantKey, onAnimationEndCallback) {
    cityComparisonChartContainer.html('');
    cityComparisonPollutantSpan.text(pollutantKey || 'N/A');
    if (!countryData || !countryData.cities || countryData.cities.length === 0) { cityComparisonChartContainer.html("<p class='placeholder-text'>No city data available for this country.</p>"); if (onAnimationEndCallback) onAnimationEndCallback(); return; }
    const cityDataForPollutant = countryData.cities.map(city => ({ name: city.name, value: city.pollution?.[pollutantKey] })).filter(d => d.value !== undefined && d.value !== null && typeof d.value === 'number' && isFinite(d.value)).sort((a, b) => b.value - a.value);
    if (cityDataForPollutant.length === 0) { cityComparisonChartContainer.html(`<p class='placeholder-text'>No data available for ${pollutantKey} in cities of ${countryName}.</p>`); if (onAnimationEndCallback) onAnimationEndCallback(); return; }
    const containerNode = cityComparisonChartContainer.node(); if (!containerNode) return;
    const parentWidth = containerNode.getBoundingClientRect().width;
    const calculatedHeight = 38 * cityDataForPollutant.length + 90;
    const height = Math.max(220, calculatedHeight);
    const marginLolli = { top: 25, right: 80, bottom: 50, left: 110 };
    const innerWidthLolli = Math.max(10, parentWidth - marginLolli.left - marginLolli.right);
    const innerHeightLolli = Math.max(10, height - marginLolli.top - marginLolli.bottom);
    const svgLolli = cityComparisonChartContainer.append("svg").attr("id", "city-lollipop-svg").attr("viewBox", `0 0 ${parentWidth} ${height}`).attr("preserveAspectRatio", "xMidYMid meet").style("width", "100%").style("height", "auto").append("g").attr("transform", `translate(${marginLolli.left},${marginLolli.top})`);
    const guidelineValue = pollutantInfo[pollutantKey]?.guidelineValue;
    const maxValue = d3.max(cityDataForPollutant, d => d.value) || 0;
    const upperXDomain = guidelineValue !== undefined ? Math.max(maxValue, guidelineValue) : maxValue;
    const xLolli = d3.scaleLinear().domain([0, upperXDomain * 1.05 || 10]).nice().range([0, innerWidthLolli]);
    const yLolli = d3.scaleBand().domain(cityDataForPollutant.map(d => d.name)).range([0, innerHeightLolli]).padding(0.5);
    const xAxisLolli = d3.axisBottom(xLolli).ticks(Math.max(3, Math.floor(innerWidthLolli / 75))).tickSizeInner(-innerHeightLolli).tickPadding(10);
    const yAxisLolli = d3.axisLeft(yLolli).tickSize(0).tickPadding(12);
    svgLolli.append("g").attr("class", "x-axis axis lollipop-axis").attr("transform", `translate(0,${innerHeightLolli})`).call(xAxisLolli).selectAll(".tick line").attr("stroke", "var(--grid-line-color)").attr("stroke-dasharray", "var(--grid-line-style)").style("opacity", 0.6);
    svgLolli.select(".x-axis.lollipop-axis .domain").remove();
    svgLolli.append("g").attr("class", "y-axis axis lollipop-axis").call(yAxisLolli);
    svgLolli.append("text").attr("class", "axis-label x-axis-label").attr("x", innerWidthLolli / 2).attr("y", innerHeightLolli + marginLolli.bottom - 10).attr("text-anchor", "middle").text(`Concentration (${pollutantKey}, µg/m³)`);
    if (guidelineValue !== undefined && guidelineValue > 0) { const guidelineX = xLolli(guidelineValue); if (guidelineX >= 0 && guidelineX <= innerWidthLolli) { svgLolli.append("line").attr("class", "guideline-line lollipop-guideline").attr("x1", guidelineX).attr("x2", guidelineX).attr("y1", 0).attr("y2", innerHeightLolli).style("opacity", 0); svgLolli.append("text").attr("class", "guideline-label lollipop-guideline-label").attr("x", guidelineX).attr("y", -8).attr("text-anchor", "middle").text(`WHO (${guidelineValue})`).style("opacity", 0); svgLolli.selectAll(".lollipop-guideline, .lollipop-guideline-label").transition("guidelineFadeLollipop").duration(600).delay(700).style("opacity", 0.8); } }
    const lolliGroups = svgLolli.selectAll(".lollipop-group").data(cityDataForPollutant, d => d.name).enter().append("g").attr("class", "lollipop-group").attr("transform", d => `translate(0, ${yLolli(d.name) + yLolli.bandwidth() / 2})`);
    lolliGroups.append("line").attr("class", "lollipop-line").attr("x1", xLolli(0)).attr("x2", xLolli(0)).attr("y1", 0).attr("y2", 0);
    lolliGroups.append("circle").attr("class", "lollipop-dot").attr("cx", xLolli(0)).attr("cy", 0).attr("r", 0);
    lolliGroups.append("text").attr("class", "lollipop-hover-label-value").attr("y", 0).attr("dy", "0.35em").style("font-size", "11.5px").style("font-weight", "600").style("fill", "var(--text-accent)").style("opacity", 0).style("pointer-events", "none");
    lolliGroups.style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            d3.select(this).select(".lollipop-dot").transition("dotHoverLollipop").duration(150).attr("r", 'var(--lollipop-dot-hover-radius)');
            d3.select(this).select(".lollipop-line").transition("lineHoverLollipop").duration(150).attr("stroke", 'var(--lollipop-line-hover-color)').attr("stroke-width", 2);
            const labelValue = d3.select(this).select(".lollipop-hover-label-value");
            labelValue.text(`${d.value.toFixed(1)} µg/m³`);
            const textNode = labelValue.node(); let bbox = { x: 0, y: 0, width: 0, height: 0 }; if (textNode) bbox = textNode.getBBox();
            const labelXPos = xLolli(d.value) + 15;
            labelValue.attr("x", labelXPos).style("opacity", 0).transition("lolliLabelFadeIn").duration(150).style("opacity", 1);
            d3.select(this).selectAll(".lollipop-hover-label-bg").remove();
            d3.select(this).insert("rect", ".lollipop-hover-label-value").attr("class", "lollipop-hover-label-bg").attr("x", labelXPos - 5).attr("y", bbox.y - 3).attr("width", bbox.width + 10).attr("height", bbox.height + 6).attr("rx", 4).attr("ry", 4).style("fill", "rgba(255, 255, 255, 0.95)").style("stroke", "var(--border-color)").style("stroke-width", "0.5px").style("pointer-events", "none").style("opacity", 0).transition("lolliLabelBgFadeIn").duration(150).style("opacity", 1);
        })
        .on("mouseout", function(event, d) {
            d3.select(this).select(".lollipop-dot").transition("dotHoverLollipopOut").duration(200).attr("r", 'var(--lollipop-dot-radius)');
            d3.select(this).select(".lollipop-line").transition("lineHoverLollipopOut").duration(200).attr("stroke", 'var(--lollipop-line-color)').attr("stroke-width", 1.5);
            d3.select(this).select(".lollipop-hover-label-value").transition("lolliLabelFadeOut").duration(150).style("opacity", 0);
            d3.select(this).select(".lollipop-hover-label-bg").transition("lolliLabelBgFadeOut").duration(150).style("opacity", 0).remove();
        });
    const animDuration = 700; const animDelay = (d, i) => i * 50; const animEase = d3.easeCubicOut;
    lolliGroups.select(".lollipop-line").transition("lineAnimLollipop").duration(animDuration).delay(animDelay).ease(animEase).attr("x2", d => xLolli(d.value));
    lolliGroups.select(".lollipop-dot").transition("dotAnimLollipop").duration(animDuration).delay((d, i) => animDelay(d, i) + 150).ease(animEase).attr("cx", d => xLolli(d.value)).attr("r", 'var(--lollipop-dot-radius)');
    if (onAnimationEndCallback) { const totalTransitions = cityDataForPollutant.length; if (totalTransitions === 0) { onAnimationEndCallback(); } else { setTimeout(onAnimationEndCallback, animDuration + totalTransitions * 50 + 200); } }
}

function updatePollutantDistributionChart(countryName, countryData, onAnimationEndCallback) {
    pollutantDistributionChartContainer.html('');
    const latestYearData = countryData.pollutantEvolution ? Math.max(...Object.values(countryData.pollutantEvolution).flatMap(pollData => Object.keys(pollData).map(Number).filter(isFinite))) : null;
    let latestPollution = {}; let hasData = false;
    if (latestYearData !== null && isFinite(latestYearData) && countryData.pollutantEvolution) { for (const poll in countryData.pollutantEvolution) { const pollDataForYear = countryData.pollutantEvolution[poll]?.[latestYearData]; if (pollDataForYear !== undefined && pollDataForYear !== null && typeof pollDataForYear === 'number' && isFinite(pollDataForYear)) { latestPollution[poll] = pollDataForYear; hasData = true; } } }
    else if (countryData.cities && countryData.cities.length > 0) { const cityPollutionSum = {}; const cityPollutionCount = {}; countryData.cities.forEach(city => { for (const poll in city.pollution) { if (typeof city.pollution[poll] === 'number' && isFinite(city.pollution[poll])) { cityPollutionSum[poll] = (cityPollutionSum[poll] || 0) + city.pollution[poll]; cityPollutionCount[poll] = (cityPollutionCount[poll] || 0) + 1; hasData = true; } } }); for (const poll in cityPollutionSum) { if (cityPollutionCount[poll] > 0) latestPollution[poll] = cityPollutionSum[poll] / cityPollutionCount[poll]; } }
    if (!hasData) { pollutantDistributionChartContainer.html("<p class='placeholder-text'>No recent data available for distribution chart.</p>"); dominantPollutantDisplay.text("N/A"); if(onAnimationEndCallback) onAnimationEndCallback(); return; }
    const zScores = calculateZScores(latestPollution);
    const dataForChart = Object.entries(zScores).filter(([_, z]) => typeof z === 'number' && isFinite(z)).map(([p, z]) => ({ pollutant: p, zScore: z })).sort((a,b) => b.zScore - a.zScore);
    if (dataForChart.length === 0) { pollutantDistributionChartContainer.html("<p class='placeholder-text'>Could not calculate Z-scores.</p>"); dominantPollutantDisplay.text("N/A"); if(onAnimationEndCallback) onAnimationEndCallback(); return; }
    const dominant = dataForChart[0]; dominantPollutantDisplay.text(dominant ? `${dominant.pollutant} (${dominant.zScore.toFixed(2)})` : "N/A");
    const containerNodeDist = pollutantDistributionChartContainer.node(); if (!containerNodeDist) return;
    const parentWidth = containerNodeDist.getBoundingClientRect().width;
    const height = 280;
    const marginDist = { top: 20, right: 30, bottom: 60, left: 90 };
    const innerWidthDist = Math.max(10, parentWidth - marginDist.left - marginDist.right);
    const innerHeightDist = Math.max(10, height - marginDist.top - marginDist.bottom);
    const svgDist = pollutantDistributionChartContainer.append("svg") .attr("id", "zscore-distribution-svg") .attr("viewBox", `0 0 ${parentWidth} ${height}`).attr("preserveAspectRatio", "xMidYMid meet").style("width", "100%").style("height", "auto").append("g").attr("transform", `translate(${marginDist.left},${marginDist.top})`);
    const [minZ, maxZ] = d3.extent(dataForChart, d => d.zScore);
    const xPadding = Math.max(Math.abs(minZ || 0), Math.abs(maxZ || 0)) * 0.1 + 0.1;
    const xDomain = [Math.min(0, (minZ || 0)) - xPadding, Math.max(0, (maxZ || 0)) + xPadding];
    const xDist = d3.scaleLinear().domain(xDomain).range([0, innerWidthDist]).nice(5);
    const yDist = d3.scaleBand().domain(dataForChart.map(d => d.pollutant)).range([0, innerHeightDist]).padding(0.3);
    const xAxis = d3.axisBottom(xDist).ticks(Math.max(3, Math.floor(innerWidthDist / 70))).tickSizeOuter(0).tickPadding(10).tickSizeInner(-innerHeightDist);
    const yAxis = d3.axisLeft(yDist).tickSize(0).tickPadding(12);
    svgDist.append("g").attr("class", "x-axis axis").attr("transform", `translate(0,${innerHeightDist})`).call(xAxis);
    svgDist.selectAll(".x-axis .tick line").attr("stroke", "var(--grid-line-color)").attr("stroke-dasharray", "var(--grid-line-style)").style("opacity", 0.5);
    svgDist.append("g").attr("class", "y-axis axis").call(yAxis).select(".domain").remove();
    svgDist.selectAll(".y-axis .tick text").style("font-weight", "500").style("fill", "var(--text-primary)");
    svgDist.append("text").attr("class", "axis-label x-axis-label").attr("x", innerWidthDist / 2).attr("y", innerHeightDist + marginDist.bottom - 15).attr("text-anchor", "middle").text("Z-Score (Normalized Value)");
    if (xDist(0) >= 0 && xDist(0) <= innerWidthDist) { svgDist.append("line").attr("class", "zero-line").attr("x1", xDist(0)).attr("x2", xDist(0)).attr("y1", 0).attr("y2", innerHeightDist).attr("stroke", "var(--zero-line-color)").attr("stroke-width", 1.5); }
    const bars = svgDist.selectAll(".dist-bar").data(dataForChart).enter().append("rect").attr("class", "dist-bar").attr("y", d => yDist(d.pollutant)).attr("height", yDist.bandwidth()).attr("x", d => d.zScore >= 0 ? xDist(0) : xDist(d.zScore)).attr("width", 0).attr("fill", d => d.zScore >= 0 ? "var(--dist-bar-positive)" : "var(--dist-bar-negative)").attr("rx", "var(--dist-bar-radius)").attr("ry", "var(--dist-bar-radius)")
        .on("mouseover", handleMouseOver ) // Usa il tooltip globale
        .on("mouseout", handleMouseOut );  // Usa il tooltip globale
    const barsTransition = bars.transition("distBarsAnim").duration(750).delay((d,i) => i * 80).attr("width", d => Math.max(0, Math.abs(xDist(d.zScore) - xDist(0))));
    if (onAnimationEndCallback) { const totalTransitions = dataForChart.length; if (totalTransitions === 0) { onAnimationEndCallback(); } else { setTimeout(() => {Promise.all(barsTransition.end()).then(onAnimationEndCallback).catch(onAnimationEndCallback)}, 750 + totalTransitions * 80 + 300); } }
}

// --- Funzioni Pollutant Evolution ---
function initializeEvolutionCheckboxes(countryName, countryData) {
    evolutionCheckboxContainer.html('');
    if (!countryData || !countryData.pollutantEvolution || Object.keys(countryData.pollutantEvolution).length === 0) { evolutionCheckboxContainer.html('<p class="placeholder-text error-text" style="margin: 5px 0; font-size: 0.85em;">No evolution data available.</p>'); lastCheckedPollutants = []; return; }
    const avgPollutantValues = Object.entries(countryData.pollutantEvolution).map(([poll, data]) => { const numericValues = Object.values(data).filter(v => typeof v === 'number' && isFinite(v)); return { pollutant: poll, avgValue: numericValues.length > 1 ? d3.mean(numericValues) : -Infinity }; }).filter(d => d.avgValue > -Infinity).sort((a, b) => b.avgValue - a.avgValue);
    const top3Pollutants = avgPollutantValues.slice(0, 3).map(d => d.pollutant);
    if (top3Pollutants.length === 0) { evolutionCheckboxContainer.html('<p class="placeholder-text error-text" style="margin: 5px 0; font-size: 0.85em;">Not enough data for top pollutants.</p>'); lastCheckedPollutants = []; return; }
    const colorForLabels = d3.scaleOrdinal(d3.schemeCategory10).domain(top3Pollutants);
    const checkboxItems = evolutionCheckboxContainer.selectAll(".checkbox-item").data(top3Pollutants).enter().append("label").attr("class", "checkbox-item");
    checkboxItems.append("input").attr("type", "checkbox").attr("name", "pollutant-evolution").attr("value", d => d).property("checked", true).on("change", handleEvolutionCheckboxChange);
    checkboxItems.append("span").attr("class", "checkbox-label-text").style("color", d => colorForLabels(d)).style("font-weight", "500").text(d => d);
    enforceMinimumPollutantSelection();
}
function getSelectedEvolutionPollutants() { const selected = []; evolutionCheckboxContainer.selectAll('input[type="checkbox"]:checked').each(function(d) { selected.push(this.value); }); return selected; }
function handleEvolutionCheckboxChange(event) {
    enforceMinimumPollutantSelection();
    const selectedCountry = countrySelect.property("value");
    const countryData = countrySpecificDummyData[selectedCountry];
    const selectedPollutants = getSelectedEvolutionPollutants();
    lastCheckedPollutants = selectedPollutants;
    if (selectedCountry && countryData && selectedPollutants.length > 0) { evolutionChartAnimated = false; updatePollutantEvolutionChart(selectedCountry, countryData, selectedPollutants, null, false); setupEvolutionChartObserver(); } else if (selectedPollutants.length === 0) { pollutantEvolutionChartContainer.html('<p class="placeholder-text">Please select at least one pollutant.</p>'); evolutionClickInfoContainer.html('Select from Top 3 pollutants.'); currentlySelectedPoint = null; }
}
function enforceMinimumPollutantSelection() { const checkboxes = evolutionCheckboxContainer.selectAll('input[type="checkbox"]'); const checkedCheckboxes = evolutionCheckboxContainer.selectAll('input[type="checkbox"]:checked'); const checkedCount = checkedCheckboxes.size(); checkboxes.property("disabled", false); if (checkedCount <= 1) { checkedCheckboxes.property("disabled", true); } }

function updatePollutantEvolutionChart(countryName, countryData, selectedPollutants, onAnimationEndCallback, animate = false) {
    pollutantEvolutionChartContainer.html('');
    currentlySelectedPoint = null;
    evolutionClickInfoContainer.html('Select from Top 3 pollutants.');
    if (!countryData.pollutantEvolution || Object.keys(countryData.pollutantEvolution).length === 0) { pollutantEvolutionChartContainer.html("<p class='placeholder-text'>Pollutant evolution data is not available.</p>"); if(onAnimationEndCallback) onAnimationEndCallback(); return; }
    if (!selectedPollutants || selectedPollutants.length === 0) { pollutantEvolutionChartContainer.html(`<p class='placeholder-text'>Select at least one of the Top 3 pollutants.</p>`); lastCheckedPollutants = []; if(onAnimationEndCallback) onAnimationEndCallback(); return; }
    dataForEvolutionChart = selectedPollutants.map(pollutant => { const evolutionData = countryData.pollutantEvolution[pollutant] || {}; return { pollutant: pollutant, values: Object.entries(evolutionData).map(([year, value]) => ({ year: parseInt(year), value: (typeof value === 'number' && isFinite(value)) ? value : null })).filter(d => d.value !== null && !isNaN(d.year)).sort((a, b) => a.year - b.year) }; }).filter(d => d.values.length > 1);
    if (dataForEvolutionChart.length === 0) { pollutantEvolutionChartContainer.html("<p class='placeholder-text'>No valid data points for the selected pollutant(s).</p>"); if(onAnimationEndCallback) onAnimationEndCallback(); return; }
    const allYears = [...new Set(dataForEvolutionChart.flatMap(d => d.values.map(v => v.year)))].sort((a, b) => a - b);
    const allValues = dataForEvolutionChart.flatMap(d => d.values.map(v => v.value));
    const allGuidelines = dataForEvolutionChart.map(d => pollutantInfo[d.pollutant]?.guidelineValue).filter(g => g !== undefined);
    const containerNodeEvol = pollutantEvolutionChartContainer.node(); if (!containerNodeEvol) return;
    const parentWidth = containerNodeEvol.getBoundingClientRect().width;
    const height = 300;
    const marginEvol = { top: 25, right: 30, bottom: 60, left: 60 };
    const innerWidthEvol = Math.max(10, parentWidth - marginEvol.left - marginEvol.right);
    const innerHeightEvol = Math.max(10, height - marginEvol.top - marginEvol.bottom);
    const svgEvol = pollutantEvolutionChartContainer.append("svg") .attr("id", "pollutant-evolution-svg") .attr("viewBox", `0 0 ${parentWidth} ${height}`).attr("preserveAspectRatio", "xMidYMid meet").style("width", "100%").style("height", "auto").append("g").attr("transform", `translate(${marginEvol.left},${marginEvol.top})`);
    const xEvol = d3.scaleLinear().domain(d3.extent(allYears)).range([0, innerWidthEvol]); const yMaxData = d3.max(allValues) || 0; const yMaxGuideline = d3.max(allGuidelines) || 0; const yMaxCombined = Math.max(yMaxData, yMaxGuideline); const yDomain = [0, (yMaxCombined > 0 ? yMaxCombined * 1.15 : 10)]; const yEvol = d3.scaleLinear().domain(yDomain).range([innerHeightEvol, 0]).nice();
    const colorEvol = d3.scaleOrdinal(d3.schemeCategory10).domain(selectedPollutants);
    const xAxisEvol = d3.axisBottom(xEvol).ticks(Math.min(allYears.length, Math.max(2, Math.floor(innerWidthEvol / 70)))).tickFormat(d3.format("d")).tickSizeOuter(0).tickPadding(10); const yAxisEvol = d3.axisLeft(yEvol).ticks(Math.max(3, Math.floor(innerHeightEvol / 40))).tickSizeOuter(0).tickPadding(10).tickSizeInner(-innerWidthEvol);
    svgEvol.append("g").attr("class", "x-axis axis evolution-axis").attr("transform", `translate(0,${innerHeightEvol})`).call(xAxisEvol);
    svgEvol.append("g").attr("class", "y-axis axis evolution-axis").call(yAxisEvol).select(".domain").remove();
    svgEvol.selectAll(".y-axis.evolution-axis .tick line").attr("stroke", "var(--grid-line-color)").attr("stroke-dasharray", "var(--grid-line-style-dense)").style("opacity", 0.6);
    svgEvol.append("text").attr("class", "axis-label x-axis-label").attr("x", innerWidthEvol / 2).attr("y", innerHeightEvol + marginEvol.bottom - 15).attr("text-anchor", "middle").text("Year");
    svgEvol.append("text").attr("class", "axis-label y-axis-label").attr("transform", "rotate(-90)").attr("x", -innerHeightEvol / 2).attr("y", -marginEvol.left + 15).attr("text-anchor", "middle").text("Concentration (µg/m³)");
    const guidelineGroup = svgEvol.append("g").attr("class", "evolution-guidelines");
    const labelData = [];
    dataForEvolutionChart.forEach((pollutantData, index) => { const pollName = pollutantData.pollutant; const guidelineValue = pollutantInfo[pollName]?.guidelineValue; if (guidelineValue !== undefined && guidelineValue > 0) { const guidelineY = yEvol(guidelineValue); if (guidelineY >= 0 && guidelineY <= innerHeightEvol) { guidelineGroup.append("line").attr("class", `evolution-guideline-line guideline-${pollName}`).attr("x1", 0).attr("x2", innerWidthEvol).attr("y1", guidelineY).attr("y2", guidelineY).attr("stroke", colorEvol(pollName)).attr("stroke-width", 1).attr("stroke-dasharray", "4, 4").style("opacity", 0.6); labelData.push({ y: guidelineY, text: `WHO ${pollName}: ${guidelineValue}`, color: colorEvol(pollName), name: pollName }); } } });
    labelData.sort((a, b) => a.y - b.y); let lastLabelY = -Infinity; const minLabelSeparation = 12;
    labelData.forEach(labelInfo => { let labelYDraw = labelInfo.y; if (labelYDraw - lastLabelY < minLabelSeparation) { labelYDraw = lastLabelY + minLabelSeparation; } lastLabelY = labelYDraw; labelYDraw = Math.max(5, Math.min(innerHeightEvol - 5, labelYDraw)); guidelineGroup.append("text").attr("class", `evolution-guideline-label guideline-label-${labelInfo.name}`).attr("x", innerWidthEvol - 5).attr("y", labelYDraw).attr("dy", "0.32em").attr("text-anchor", "end").attr("fill", labelInfo.color).text(labelInfo.text).style("opacity", 0).transition("labelFadeInEvo").duration(500).delay(animate && !evolutionChartAnimated ? 500 : 100).style("opacity", 0.85); });
    const line = d3.line().defined(d_point => d_point.value !== null).x(d_point => xEvol(d_point.year)).y(d_point => yEvol(d_point.value)).curve(d3.curveMonotoneX);
    const paths = svgEvol.selectAll(".pollutant-line").data(dataForEvolutionChart, d_path => d_path.pollutant).enter().append("path").attr("class", d_path => `pollutant-line pollutant-${d_path.pollutant}`).attr("fill", "none").attr("stroke", d_path => colorEvol(d_path.pollutant)).attr("stroke-width", "var(--line-stroke-width)").attr("stroke-linejoin", "round").attr("stroke-linecap", "round").attr("d", d_path => line(d_path.values)).style("opacity", 1);
    if (animate && !evolutionChartAnimated) { paths.attr("stroke-dasharray", function() { const len = this.getTotalLength(); return len + " " + len; }).attr("stroke-dashoffset", function() { return this.getTotalLength(); }); } else { paths.attr("stroke-dashoffset", 0).attr("stroke-dasharray", "none"); if (!animate) evolutionChartAnimated = true; }
    const pointsGroup = svgEvol.selectAll(".points-group").data(dataForEvolutionChart, d_group => d_group.pollutant).enter().append("g").attr("class", d_group => `points-group points-${d_group.pollutant}`).attr("fill", d_group => colorEvol(d_group.pollutant));
    pointsGroup.selectAll(".evolution-point").data(d_group => d_group.values.filter(v => v.value !== null).map(v_point => ({...v_point, pollutant: d_group.pollutant }))).enter().append("circle").attr("class", "evolution-point").attr("cx", d_point => xEvol(d_point.year)).attr("cy", d_point => yEvol(d_point.value)).attr("r", (animate && !evolutionChartAnimated) ? 0 : "var(--point-radius)").style("opacity", (animate && !evolutionChartAnimated) ? 0 : 0.8).style("cursor", "pointer")
        .on("mouseover", function(event, d_point) { // Usa il tooltip globale
            if (this !== currentlySelectedPoint) d3.select(this).transition("pointHoverEvo").duration(100).attr("r", "var(--point-hover-radius)").style("opacity", 1);
            handleMouseOver(event, d_point); // Passa i dati del punto a handleMouseOver
        })
        .on("mouseout", function(event, d_point) {
            if (this !== currentlySelectedPoint) d3.select(this).transition("pointHoverEvoOut").duration(100).attr("r", "var(--point-radius)").style("opacity", 0.8);
            handleMouseOut(event, d_point); // Chiama handleMouseOut
        })
        .on("click", function(event, d_point) { if (currentlySelectedPoint) d3.select(currentlySelectedPoint).classed("selected", false).transition("pointClickEvo").duration(100).attr("r", "var(--point-radius)").style("stroke", "var(--point-stroke-color)"); currentlySelectedPoint = this; d3.select(this).classed("selected", true).transition("pointClickEvoSelected").duration(100).attr("r", "var(--point-click-radius)").style("stroke", "var(--point-click-stroke)"); evolutionClickInfoContainer.html(`<strong>${d_point.pollutant}</strong> <span class="year">(${d_point.year})</span>: <span class="value">${d_point.value.toFixed(1)} µg/m³</span>`); event.stopPropagation(); });
    svgEvol.on("click", function() { if (currentlySelectedPoint) { d3.select(currentlySelectedPoint).classed("selected", false).transition("pointClickEvoClear").duration(100).attr("r", "var(--point-radius)").style("stroke", "var(--point-stroke-color)"); currentlySelectedPoint = null; evolutionClickInfoContainer.html('Select from Top 3 pollutants.'); } });
    svgEvol.selectAll(".legend-container").remove();
    if(onAnimationEndCallback) onAnimationEndCallback();
}

function animateEvolutionChartLines() {
    if (evolutionChartAnimated) { return; }
    const chartSvg = pollutantEvolutionChartContainer.select("svg");
    if (chartSvg.empty()) { return; }
    const paths = chartSvg.selectAll(".pollutant-line:not(.hidden)");
    const points = chartSvg.selectAll(".evolution-point:not(.hidden)");
    points.filter(function() { return !d3.select(this).classed('selected'); }).attr("r", 0).style("opacity", 0).transition("pointsAppearFirstEvolution").duration(600).delay((d, i, nodes) => { const parentData = d3.select(nodes[i].parentNode).datum(); if (!parentData || !dataForEvolutionChart) return i * 15; const pollutantIndex = dataForEvolutionChart.findIndex(p => p.pollutant === parentData.pollutant); const baseDelay = pollutantIndex >= 0 ? pollutantIndex * 100 : 0; return baseDelay + i * 15; }).attr("r", "var(--point-radius)").style("opacity", 0.8);
    paths.each(function(d, i) { const totalLength = this.getTotalLength(); if (totalLength > 0) { d3.select(this).attr("stroke-dasharray", totalLength + " " + totalLength).attr("stroke-dashoffset", totalLength).transition(`drawlineEvolution-${i}`).duration(1500).delay(300 + (i * 100)).ease(d3.easeSinInOut).attr("stroke-dashoffset", 0).on("end", function() { d3.select(this).attr("stroke-dasharray", "none"); }); } });
    evolutionChartAnimated = true;
}
function setupEvolutionChartObserver() {
    if (evolutionChartObserver) { evolutionChartObserver.disconnect(); }
    const options = { root: null, rootMargin: '0px', threshold: 0.4 };
    const callback = (entries, observer) => { entries.forEach(entry => { if (entry.isIntersecting && !evolutionChartAnimated) { animateEvolutionChartLines(); } }); };
    evolutionChartObserver = new IntersectionObserver(callback, options);
    const target = pollutantEvolutionChartContainer.node();
    if (target && target.childNodes.length > 0 && pollutantEvolutionChartContainer.select("svg").node() ) { evolutionChartObserver.observe(target); }
}

// --- Funzioni Ausiliarie Grafico EV ---
function setupEVChartDimensions() { const containerNode = evAirQualityChartContainer.node(); if (!containerNode) { return false; } evChartWidth = containerNode.getBoundingClientRect().width; evChartHeight = Math.max(420, evChartWidth * 0.70); evChartInnerWidth = Math.max(10, evChartWidth - evChartMargin.left - evChartMargin.right); evChartInnerHeight = Math.max(10, evChartHeight - evChartMargin.top - evChartMargin.bottom); return true; }
function animateLineEV(path, delay = 0, duration = 1300, transitionName = "drawlineEV") { if (!path.node()) return; const totalLength = path.node().getTotalLength(); path.attr("stroke-dasharray", totalLength + " " + totalLength).attr("stroke-dashoffset", totalLength).transition(transitionName).delay(delay).duration(duration).ease(d3.easeQuadInOut).attr("stroke-dashoffset", 0).on("end", function() { d3.select(this).attr("stroke-dasharray", null); }); }
// Assicurati che questa funzione sia nel tuo script.js

function drawEVAirQualityCorrelationChart(animate = true) {
    let selectedCountry1Value = evCountrySelect1.property("value");
    let selectedCountry2Value = evCountrySelect2.property("value");

    evAirQualityChartDiv.html(''); // Pulisce il grafico precedente
    evChartLegendContainer.html(''); // Pulisce la legenda precedente

    // Se è selezionato solo il Paese 2, spostalo al Paese 1
    if (!selectedCountry1Value && selectedCountry2Value) {
        evCountrySelect1.property("value", selectedCountry2Value);
        selectedCountry1Value = selectedCountry2Value;
        evCountrySelect2.property("value", "");
        selectedCountry2Value = "";
    }

    if (!selectedCountry1Value) {
        evAirQualityChartDiv.html('<p class="placeholder-text">Please select at least one country (Country 1).</p>');
        return;
    }

    if (!setupEVChartDimensions()) { // Assicura che le dimensioni siano calcolate
        evAirQualityChartDiv.html('<p class="placeholder-text">Error setting up chart dimensions.</p>');
        return;
    }

    const svgEV = evAirQualityChartDiv.append("svg")
        .attr("id", "ev-correlation-svg")
        .attr("viewBox", `0 0 ${evChartWidth} ${evChartHeight}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "auto");

    const chartG = svgEV.append("g")
        .attr("transform", `translate(${evChartMargin.left},${evChartMargin.top})`);

    const dataToPlot = [];
    if (selectedCountry1Value && evDummyData[selectedCountry1Value]) {
        dataToPlot.push({
            id: `c1-${selectedCountry1Value.replace(/\s+/g, '-')}`,
            country: selectedCountry1Value,
            data: evDummyData[selectedCountry1Value],
            type: 'country1'
        });
    }
    if (selectedCountry2Value && evDummyData[selectedCountry2Value] && selectedCountry1Value !== selectedCountry2Value) {
        dataToPlot.push({
            id: `c2-${selectedCountry2Value.replace(/\s+/g, '-')}`,
            country: selectedCountry2Value,
            data: evDummyData[selectedCountry2Value],
            type: 'country2'
        });
    }

    if (dataToPlot.length === 0) {
        evAirQualityChartDiv.html('<p class="placeholder-text">No data for selected country/countries.</p>');
        return;
    }

    // Definizioni delle scale
    const xEVScale = d3.scalePoint().domain(evYears).range([0, evChartInnerWidth]).padding(0.5);
    const yEV = d3.scaleLinear()
        .domain([0, d3.max(dataToPlot, d => d3.max(Object.values(d.data.ev_purchases))) * 1.15 || 10000])
        .range([evChartInnerHeight, 0]).nice();
    const yAQ = d3.scaleLinear()
        .domain([0, d3.max(dataToPlot, d => d3.max(Object.values(d.data.avg_pm25))) * 1.25 || 30])
        .range([evChartInnerHeight, 0]).nice();

    // Assi
    chartG.append("g")
        .attr("class", "x-axis axis ev-axis")
        .attr("transform", `translate(0,${evChartInnerHeight})`)
        .call(d3.axisBottom(xEVScale).tickFormat(d3.format("d")));

    chartG.append("g")
        .attr("class", "y-axis y-axis-ev axis ev-axis")
        .call(d3.axisLeft(yEV).ticks(Math.max(3, Math.floor(evChartInnerHeight / 55))).tickFormat(d3.format(".2s")))
        .append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", -evChartMargin.left + 30)
        .attr("x", -evChartInnerHeight / 2)
        .attr("dy", "0.71em")
        .style("text-anchor", "middle")
        .style("fill", "var(--text-primary)")
        .text("EV Purchases (Units)");

    chartG.append("g")
        .attr("class", "y-axis y-axis-aq axis ev-axis")
        .attr("transform", `translate(${evChartInnerWidth},0)`)
        .call(d3.axisRight(yAQ).ticks(Math.max(3, Math.floor(evChartInnerHeight / 55))))
        .append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", evChartMargin.right - 35) // Aggiustato per evitare sovrapposizioni
        .attr("x", -evChartInnerHeight / 2)
        .attr("dy", "-0.2em") // Aggiustato per posizionamento etichetta
        .style("text-anchor", "middle")
        .style("fill", "var(--text-primary)")
        .text("Avg PM2.5 (µg/m³)");

    // Griglia per l'asse Y EV (sinistra)
    chartG.append("g")
        .attr("class", "grid ev-grid")
        .call(d3.axisLeft(yEV)
            .tickSize(-evChartInnerWidth)
            .tickFormat("")
        );
    chartG.selectAll(".grid.ev-grid .tick line").style("stroke", "var(--grid-line-color)").style("opacity", "0.6");
    chartG.selectAll(".grid.ev-grid .domain").remove();


    // Generatori di linea
    const lineEVGen = d3.line()
        .x(d => xEVScale(d.year))
        .y(d => yEV(d.value))
        .defined(d => d.value != null)
        .curve(d3.curveCatmullRom.alpha(0.4)); // Curva più morbida

    const lineAQGen = d3.line()
        .x(d => xEVScale(d.year))
        .y(d => yAQ(d.value))
        .defined(d => d.value != null)
        .curve(d3.curveCatmullRom.alpha(0.4)); // Curva più morbida


    // Disegna linee e punti per ogni paese
    dataToPlot.forEach((countryDataItem, countryIndex) => {
        const countryName = countryDataItem.country;
        const countryId = countryDataItem.id; // es. c1-Italy, c2-Germany
        const color = countryDataItem.data.color;

        // Dati e linea per EV Purchases
        const evPointsData = evYears.map(year => ({
            id: `${countryId}-ev-${year}`,
            countryId: countryId,
            year: year,
            value: countryDataItem.data.ev_purchases[year],
            series: 'ev',
            color: color,
            countryName: countryName,
            unit: 'units'
        })).filter(d => d.value != null);

        const avgEVPurchases = d3.mean(evPointsData, d => d.value);

        if (evPointsData.length > 0) {
            const evLinePath = chartG.append("path")
                .datum(evPointsData)
                .attr("class", `line-data line-ev line-${countryId}`)
                .attr("id", `line-ev-${countryId}`)
                .attr("fill", "none")
                .attr("stroke", color)
                .attr("stroke-width", 3) // Spessore linea EV
                .attr("d", lineEVGen);

            if (animate) animateLineEV(evLinePath, countryIndex * 200, 1300, `drawlineEVPath-${countryId}`);

            chartG.selectAll(`.dot-ev-${countryId}`) // Selettore più specifico
                .data(evPointsData)
                .enter().append("circle")
                .attr("class", `chart-dot dot-ev dot-${countryId} dot-ev-${countryId}`)
                .attr("id", d => d.id)
                .attr("cx", d => xEVScale(d.year))
                .attr("cy", d => yEV(d.value))
                .attr("fill", color)
                .attr("r", animate ? 0 : 5)
                .on("mouseover", (event, d) => handleEVMouseOver(event, d, chartG))
                .on("mouseout", (event, d) => handleEVMouseOut(event, d, chartG));

            if(animate) {
                chartG.selectAll(`.dot-ev-${countryId}`)
                    .transition(`dotsEVAppearPath-${countryId}`)
                    .duration(600)
                    .delay((d,i) => countryIndex * 200 + i * 60 + 600) // Ritardo dopo l'animazione della linea
                    .attr("r", 5);
            }
             // Linea di riferimento media EV
            if (avgEVPurchases !== undefined && yEV(avgEVPurchases) >=0 && yEV(avgEVPurchases) <= evChartInnerHeight) {
                chartG.append("line")
                    .attr("class", `reference-line ev-ref-line line-${countryId}`)
                    .attr("x1", 0).attr("x2", evChartInnerWidth)
                    .attr("y1", yEV(avgEVPurchases)).attr("y2", yEV(avgEVPurchases))
                    .attr("stroke", color).attr("stroke-dasharray", "2,2") // Tratteggio più fine per la media
                    .attr("stroke-width", 1.5).style("opacity", 0)
                    .transition(`avgLineEVAppearPath-${countryId}`).delay(animate ? (countryIndex * 200 + 1000) : 0).duration(500).style("opacity", 0.6);
                chartG.append("text")
                    .attr("class", `reference-line-label ev-ref-label line-${countryId}`)
                    .attr("x", evChartInnerWidth - 5).attr("y", yEV(avgEVPurchases) - 5)
                    .attr("text-anchor", "end").attr("fill", color)
                    .text(`Avg EV: ${d3.format(".2s")(avgEVPurchases)}`)
                    .style("opacity", 0).style("font-size", "10px")
                    .transition(`avgLabelEVAppearPath-${countryId}`).delay(animate ? (countryIndex * 200 + 1000) : 0).duration(500).style("opacity", 0.7);
            }
        }

        // Dati e linea per Avg PM2.5
        const aqPointsData = evYears.map(year => ({
            id: `${countryId}-aq-${year}`,
            countryId: countryId,
            year: year,
            value: countryDataItem.data.avg_pm25[year],
            series: 'aq',
            color: color,
            countryName: countryName,
            unit: 'µg/m³'
        })).filter(d => d.value != null);

        const avgPM25 = d3.mean(aqPointsData, d => d.value);

        if (aqPointsData.length > 0) {
            const aqLinePath = chartG.append("path")
                .datum(aqPointsData)
                .attr("class", `line-data line-air-quality line-${countryId}`)
                .attr("id", `line-aq-${countryId}`)
                .attr("fill", "none")
                .attr("stroke", color)
                // ----- INIZIO MODIFICA PER TRATTEGGIO SPESSO PM2.5 -----
                .attr("stroke-width", 3.5)       // Linea più spessa
                .attr("stroke-dasharray", "10, 6") // Trattini da 10px, spazi da 6px
                // ----- FINE MODIFICA -----
                .attr("d", lineAQGen);

            if (animate) animateLineEV(aqLinePath, countryIndex * 200 + 150, 1300, `drawlineAQPath-${countryId}`);

            chartG.selectAll(`.dot-aq-${countryId}`) // Selettore più specifico
                .data(aqPointsData)
                .enter().append("circle")
                .attr("class", `chart-dot dot-aq dot-${countryId} dot-aq-${countryId}`)
                .attr("id", d => d.id)
                .attr("cx", d => xEVScale(d.year))
                .attr("cy", d => yAQ(d.value))
                .attr("fill", color)
                .style("opacity", 0.9) // Leggermente meno opaco dei punti EV per distinguerli
                .attr("r", animate ? 0 : 5)
                .on("mouseover", (event, d) => handleEVMouseOver(event, d, chartG))
                .on("mouseout", (event, d) => handleEVMouseOut(event, d, chartG));
            
            if(animate) {
                 chartG.selectAll(`.dot-aq-${countryId}`)
                    .transition(`dotsAQAppearPath-${countryId}`)
                    .duration(600)
                    .delay((d,i) => countryIndex * 200 + i * 60 + 750) // Ritardo dopo l'animazione della linea
                    .attr("r", 5);
            }
            // Linea di riferimento media PM2.5
            if (avgPM25 !== undefined && yAQ(avgPM25) >=0 && yAQ(avgPM25) <= evChartInnerHeight) {
                chartG.append("line")
                    .attr("class", `reference-line aq-ref-line line-${countryId}`)
                    .attr("x1", 0).attr("x2", evChartInnerWidth)
                    .attr("y1", yAQ(avgPM25)).attr("y2", yAQ(avgPM25))
                    .attr("stroke", color)
                     // ----- MODIFICA PER TRATTEGGIO SPESSO ANCHE PER LA LINEA MEDIA PM2.5 -----
                    .attr("stroke-dasharray", "10, 6") // Stesso tratteggio spesso della linea principale PM2.5
                    .attr("stroke-width", 1.5) // Manteniamo la linea media un po' più sottile della principale
                    .style("opacity", 0)
                    .transition(`avgLineAQAppearPath-${countryId}`).delay(animate ? (countryIndex * 200 + 1200) : 0).duration(500).style("opacity", 0.6);
                chartG.append("text")
                    .attr("class", `reference-line-label aq-ref-label line-${countryId}`)
                    .attr("x", evChartInnerWidth - 5).attr("y", yAQ(avgPM25) + 12) // Posizionata sotto la linea media
                    .attr("text-anchor", "end").attr("fill", color)
                    .text(`Avg PM2.5: ${avgPM25.toFixed(1)}µg/m³`)
                    .style("opacity", 0).style("font-size", "10px")
                    .transition(`avgLabelAQAppearPath-${countryId}`).delay(animate ? (countryIndex * 200 + 1200) : 0).duration(500).style("opacity", 0.7);
            }
        }

        // Aggiunta alla legenda
        const legendEV = evChartLegendContainer.append("div").attr("class", "legend-item");
        legendEV.append("div").attr("class", "legend-color-box line-preview") // Preview linea continua
            .style("background-color", color);
        legendEV.append("span").text(`${countryName} - EV Purchases`);

        const legendAQ = evChartLegendContainer.append("div").attr("class", "legend-item");
        legendAQ.append("div").attr("class", "legend-color-box line-preview") // Preview linea tratteggiata
            .style("height", "3px") // Altezza per simulare la linea
            .style("border-top", `3.5px dashed ${color}`) // Simula il tratteggio spesso
            .style("background-color", "transparent");
        legendAQ.append("span").text(`${countryName} - Avg PM2.5`);
    });
}
function handleEVMouseOver(event, d, chartG_ev) {
    evChartTooltip.style("opacity", 1); // Usa lo stile diretto per transizioni più semplici o classi CSS
    const formattedValue = typeof d.value === 'number' ? d.value.toLocaleString(undefined, {maximumFractionDigits: (d.unit === "µg/m³" ? 1 : 0)}) : 'N/A';
    evChartTooltip.html(`<strong>${d.countryName}</strong> <span class="year-info">Year: ${d.year}</span> <span class="series-name" style="color:${d.color};">${d.series === 'ev' ? 'EV Purchases' : 'Avg PM2.5'}:</span> <span class="value">${formattedValue} ${d.unit}</span>`)
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - evChartTooltip.node().getBoundingClientRect().height - 10) + "px");
    chartG_ev.selectAll(`.line-data`).classed('series-dimmed', true);
    chartG_ev.selectAll(`.chart-dot`).classed('dot-series-dimmed', true);
    chartG_ev.selectAll(`.line-${d.countryId}`).classed('series-hovered', true).classed('series-dimmed', false).raise();
    chartG_ev.selectAll(`.dot-${d.countryId}`).classed('dot-series-hovered', true).classed('dot-series-dimmed', false).raise();
    d3.select(event.currentTarget).raise();
    const correspondingSeries = d.series === 'ev' ? 'aq' : 'ev';
    const correspondingDotId = `${d.countryId}-${correspondingSeries}-${d.year}`;
    chartG_ev.select(`#${correspondingDotId}`).classed('dot-corresponding-highlight', true).classed('dot-series-dimmed', false).raise();
}
function handleEVMouseOut(event, d, chartG_ev) {
    evChartTooltip.style("opacity", 0);
    chartG_ev.selectAll(".series-hovered").classed('series-hovered', false);
    chartG_ev.selectAll(".dot-series-hovered").classed('dot-series-hovered', false);
    chartG_ev.selectAll(".series-dimmed").classed('series-dimmed', false);
    chartG_ev.selectAll(".dot-series-dimmed").classed('dot-series-dimmed', false);
    chartG_ev.selectAll(".dot-corresponding-highlight").classed('dot-corresponding-highlight', false);
}
function populateEVCountryDropdowns(selectElement, allCountries, disabledCountry = null) {
    const currentValue = selectElement.property("value");
    selectElement.selectAll("option").remove();
    let placeholderText = selectElement.attr("id") === "ev-country-select-1" ? "-- Select Country 1 --" : "-- Select Country 2 (Optional) --";
    selectElement.append("option").attr("value", "").text(placeholderText);
    allCountries.forEach(country => { const option = selectElement.append("option").attr("value", country).text(country); if (country === disabledCountry && disabledCountry !== "") { option.property("disabled", true); } });
    if (currentValue && currentValue !== disabledCountry && allCountries.includes(currentValue)) { selectElement.property("value", currentValue); } else { selectElement.property("value", ""); }
}
function initializeEVCorrelationSection() {
    populateEVCountryDropdowns(evCountrySelect1, evAvailableCountries, null);
    populateEVCountryDropdowns(evCountrySelect2, evAvailableCountries, evCountrySelect1.property("value"));
    if (evAvailableCountries.length > 0) { const defaultC1 = evAvailableCountries.includes("Italy") ? "Italy" : evAvailableCountries[0]; evCountrySelect1.property("value", defaultC1); populateEVCountryDropdowns(evCountrySelect2, evAvailableCountries, defaultC1); const defaultC2Candidates = evAvailableCountries.filter(c => c !== defaultC1); if (defaultC2Candidates.length > 0) { const defaultC2 = defaultC2Candidates.includes("Germany") ? "Germany" : defaultC2Candidates[0]; evCountrySelect2.property("value", defaultC2); } }
    drawEVAirQualityCorrelationChart(true);
    evCountrySelect1.on("change", function() { const selectedC1 = d3.select(this).property("value"); populateEVCountryDropdowns(evCountrySelect2, evAvailableCountries, selectedC1 || null); if (selectedC1 && evCountrySelect2.property("value") === selectedC1) { evCountrySelect2.property("value", ""); } drawEVAirQualityCorrelationChart(true); });
    evCountrySelect2.on("change", function() { drawEVAirQualityCorrelationChart(true); });
}


// --- Inizializzazione Dashboard ---
function initializeDashboard() {
    console.log("Initializing dashboard (V27 - Tooltip Fix)...");
    pollutantSelect.selectAll("option").remove();
    pollutantSelect.selectAll("option.poll-option").data(availablePollutants).enter().append("option").attr("class", "poll-option").attr("value", d => d).text(d => pollutantInfo[d]?.name || d);
    pollutantSelect.property("value", DEFAULT_POLLUTANT);
    currentPollutant = DEFAULT_POLLUTANT;
    updatePollutantInfo(DEFAULT_POLLUTANT);
    const minYear = d3.min(years); const maxYear = d3.max(years);
    yearSlider.attr("min", minYear).attr("max", maxYear).property("value", minYear);
    yearSliderValue.text(minYear);
    currentDisplayYear = minYear;
    const initialData = historicalDummyData[currentDisplayYear]?.[currentPollutant];
    if (initialData) { updateChart(currentPollutant, initialData, currentDisplayYear, true); } else { console.warn("No initial overview data found!"); updateChart(currentPollutant, [], currentDisplayYear, true); }
    startTimelapse(DEFAULT_POLLUTANT);
    initializeCountryView();
    countrySelect.property("value", DEFAULT_COUNTRY);
    cityPollutantSelect.property("value", DEFAULT_POLLUTANT);
    cityComparisonPollutantSpan.text(DEFAULT_POLLUTANT);
    setTimeout(() => { loadCountryData(DEFAULT_COUNTRY); }, 300);
    initializeEVCorrelationSection();
    pollutantSelect.on("change", function() { showLoader(); stopTimelapse(); const selectedPollutant = d3.select(this).property("value"); currentPollutant = selectedPollutant; updatePollutantInfo(selectedPollutant); currentDisplayYear = parseInt(yearSlider.property("value")); currentYearIndex = years.indexOf(currentDisplayYear); const dataForYear = historicalDummyData[currentDisplayYear]?.[currentPollutant]; if (dataForYear) { updateChart(currentPollutant, dataForYear, currentDisplayYear, false); } else { console.warn(`No data for ${currentPollutant} in ${currentDisplayYear}`); updateChart(currentPollutant, [], currentDisplayYear, false); } hideLoader(); const selectedCountry = countrySelect.property("value"); cityPollutantSelect.property("value", selectedPollutant); if (selectedCountry && countrySpecificDummyData[selectedCountry] && !countryVisualizationContent.classed("hidden")) { updateCityLollipopChart(selectedCountry, countrySpecificDummyData[selectedCountry], selectedPollutant, null); } else { cityComparisonPollutantSpan.text(selectedPollutant || 'N/A'); } });
    playPauseButton.on("click", togglePlayPause);
    yearSlider.on("input", function() { stopTimelapse(); const selectedYear = parseInt(d3.select(this).property("value")); if (selectedYear !== currentDisplayYear) { currentDisplayYear = selectedYear; currentYearIndex = years.indexOf(currentDisplayYear); const dataForYear = historicalDummyData[currentDisplayYear]?.[currentPollutant]; if (dataForYear) { updateChart(currentPollutant, dataForYear, currentDisplayYear, false); } else { console.warn(`No data for ${currentPollutant} in ${currentDisplayYear}`); updateChart(currentPollutant, [], currentDisplayYear, false); } } });
    countrySelect.on("change", function() { const selectedCountry = d3.select(this).property("value"); if (selectedCountry) { loadCountryData(selectedCountry); } });
    cityPollutantSelect.on("change", function() { const selectedCityPollutant = d3.select(this).property("value"); const selectedCountry = countrySelect.property("value"); if (selectedCountry && countrySpecificDummyData[selectedCountry] && selectedCityPollutant) { updateCityLollipopChart(selectedCountry, countrySpecificDummyData[selectedCountry], selectedCityPollutant, null); } });
    window.addEventListener('resize', debounce(() => {
        console.log("Resize detected, updating visualizations...");
        const overviewPollutant = pollutantSelect.property("value");
        if (overviewPollutant && currentDisplayYear) { const dataForYear = historicalDummyData[currentDisplayYear]?.[overviewPollutant]; if(dataForYear) { updateChart(overviewPollutant, dataForYear, currentDisplayYear); } }
        const selectedCountryForCountryView = countrySelect.property("value");
        if (selectedCountryForCountryView && countrySpecificDummyData[selectedCountryForCountryView] && !countryVisualizationContent.classed("hidden")) {
            const countryData = countrySpecificDummyData[selectedCountryForCountryView];
            const selectedCityPollutant = cityPollutantSelect.property("value");
            const pollutantsForEvoResize = lastCheckedPollutants.length > 0 ? lastCheckedPollutants : getSelectedEvolutionPollutants();
            evolutionChartAnimated = false;
            updatePollutantDistributionChart(selectedCountryForCountryView, countryData, null);
            updatePollutantEvolutionChart(selectedCountryForCountryView, countryData, pollutantsForEvoResize, null, false);
            updateCityLollipopChart(selectedCountryForCountryView, countryData, selectedCityPollutant, null);
            if(mapInstance) { requestAnimationFrame(() => { if(mapInstance) { mapInstance.invalidateSize({ animate: false }); } }); }
            setupEvolutionChartObserver();
        }
        const selectedEVCountry1 = evCountrySelect1.property("value");
        const selectedEVCountry2 = evCountrySelect2.property("value");
        if (selectedEVCountry1 || selectedEVCountry2) { drawEVAirQualityCorrelationChart(false); } // Non animare al resize
    }, 250));
    console.log("Dashboard V27 initialized (Tooltip Fix).");
}

// --- Run Initialization ---
document.addEventListener("DOMContentLoaded", () => {
    if (typeof L === 'undefined') { console.error("Leaflet library not loaded before DOMContentLoaded!"); if (countryMapContainer.node()) countryMapContainer.html('<p class="placeholder-text error-text">Map library (Leaflet) could not be loaded.</p>'); }
    initializeDashboard();
});

console.log("Air quality dashboard script V27 (Tooltip Fix) loaded.");