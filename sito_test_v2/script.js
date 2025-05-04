// script.js - 

// --- Selettori DOM (Generali) ---
const pollutantSelect = d3.select("#pollutant-select");
const flashcard = d3.select("#pollutant-info");
const tooltip = d3.select(".tooltip");

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
const evolutionCheckboxContainer = d3.select("#pollutant-checkbox-container"); // V26 Checkbox container
const evolutionClickInfoContainer = d3.select("#evolution-click-info");
const selectedCountryNameMap = d3.select("#selected-country-name-map");
const selectedCountryNameStats = d3.select("#selected-country-name-stats");
const dominantPollutantDisplay = d3.select("#dominant-pollutant");
const cityComparisonChartContainer = d3.select("#city-comparison-chart");
const cityComparisonPollutantSpan = d3.select("#city-comparison-pollutant");
const cityPollutantSelect = d3.select("#city-pollutant-select");

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
let lastCheckedPollutants = []; // 


// --- Costanti e Setup Grafico Overview ---
let initialChartWidth = 600;
try { initialChartWidth = parseInt(d3.select("#bar-chart-container").style("width")) || 600; } catch (e) { console.warn("Could not parse overview chart container width.") }
let initialChartHeight = initialChartWidth > 0 ? initialChartWidth * 0.65 : 450;
const margin = { top: 40, right: 50, bottom: 75, left: 120 };
let currentChartWidth = initialChartWidth; let currentChartHeight = initialChartHeight;
function getInnerDimensions(currentWidth, currentHeight) { return { innerWidth: Math.max(10, currentWidth - margin.left - margin.right), innerHeight: Math.max(10, currentHeight - margin.top - margin.bottom) }; }
let { innerWidth, innerHeight } = getInnerDimensions(currentChartWidth, currentChartHeight);

// --- Setup D3 SVG (Overview - Definito una sola volta) ---
chartContainer.html('');
const svg = chartContainer.append("svg").attr("viewBox", `0 0 ${currentChartWidth} ${currentChartHeight}`).attr("preserveAspectRatio", "xMidYMid meet").style("width", "100%").style("height", "auto").style("display", "block");
const x = d3.scaleLinear().range([0, innerWidth]);
const y = d3.scaleBand().range([0, innerHeight]).padding(0.25);
const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
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

// --- Funzioni Ausiliarie ---
function debounce(func, wait, immediate) { let timeout; return function executedFunction() { const context = this; const args = arguments; const later = function() { timeout = null; if (!immediate) func.apply(context, args); }; const callNow = immediate && !timeout; clearTimeout(timeout); timeout = setTimeout(later, wait); if (callNow) func.apply(context, args); }; }
function showLoader() { chartLoader.style("display", "flex").style("opacity", 1); }
function hideLoader() { chartLoader.transition("loaderFade").duration(200).style("opacity", 0).end().then(() => chartLoader.style("display", "none")).catch(() => chartLoader.style("display", "none")); }
function calculateZScores(data) { const values = Object.values(data).filter(v => typeof v === 'number' && isFinite(v)); if (values.length < 2) return Object.keys(data).reduce((acc, key) => { acc[key] = 0; return acc; }, {}); const mean = d3.mean(values); const stdDev = d3.deviation(values); if (stdDev === 0 || stdDev === undefined || !isFinite(stdDev)) return Object.keys(data).reduce((acc, key) => { acc[key] = (typeof data[key] === 'number' && isFinite(data[key])) ? 0 : NaN; return acc; }, {}); const zScores = {}; for (const key in data) { if (typeof data[key] === 'number' && isFinite(data[key])) zScores[key] = (data[key] - mean) / stdDev; else zScores[key] = NaN; } return zScores; }

// --- Funzioni Aggiornamento UI  ---
function updateChart(pollutantKey, data, year, updateSlider = true) {
    try { currentChartWidth = parseInt(d3.select("#bar-chart-container").style("width")) || currentChartWidth; } catch(e){}
    currentChartHeight = currentChartWidth * 0.65; svg.attr("viewBox", `0 0 ${currentChartWidth} ${currentChartHeight}`); const dims = getInnerDimensions(currentChartWidth, currentChartHeight); innerWidth = dims.innerWidth; innerHeight = dims.innerHeight; x.range([0, innerWidth]); y.range([0, innerHeight]); g.attr("transform", `translate(${margin.left},${margin.top})`); const validData = Array.isArray(data) ? data : []; const sortedData = validData.sort((a, b) => b.Concentrazione - a.Concentrazione); const top5Data = sortedData.slice(0, 5); const guidelineValue = pollutantInfo[pollutantKey]?.guidelineValue; const maxConcentration = d3.max(top5Data, d => d.Concentrazione) || 0; const upperXDomain = guidelineValue !== undefined ? Math.max(maxConcentration, guidelineValue) : maxConcentration; x.domain([0, upperXDomain * 1.05 || 10]).nice();
    y.domain(top5Data.map(d => d.Paese));
    const allPossibleCountries = [...new Set(baseData2024[pollutantKey]?.map(d => d.Paese) || [])];
    colorScale.domain(allPossibleCountries);

    const t = svg.transition().duration(750).ease(d3.easeCubicOut); const t_fast = svg.transition().duration(300).ease(d3.easeLinear); const enterDelay = 100; const bars = g.selectAll(".bar").data(top5Data, d => d.Paese); bars.exit().transition(t).attr("width", 0).style("opacity", 0).remove(); bars.enter().append("rect").attr("class", "bar").attr("x", 0).attr("y", d => y(d.Paese) ?? 0).attr("width", 0).attr("height", y.bandwidth()).style("opacity", 0).style("fill", d => colorScale(d.Paese))
    .attr("aria-label", d => `${d.Paese}: ${d.Concentrazione.toFixed(2)} µg/m³`).on("mouseover", handleMouseOver).on("mouseout", handleMouseOut).merge(bars).transition(t).delay((d, i, nodes) => d3.select(nodes[i]).attr('width') === '0' ? i * enterDelay : 0).attr("y", d => y(d.Paese) ?? 0).attr("width", d => Math.max(0, x(d.Concentrazione))).attr("height", y.bandwidth()).style("opacity", 1).style("fill", d => colorScale(d.Paese));
    const yAxisGenerator = d3.axisLeft(y).tickSize(0).tickPadding(10); const yAxis = g.selectAll(".y-axis.overview-axis").data([null]); yAxis.enter().append("g").attr("class", "y-axis overview-axis axis").attr("aria-hidden", "true").merge(yAxis).transition(t).call(yAxisGenerator).selectAll(".tick text").attr("transform", "translate(-5, 0)"); const xAxisGenerator = d3.axisBottom(x).ticks(Math.max(2, Math.floor(innerWidth / 80))).tickFormat(d => d).tickSizeInner(-(innerHeight)).tickPadding(10).tickSizeOuter(0); const xAxisYPosition = innerHeight; const xAxis = g.selectAll(".x-axis.overview-axis").data([null]); const xAxisGroup = xAxis.enter().append("g").attr("class", "x-axis overview-axis axis").attr("transform", `translate(0,${xAxisYPosition})`).attr("aria-hidden", "true").merge(xAxis); xAxisGroup.transition(t).attr("transform", `translate(0,${xAxisYPosition})`).call(xAxisGenerator); g.selectAll(".x-axis.overview-axis .tick line").attr("stroke", "var(--grid-line-color)").attr("stroke-dasharray", "var(--grid-line-style)"); g.select(".x-axis.overview-axis .domain").attr("stroke", "var(--axis-line-color)"); g.selectAll(".x-axis-label.overview-label").remove(); g.append("text").attr("class", "x-axis-label overview-label axis-label").attr("x", innerWidth / 2).attr("y", innerHeight + margin.bottom - 25).text(`Average Concentration (${pollutantKey}, µg/m³ )`); g.selectAll(".guideline-group").remove(); if (guidelineValue !== undefined && guidelineValue > 0) { const guidelineX = x(guidelineValue); if (guidelineX >= 0 && guidelineX <= innerWidth) { const guidelineGroup = g.append("g").attr("class", "guideline-group").attr("aria-label", `WHO Guideline limit: ${guidelineValue} µg/m³`); guidelineGroup.append("line").attr("x1", guidelineX).attr("x2", guidelineX).attr("y1", 0).attr("y2", innerHeight).style("opacity", 0).transition(t.delay(200)).style("opacity", 0.8); guidelineGroup.append("text").attr("x", guidelineX).attr("y", -8).text(`WHO Guideline (${guidelineValue})`).style("opacity", 0).transition(t.delay(200)).style("opacity", 1); } } const yearText = g.selectAll(".year-overlay-text").data([year]); yearText.enter().append("text").attr("class", "year-overlay-text").attr("x", innerWidth - 5).attr("y", 5).style("opacity", 0).merge(yearText).text(d => d).transition(t_fast).attr("x", innerWidth - 5).attr("y", 5).style("opacity", 0.65);
    currentYearDisplay.text(year); yearSliderValue.text(year); if (updateSlider) { yearSlider.property("value", year); }
}
function updatePollutantInfo(pollutantKey) { const info = pollutantInfo[pollutantKey]; flashcard.classed("updating", true); setTimeout(() => { flashcard.select("#pollutant-name").html(info ? info.name : "N/A"); flashcard.select("#acceptable-range").text(info ? `${info.acceptableRange}` : "N/A"); flashcard.select("#health-risks").text(info ? info.healthRisks : "N/A"); flashcard.select("#emission-sources").text(info ? info.emissionSources : "N/A"); setTimeout(() => { flashcard.classed("updating", false); }, 50); }, 100); }
function stopTimelapse() { if (timelapseInterval) { clearInterval(timelapseInterval); timelapseInterval = null; isPlaying = false; playPauseButton.attr("aria-label", "Play timelapse").select("i").attr("class", "fas fa-play"); } }
function runTimelapseStep() { if (!currentPollutant || !isPlaying) { stopTimelapse(); return; } currentDisplayYear = years[currentYearIndex]; const dataForYear = historicalDummyData[currentDisplayYear]?.[currentPollutant]; if (dataForYear) { updateChart(currentPollutant, dataForYear, currentDisplayYear, true); } else { console.warn(`No data for ${currentPollutant} in ${currentDisplayYear}`); updateChart(currentPollutant, [], currentDisplayYear, true); } currentYearIndex++; if (currentYearIndex >= years.length) { currentYearIndex = 0; } }
function startTimelapse(pollutantKey) { stopTimelapse(); if (pollutantKey) { currentPollutant = pollutantKey; } else if (!currentPollutant) { console.error("Cannot start timelapse."); return; } isPlaying = true; playPauseButton.attr("aria-label", "Pause timelapse").select("i").attr("class", "fas fa-pause"); runTimelapseStep(); timelapseInterval = setInterval(runTimelapseStep, timelapseSpeed); }
function togglePlayPause() { if (isPlaying) { stopTimelapse(); } else { const selectedPollutant = pollutantSelect.property("value"); if (selectedPollutant) { startTimelapse(selectedPollutant); } else { console.warn("Select pollutant first."); } } }
function handleMouseOver(event, d) { tooltip.transition("tooltipFade").duration(100).style("opacity", 1); tooltip.html(`<strong>${d.Paese || d.name}</strong><span class="value">${(d.Concentrazione || d.value || 0).toFixed(1)} µg/m³</span>`).style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px"); d3.select(this).style("filter", "brightness(0.85)"); }
function handleMouseOut(event, d) { tooltip.transition("tooltipFade").duration(200).style("opacity", 0); d3.select(this).style("filter", "brightness(1)"); }

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
     evolutionClickInfoContainer.html("Click on a point to see details. (Select from Top 3)"); // Updated message
     cityComparisonChartContainer.html('<p class="placeholder-text">Select a country and pollutant...</p>');
     cityComparisonPollutantSpan.text('N/A');
     cityPollutantSelect.selectAll("option").remove();
     cityPollutantSelect.selectAll("option.city-poll-option")
        .data(availablePollutants)
        .enter().append("option")
        .attr("class", "city-poll-option")
        .attr("value", d => d)
        .text(d => pollutantInfo[d]?.name || d);
    evolutionCheckboxContainer.html(''); // Clear checkbox placeholder
 }

async function loadCountryData(countryName) { 
    console.log("[V26 State] Loading data for:", countryName);
    selectedCountryNameMap.text(countryName); selectedCountryNameStats.text(countryName); countrySelect.property("value", countryName); evolutionClickInfoContainer.html("Click on a point to see details. (Select from Top 3)"); currentlySelectedPoint = null;

    countryMapSection.style("opacity", 0).style("transform", "translateY(15px)"); countryStatsSection.style("opacity", 0).style("transform", "translateY(15px)"); countryMapContainer.html('<p class="placeholder-text">Loading map...</p>'); pollutantDistributionChartContainer.html('<p class="placeholder-text">Loading statistics...</p>'); pollutantEvolutionChartContainer.html('<p class="placeholder-text">Loading evolution data...</p>'); dominantPollutantDisplay.text("N/A");
    cityComparisonChartContainer.html('<p class="placeholder-text">Loading city comparison...</p>');
    evolutionCheckboxContainer.html('<p class="placeholder-text" style="margin: 5px 0; font-size: 0.85em;">Loading pollutant options...</p>');

    countryVisualizationContent.classed("hidden", false);
    const countryData = countrySpecificDummyData[countryName];
    if (!countryData) { console.error(`[V26 State] No data found for country: ${countryName}`); countryMapSection.style("opacity", 1).style("transform", "translateY(0px)"); countryStatsSection.style("opacity", 1).style("transform", "translateY(0px)"); if (mapInstance) { try { mapInstance.remove(); } catch(e){} mapInstance = null; } cityComparisonChartContainer.html('<p class="placeholder-text error-text">Country data not found.</p>'); evolutionCheckboxContainer.html('<p class="placeholder-text error-text" style="margin: 5px 0; font-size: 0.85em;">No pollutants.</p>'); return; }

    evolutionChartAnimated = false;

    const initialCityPollutant = currentPollutant || DEFAULT_POLLUTANT;
    cityPollutantSelect.property("value", initialCityPollutant);
    cityComparisonPollutantSpan.text(initialCityPollutant || 'N/A');

    // ---  Initialize Evolution Checkboxes (shows ONLY top 3 with colors) ---
    initializeEvolutionCheckboxes(countryName, countryData);
    const initialEvolutionPollutants = getSelectedEvolutionPollutants(); // Get initially selected (will be the top 3)
    lastCheckedPollutants = initialEvolutionPollutants; // Store initial state

    countryMapSection.transition("sectionFadeIn").duration(500).delay(100).style("opacity", 1).style("transform", "translateY(0px)"); countryStatsSection.transition("sectionFadeIn").duration(500).delay(250).style("opacity", 1).style("transform", "translateY(0px)");

    await new Promise(resolve => setTimeout(resolve, 150));
    updateCountryMap(countryName, countryData);

    // --- CHART UPDATES  ---
    const distChartPromise = new Promise(resolve => { setTimeout(() => { updatePollutantDistributionChart(countryName, countryData, resolve); }, 300); });
    const evolChartPromise = new Promise(resolve => { setTimeout(() => { updatePollutantEvolutionChart(countryName, countryData, initialEvolutionPollutants, resolve, true); }, 400); });
    const cityCompPromise = new Promise(resolve => { setTimeout(() => { updateCityLollipopChart(countryName, countryData, initialCityPollutant, resolve); }, 280); });

    await Promise.all([distChartPromise, evolChartPromise, cityCompPromise]);
    console.log("[V26 State] Charts updated for:", countryName);

    setupEvolutionChartObserver();
}

// --- MAP UPDATE Function  ---
function updateCountryMap(countryName, countryData) {
    console.log(`[V26 State Using V23 Map] Updating map for: ${countryName} (Playful Popup)`);
    countryMapContainer.html(''); countryMapContainer.style("opacity", 1).style("background-color", "var(--container-bg)");
    const mapId = 'country-map'; const mapElement = countryMapContainer.node();
    const centerCoords = countryData.center || [50, 15]; const zoomLevel = countryData.zoom || 4;

    const createPopupContent = (city) => {
        const pm25Value = city.pollution?.['PM2.5'];
        let aqiCategory = 'N/A'; let aqiClass = 'aqi-unknown'; let aqiIcon = 'fas fa-question-circle';
        if (typeof pm25Value === 'number' && isFinite(pm25Value)) {
            if (pm25Value <= 5) { aqiCategory = 'Good'; aqiClass = 'aqi-good'; aqiIcon = 'fas fa-smile'; }
            else if (pm25Value <= 10) { aqiCategory = 'Moderate'; aqiClass = 'aqi-moderate'; aqiIcon = 'fas fa-meh'; }
            else if (pm25Value <= 15) { aqiCategory = 'Unhealthy (Sensitive)'; aqiClass = 'aqi-unhealthy-s'; aqiIcon = 'fas fa-frown'; }
            else { aqiCategory = 'Unhealthy'; aqiClass = 'aqi-unhealthy'; aqiIcon = 'fas fa-sad-tear'; }
        }
        let pollutantListHtml = '<ul class="popup-pollutant-list">';
        const pollutantsToShow = ["PM2.5", "NO2", "O3", "PM10"];
        pollutantsToShow.forEach(poll => { const value = city.pollution?.[poll]; if (typeof value === 'number' && isFinite(value)) { pollutantListHtml += `<li class="popup-pollutant-item"><span class="pollutant-name">${poll}:</span><span class="pollutant-value">${value.toFixed(1)} µg/m³</span></li>`; } });
        pollutantListHtml += '</ul>';
        let content = `<div class="popup-header ${aqiClass}"><span class="popup-aqi-icon"><i class="${aqiIcon}"></i></span><span class="popup-aqi-category">${aqiCategory}</span></div><div class="popup-body"><h4 class="popup-city-name">${city.name}</h4>${pollutantListHtml}</div>`;
        return content;
    };

    try {
         if (typeof L === 'undefined') throw new Error("Leaflet (L) is not defined!");
         if (mapInstance) { console.log("[V26 State] Removing previous map instance."); mapInstance.remove(); mapInstance = null; }
         console.log("[V26 State] Creating new map instance.");
         if (!mapElement || mapElement.offsetHeight <= 0) { console.warn("[V26 State] Map container not ready. Retrying..."); setTimeout(() => { const currentSelectedCountry = countrySelect.property("value"); if (currentSelectedCountry === countryName) { updateCountryMap(countryName, countryData); } else { console.log("[V26 State] Country selection changed. Aborting retry."); } }, 250); return; }
         mapInstance = L.map(mapId, { scrollWheelZoom: false }).setView(centerCoords, zoomLevel);
         L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 18 }).addTo(mapInstance);
         currentMarkers = []; let markersAdded = 0;
         if (countryData.cities && countryData.cities.length > 0) { countryData.cities.forEach(city => { const popupContent = createPopupContent(city); const marker = L.marker([city.lat, city.lon]).addTo(mapInstance).bindPopup(popupContent, { minWidth: 220 }); currentMarkers.push(marker); markersAdded++; }); }
         else { const marker = L.marker(centerCoords).addTo(mapInstance).bindPopup(`<strong>${countryName}</strong><br>(No specific city data)`); currentMarkers.push(marker); markersAdded++; }
         console.log(`[V26 State] Added ${markersAdded} markers (playful popup) for ${countryName}.`);
         setTimeout(() => { requestAnimationFrame(() => { if (mapInstance) { mapInstance.invalidateSize(true); } else { console.warn(`[V26 State] Map instance lost before invalidateSize.`); } }); }, 100);
    } catch (error) { console.error("[V26 State] Map update error:", error); countryMapContainer.html(`<p class="placeholder-text error-text">Error updating map: ${error.message}</p>`); if (mapInstance) { try { mapInstance.remove(); } catch (e) {} mapInstance = null; } }
}


// ---  City Comparison Lollipop Chart Function  ---
function updateCityLollipopChart(countryName, countryData, pollutantKey, onAnimationEndCallback) {
    console.log(`[V26 State Using V14 Lollipop] Updating City Lollipop Chart for ${countryName}, Pollutant: ${pollutantKey}`);
    cityComparisonChartContainer.html('');
    cityComparisonPollutantSpan.text(pollutantKey || 'N/A');

    if (!countryData || !countryData.cities || countryData.cities.length === 0) {
        cityComparisonChartContainer.html("<p class='placeholder-text'>No city data available for this country.</p>");
        if (onAnimationEndCallback) onAnimationEndCallback(); return;
    }
    const cityDataForPollutant = countryData.cities.map(city => ({ name: city.name, value: city.pollution?.[pollutantKey] })).filter(d => d.value !== undefined && d.value !== null && typeof d.value === 'number' && isFinite(d.value)).sort((a, b) => b.value - a.value);
    if (cityDataForPollutant.length === 0) {
        cityComparisonChartContainer.html(`<p class='placeholder-text'>No data available for ${pollutantKey} in cities of ${countryName}.</p>`);
        if (onAnimationEndCallback) onAnimationEndCallback(); return;
    }
    const containerNode = cityComparisonChartContainer.node(); if (!containerNode) return;
    const parentWidth = containerNode.getBoundingClientRect().width;
    const calculatedHeight = 38 * cityDataForPollutant.length + 90;
    const height = Math.max(220, calculatedHeight);
    const marginLolli = { top: 25, right: 50, bottom: 50, left: 110 };
    const innerWidthLolli = Math.max(10, parentWidth - marginLolli.left - marginLolli.right);
    const innerHeightLolli = Math.max(10, height - marginLolli.top - marginLolli.bottom);
    const svgLolli = cityComparisonChartContainer.append("svg").attr("viewBox", `0 0 ${parentWidth} ${height}`).attr("preserveAspectRatio", "xMidYMid meet").style("width", "100%").style("height", "auto").append("g").attr("transform", `translate(${marginLolli.left},${marginLolli.top})`);
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
    if (guidelineValue !== undefined && guidelineValue > 0) { const guidelineX = xLolli(guidelineValue); if (guidelineX >= 0 && guidelineX <= innerWidthLolli) { svgLolli.append("line").attr("class", "guideline-line lollipop-guideline").attr("x1", guidelineX).attr("x2", guidelineX).attr("y1", 0).attr("y2", innerHeightLolli).style("opacity", 0); svgLolli.append("text").attr("class", "guideline-label lollipop-guideline-label").attr("x", guidelineX).attr("y", -8).attr("text-anchor", "middle").text(`WHO (${guidelineValue})`).style("opacity", 0); svgLolli.selectAll(".lollipop-guideline, .lollipop-guideline-label").transition("guidelineFade").duration(600).delay(700).style("opacity", 0.8); } }
    const lolliGroup = svgLolli.selectAll(".lollipop-group").data(cityDataForPollutant, d => d.name).enter().append("g").attr("class", "lollipop-group").attr("transform", d => `translate(0, ${yLolli(d.name) + yLolli.bandwidth() / 2})`);
    lolliGroup.append("line").attr("class", "lollipop-line").attr("x1", xLolli(0)).attr("x2", xLolli(0)).attr("y1", 0).attr("y2", 0);
    lolliGroup.append("circle").attr("class", "lollipop-dot").attr("cx", xLolli(0)).attr("cy", 0).attr("r", 0);
    lolliGroup.style("cursor", "pointer").on("mouseover", function(event, d) { d3.select(this).select(".lollipop-dot").transition("dotHover").duration(150).attr("r", 'var(--lollipop-dot-hover-radius)'); d3.select(this).select(".lollipop-line").transition("lineHover").duration(150).attr("stroke", 'var(--lollipop-line-hover-color)').attr("stroke-width", 2); tooltip.transition("tooltipFade").duration(100).style("opacity", 1); tooltip.html(`<strong>${d.name}</strong><span class="value">${d.value.toFixed(1)} µg/m³</span>`).style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 15) + "px"); }).on("mouseout", function(event, d) { d3.select(this).select(".lollipop-dot").transition("dotHover").duration(200).attr("r", 'var(--lollipop-dot-radius)'); d3.select(this).select(".lollipop-line").transition("lineHover").duration(200).attr("stroke", 'var(--lollipop-line-color)').attr("stroke-width", 1.5); tooltip.transition("tooltipFade").duration(200).style("opacity", 0); });
    const animDuration = 700; const animDelay = (d, i) => i * 50; const animEase = d3.easeCubicOut;
    lolliGroup.select(".lollipop-line").transition("lineAnim").duration(animDuration).delay(animDelay).ease(animEase).attr("x2", d => xLolli(d.value));
    lolliGroup.select(".lollipop-dot").transition("dotAnim").duration(animDuration).delay((d, i) => animDelay(d, i) + 150).ease(animEase).attr("cx", d => xLolli(d.value)).attr("r", 'var(--lollipop-dot-radius)');
    if (onAnimationEndCallback) { const totalTransitions = cityDataForPollutant.length; if (totalTransitions === 0) { onAnimationEndCallback(); } else { setTimeout(onAnimationEndCallback, animDuration + totalTransitions * 50 + 200); } }
}


// --- Z-SCORE CHART UPDATE Function  ---
function updatePollutantDistributionChart(countryName, countryData, onAnimationEndCallback) {
     pollutantDistributionChartContainer.html(''); const latestYearData = countryData.pollutantEvolution ? Math.max(...Object.values(countryData.pollutantEvolution).flatMap(pollData => Object.keys(pollData).map(Number).filter(isFinite))) : null; let latestPollution = {}; let hasData = false; if (latestYearData !== null && isFinite(latestYearData) && countryData.pollutantEvolution) { for (const poll in countryData.pollutantEvolution) { const pollDataForYear = countryData.pollutantEvolution[poll]?.[latestYearData]; if (pollDataForYear !== undefined && pollDataForYear !== null && typeof pollDataForYear === 'number' && isFinite(pollDataForYear)) { latestPollution[poll] = pollDataForYear; hasData = true; } } } else if (countryData.cities && countryData.cities.length > 0) { const cityPollutionSum = {}; const cityPollutionCount = {}; countryData.cities.forEach(city => { for (const poll in city.pollution) { if (typeof city.pollution[poll] === 'number' && isFinite(city.pollution[poll])) { cityPollutionSum[poll] = (cityPollutionSum[poll] || 0) + city.pollution[poll]; cityPollutionCount[poll] = (cityPollutionCount[poll] || 0) + 1; hasData = true; } } }); for (const poll in cityPollutionSum) { if (cityPollutionCount[poll] > 0) latestPollution[poll] = cityPollutionSum[poll] / cityPollutionCount[poll]; } } if (!hasData) { pollutantDistributionChartContainer.html("<p class='placeholder-text'>No recent data available for distribution chart.</p>"); dominantPollutantDisplay.text("N/A"); if(onAnimationEndCallback) onAnimationEndCallback(); return; } const zScores = calculateZScores(latestPollution); const dataForChart = Object.entries(zScores).filter(([_, z]) => typeof z === 'number' && isFinite(z)).map(([p, z]) => ({ pollutant: p, zScore: z })).sort((a,b) => b.zScore - a.zScore); if (dataForChart.length === 0) { pollutantDistributionChartContainer.html("<p class='placeholder-text'>Could not calculate Z-scores.</p>"); dominantPollutantDisplay.text("N/A"); if(onAnimationEndCallback) onAnimationEndCallback(); return; } const dominant = dataForChart[0]; dominantPollutantDisplay.text(dominant ? `${dominant.pollutant} (${dominant.zScore.toFixed(2)})` : "N/A"); const containerNodeDist = pollutantDistributionChartContainer.node(); if (!containerNodeDist) return; const parentWidth = containerNodeDist.getBoundingClientRect().width; const height = 280; const marginDist = { top: 20, right: 30, bottom: 60, left: 90 }; const innerWidthDist = Math.max(10, parentWidth - marginDist.left - marginDist.right); const innerHeightDist = Math.max(10, height - marginDist.top - marginDist.bottom); const svgDist = pollutantDistributionChartContainer.append("svg").attr("viewBox", `0 0 ${parentWidth} ${height}`).attr("preserveAspectRatio", "xMidYMid meet").style("width", "100%").style("height", "auto").append("g").attr("transform", `translate(${marginDist.left},${marginDist.top})`); const [minZ, maxZ] = d3.extent(dataForChart, d => d.zScore); const xPadding = Math.max(Math.abs(minZ), Math.abs(maxZ)) * 0.1 + 0.1; const xDomain = [Math.min(0, minZ) - xPadding, Math.max(0, maxZ) + xPadding]; const xDist = d3.scaleLinear().domain(xDomain).range([0, innerWidthDist]).nice(5); const yDist = d3.scaleBand().domain(dataForChart.map(d => d.pollutant)).range([0, innerHeightDist]).padding(0.3); const xAxis = d3.axisBottom(xDist).ticks(Math.max(3, Math.floor(innerWidthDist / 70))).tickSizeOuter(0).tickPadding(10).tickSizeInner(-innerHeightDist); const yAxis = d3.axisLeft(yDist).tickSize(0).tickPadding(12); svgDist.append("g").attr("class", "x-axis axis").attr("transform", `translate(0,${innerHeightDist})`).call(xAxis); svgDist.selectAll(".x-axis .tick line").attr("stroke", "var(--grid-line-color)").attr("stroke-dasharray", "var(--grid-line-style)").style("opacity", 0.5); svgDist.append("g").attr("class", "y-axis axis").call(yAxis).select(".domain").remove(); svgDist.selectAll(".y-axis .tick text").style("font-weight", "500").style("fill", "var(--text-primary)"); svgDist.append("text").attr("class", "axis-label x-axis-label").attr("x", innerWidthDist / 2).attr("y", innerHeightDist + marginDist.bottom - 15).attr("text-anchor", "middle").text("Z-Score (Normalized Value)"); if (xDist(0) >= 0 && xDist(0) <= innerWidthDist) { svgDist.append("line").attr("class", "zero-line").attr("x1", xDist(0)).attr("x2", xDist(0)).attr("y1", 0).attr("y2", innerHeightDist).attr("stroke", "var(--zero-line-color)").attr("stroke-width", 1.5); } const bars = svgDist.selectAll(".dist-bar").data(dataForChart).enter().append("rect").attr("class", "dist-bar").attr("y", d => yDist(d.pollutant)).attr("height", yDist.bandwidth()).attr("x", d => d.zScore >= 0 ? xDist(0) : xDist(d.zScore)).attr("width", 0).attr("fill", d => d.zScore >= 0 ? "var(--dist-bar-positive)" : "var(--dist-bar-negative)").attr("rx", "var(--dist-bar-radius)").attr("ry", "var(--dist-bar-radius)").on("mouseover", function(event, d) { d3.select(this).style("filter", "brightness(0.8)"); tooltip.transition().duration(100).style("opacity", 1); tooltip.html(`<strong>${d.pollutant}</strong><span class="value">${d.zScore.toFixed(2)} Z</span>`).style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 15) + "px"); }).on("mouseout", function() { d3.select(this).style("filter", "brightness(1)"); tooltip.transition().duration(200).style("opacity", 0); }); const barsTransition = bars.transition("distBars").duration(750).delay((d,i) => i * 80).attr("width", d => Math.max(0, Math.abs(xDist(d.zScore) - xDist(0)))); if (onAnimationEndCallback) { const totalTransitions = dataForChart.length; if (totalTransitions === 0) { onAnimationEndCallback(); } else { setTimeout(() => {Promise.all(barsTransition.end()).then(onAnimationEndCallback).catch(onAnimationEndCallback)}, 750 + totalTransitions * 80 + 300); } }
}

// ---  Function to initialize/update evolution checkboxes (SHOWS TOP 3 ONLY) ---
function initializeEvolutionCheckboxes(countryName, countryData) {
    evolutionCheckboxContainer.html('');
    if (!countryData || !countryData.pollutantEvolution || Object.keys(countryData.pollutantEvolution).length === 0) {
        evolutionCheckboxContainer.html('<p class="placeholder-text error-text" style="margin: 5px 0; font-size: 0.85em;">No evolution data available.</p>');
        lastCheckedPollutants = []; return;
    }

    // Calculate average values for pollutants with enough data
    const avgPollutantValues = Object.entries(countryData.pollutantEvolution)
        .map(([poll, data]) => {
            const numericValues = Object.values(data).filter(v => typeof v === 'number' && isFinite(v));
            return { pollutant: poll, avgValue: numericValues.length > 1 ? d3.mean(numericValues) : -Infinity };
        })
        .filter(d => d.avgValue > -Infinity) // Filter out those with insufficient data
        .sort((a, b) => b.avgValue - a.avgValue);

    //  Determine the Top 3 pollutants to display
    const top3Pollutants = avgPollutantValues.slice(0, 3).map(d => d.pollutant);

    if (top3Pollutants.length === 0) {
        evolutionCheckboxContainer.html('<p class="placeholder-text error-text" style="margin: 5px 0; font-size: 0.85em;">Not enough data for top pollutants.</p>');
        lastCheckedPollutants = []; return;
    }

    console.log("[V26 State] Displaying checkboxes for Top 3:", top3Pollutants);

    // Define color scale based ONLY on the top 3 for consistency
    const colorForLabels = d3.scaleOrdinal(d3.schemeCategory10).domain(top3Pollutants);

    //  Bind data ONLY to the top 3 pollutants
    const checkboxItems = evolutionCheckboxContainer.selectAll(".checkbox-item")
        .data(top3Pollutants) // Bind to top 3 only
        .enter()
        .append("label")
        .attr("class", "checkbox-item");

    checkboxItems.append("input")
        .attr("type", "checkbox")
        .attr("name", "pollutant-evolution")
        .attr("value", d => d)
        .property("checked", true) // Check all top 3 initially
        .on("change", handleEvolutionCheckboxChange);

    checkboxItems.append("span")
        .attr("class", "checkbox-label-text")
        .style("color", d => colorForLabels(d)) // Apply color
        .style("font-weight", "500")
        .text(d => d);

    // Initial call to ensure minimum selection rule is applied
    enforceMinimumPollutantSelection(); // Use the simplified function
}

// --- : Function to get currently selected pollutants from checkboxes ---
function getSelectedEvolutionPollutants() {
    const selected = [];
    evolutionCheckboxContainer.selectAll('input[type="checkbox"]:checked')
        .each(function(d) { selected.push(this.value); });
    return selected;
}

// ---Event handler for checkbox changes (No Max limit check needed) ---
function handleEvolutionCheckboxChange(event) {
    // 1. Enforce MIN limit only
    enforceMinimumPollutantSelection(); // Simplified enforcement

    // 2. Update chart
    const selectedCountry = countrySelect.property("value");
    const countryData = countrySpecificDummyData[selectedCountry];
    const selectedPollutants = getSelectedEvolutionPollutants();
    lastCheckedPollutants = selectedPollutants; // Store the new valid selection

    if (selectedCountry && countryData && selectedPollutants.length > 0) {
        updatePollutantEvolutionChart(selectedCountry, countryData, selectedPollutants, null, false);
        setupEvolutionChartObserver();
    } else if (selectedPollutants.length === 0) {
         // This state should be prevented by enforceMinimumPollutantSelection
         pollutantEvolutionChartContainer.html('<p class="placeholder-text">Please select at least one pollutant.</p>');
         evolutionClickInfoContainer.html('Select from Top 3 pollutants.');
         currentlySelectedPoint = null;
    }
}

//- Function to enforce MINIMUM (1) selection limit ---
function enforceMinimumPollutantSelection() {
    const checkboxes = evolutionCheckboxContainer.selectAll('input[type="checkbox"]');
    const checkedCheckboxes = evolutionCheckboxContainer.selectAll('input[type="checkbox"]:checked');
    const checkedCount = checkedCheckboxes.size();

    checkboxes.property("disabled", false); // Enable all first

    if (checkedCount <= 1) {
        // Disable the single *checked* checkbox
        checkedCheckboxes.property("disabled", true);
    }
    // No need to handle max limit, as only top 3 are shown
}


// --- EVOLUTION CHART UPDATE Function  ---
function updatePollutantEvolutionChart(countryName, countryData, selectedPollutants, onAnimationEndCallback, animate = false) {
    
    console.log("[V26 State] Updating Evolution Chart. Selected:", selectedPollutants);
    pollutantEvolutionChartContainer.html(''); currentlySelectedPoint = null; evolutionClickInfoContainer.html('Select from Top 3 pollutants.');

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
    const svgEvol = pollutantEvolutionChartContainer.append("svg").attr("viewBox", `0 0 ${parentWidth} ${height}`).attr("preserveAspectRatio", "xMidYMid meet").style("width", "100%").style("height", "auto").append("g").attr("transform", `translate(${marginEvol.left},${marginEvol.top})`);
    const xEvol = d3.scaleLinear().domain(d3.extent(allYears)).range([0, innerWidthEvol]); const yMaxData = d3.max(allValues) || 0; const yMaxGuideline = d3.max(allGuidelines) || 0; const yMaxCombined = Math.max(yMaxData, yMaxGuideline); const yDomain = [0, (yMaxCombined > 0 ? yMaxCombined * 1.15 : 10)]; const yEvol = d3.scaleLinear().domain(yDomain).range([innerHeightEvol, 0]).nice();

    // Define color scale based on the currently selected pollutants for chart elements
    const colorEvol = d3.scaleOrdinal(d3.schemeCategory10).domain(selectedPollutants);

    const xAxisEvol = d3.axisBottom(xEvol).ticks(Math.min(allYears.length, Math.max(2, Math.floor(innerWidthEvol / 70)))).tickFormat(d3.format("d")).tickSizeOuter(0).tickPadding(10); const yAxisEvol = d3.axisLeft(yEvol).ticks(Math.max(3, Math.floor(innerHeightEvol / 40))).tickSizeOuter(0).tickPadding(10).tickSizeInner(-innerWidthEvol);
    svgEvol.append("g").attr("class", "x-axis axis").attr("transform", `translate(0,${innerHeightEvol})`).call(xAxisEvol); svgEvol.append("g").attr("class", "y-axis axis").call(yAxisEvol).select(".domain").remove(); svgEvol.selectAll(".y-axis .tick line").attr("stroke", "var(--grid-line-color)").attr("stroke-dasharray", "var(--grid-line-style-dense)").style("opacity", 0.6); svgEvol.append("text").attr("class", "axis-label x-axis-label").attr("x", innerWidthEvol / 2).attr("y", innerHeightEvol + marginEvol.bottom - 15).attr("text-anchor", "middle").text("Year"); svgEvol.append("text").attr("class", "axis-label y-axis-label").attr("transform", "rotate(-90)").attr("x", -innerHeightEvol / 2).attr("y", -marginEvol.left + 15).attr("text-anchor", "middle").text("Concentration (µg/m³)");

    // --- WHO Guideline Lines & LABELS  ---
    const guidelineGroup = svgEvol.append("g").attr("class", "evolution-guidelines");
    const labelData = [];
    dataForEvolutionChart.forEach((pollutantData, index) => { const pollName = pollutantData.pollutant; const guidelineValue = pollutantInfo[pollName]?.guidelineValue; if (guidelineValue !== undefined && guidelineValue > 0) { const guidelineY = yEvol(guidelineValue); if (guidelineY >= 0 && guidelineY <= innerHeightEvol) { guidelineGroup.append("line").attr("class", `evolution-guideline-line guideline-${pollName}`).attr("x1", 0).attr("x2", innerWidthEvol).attr("y1", guidelineY).attr("y2", guidelineY).attr("stroke", colorEvol(pollName)).attr("stroke-width", 1).attr("stroke-dasharray", "4, 4").style("opacity", 0.6); labelData.push({ y: guidelineY, text: `WHO ${pollName}: ${guidelineValue}`, color: colorEvol(pollName), name: pollName }); } } });
    labelData.sort((a, b) => a.y - b.y); let lastLabelY = -Infinity; const minLabelSeparation = 12;
    labelData.forEach(labelInfo => { let labelY = labelInfo.y; if (labelY - lastLabelY < minLabelSeparation) { labelY = lastLabelY + minLabelSeparation; } lastLabelY = labelY; labelY = Math.max(5, Math.min(innerHeightEvol - 5, labelY)); guidelineGroup.append("text").attr("class", `evolution-guideline-label guideline-label-${labelInfo.name}`).attr("x", innerWidthEvol - 5).attr("y", labelY).attr("dy", "0.32em").attr("text-anchor", "end").attr("fill", labelInfo.color).text(labelInfo.text).style("opacity", 0).transition("labelFadeIn").duration(500).delay(animate ? 500 : 100).style("opacity", 0.85); });
    // --- End Guideline Labels ---

    const line = d3.line().defined(d => d.value !== null).x(d => xEvol(d.year)).y(d => yEvol(d.value)).curve(d3.curveMonotoneX); const paths = svgEvol.selectAll(".pollutant-line").data(dataForEvolutionChart, d => d.pollutant).enter().append("path").attr("class", d => `pollutant-line pollutant-${d.pollutant}`).attr("fill", "none").attr("stroke", d => colorEvol(d.pollutant)).attr("stroke-width", "var(--line-stroke-width)").attr("stroke-linejoin", "round").attr("stroke-linecap", "round").attr("d", d => line(d.values)).style("opacity", 1); if (animate) { paths.attr("stroke-dasharray", function() { const len = this.getTotalLength(); return len + " " + len; }).attr("stroke-dashoffset", function() { return this.getTotalLength(); }); evolutionChartAnimated = false; } else { paths.attr("stroke-dashoffset", 0).attr("stroke-dasharray", "none"); evolutionChartAnimated = true; }
    const pointsGroup = svgEvol.selectAll(".points-group").data(dataForEvolutionChart, d => d.pollutant).enter().append("g").attr("class", d => `points-group points-${d.pollutant}`).attr("fill", d => colorEvol(d.pollutant)); pointsGroup.selectAll(".evolution-point").data(d => d.values.filter(v => v.value !== null)).enter().append("circle").attr("class", "evolution-point").attr("cx", d => xEvol(d.year)).attr("cy", d => yEvol(d.value)).attr("r", animate ? 0 : "var(--point-radius)").style("opacity", animate ? 0 : 0.8).style("cursor", "pointer").on("mouseover", function(event, d) { if (this !== currentlySelectedPoint) d3.select(this).transition("pointHover").duration(100).attr("r", "var(--point-hover-radius)").style("opacity", 1); tooltip.transition().duration(100).style("opacity", 1); const parentData = d3.select(this.parentNode).datum(); tooltip.html(`<strong>${parentData.pollutant}</strong><span class="year">(${d.year})</span><br><span class="value">${d.value.toFixed(1)} µg/m³</span>`).style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 15) + "px"); }).on("mouseout", function() { if (this !== currentlySelectedPoint) d3.select(this).transition("pointHover").duration(100).attr("r", "var(--point-radius)").style("opacity", 0.8); tooltip.transition().duration(200).style("opacity", 0); }).on("click", function(event, d) { if (currentlySelectedPoint) d3.select(currentlySelectedPoint).classed("selected", false).transition("pointClick").duration(100).attr("r", "var(--point-radius)").style("stroke", "var(--point-stroke-color)"); currentlySelectedPoint = this; d3.select(this).classed("selected", true).transition("pointClick").duration(100).attr("r", "var(--point-click-radius)").style("stroke", "var(--point-click-stroke)"); const parentData = d3.select(this.parentNode).datum(); evolutionClickInfoContainer.html(`<strong>${parentData.pollutant}</strong> <span class="year">(${d.year})</span>: <span class="value">${d.value.toFixed(1)} µg/m³</span>`); event.stopPropagation(); }); svgEvol.on("click", function() { if (currentlySelectedPoint) { d3.select(currentlySelectedPoint).classed("selected", false).transition("pointClick").duration(100).attr("r", "var(--point-radius)").style("stroke", "var(--point-stroke-color)"); currentlySelectedPoint = null; evolutionClickInfoContainer.html('Select from Top 3 pollutants.'); } });

    svgEvol.selectAll(".legend-container").remove();

    if(onAnimationEndCallback) onAnimationEndCallback();
}


// --- EVOLUTION ANIMATION Function  ---
function animateEvolutionChartLines() {
    if (evolutionChartAnimated) return; console.log("[V26 State] Animating evolution chart lines (Points First)..."); const paths = pollutantEvolutionChartContainer.selectAll(".pollutant-line:not(.hidden)"); const points = pollutantEvolutionChartContainer.selectAll(".evolution-point:not(.hidden)"); points.filter(function() { return !d3.select(this).classed('selected'); }).attr("r", 0).style("opacity", 0).transition("pointsAppearFirst").duration(600).delay((d, i, nodes) => { const parentData = d3.select(nodes[i].parentNode).datum(); const pollutantIndex = dataForEvolutionChart.findIndex(p => p.pollutant === parentData.pollutant); const baseDelay = pollutantIndex >= 0 ? pollutantIndex * 100 : 0; return baseDelay + i * 15; }).attr("r", "var(--point-radius)").style("opacity", 0.8); paths.each(function(d, i) { const totalLength = this.getTotalLength(); if (totalLength > 0) { d3.select(this).attr("stroke-dasharray", totalLength + " " + totalLength).attr("stroke-dashoffset", totalLength).transition(`drawline-${i}`).duration(1500).delay(300 + (i * 100)).ease(d3.easeSinInOut).attr("stroke-dashoffset", 0).on("end", () => { d3.select(this).attr("stroke-dasharray", "none"); }); } }); evolutionChartAnimated = true;
}

function setupEvolutionChartObserver() {
    if (evolutionChartObserver) { evolutionChartObserver.disconnect(); } const options = { root: null, rootMargin: '0px', threshold: 0.4 }; const callback = (entries, observer) => { entries.forEach(entry => { if (entry.isIntersecting && !evolutionChartAnimated) { console.log("[V26 State] Evolution chart intersecting, triggering animation..."); animateEvolutionChartLines(); } }); }; evolutionChartObserver = new IntersectionObserver(callback, options); const target = pollutantEvolutionChartContainer.node(); if (target) { evolutionChartObserver.observe(target); console.log("[V26 State] Intersection Observer set up for evolution chart."); } else { console.warn("[V26 State] Evolution chart container not found for Intersection Observer."); }
}


// --- Inizializzazione Dashboard ---
function initializeDashboard() {
    console.log("Initializing dashboard V26 State (Show Only Top 3 Checkboxes)...");

    // Setup Overview
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

    // Setup Country View
    initializeCountryView();
    countrySelect.property("value", DEFAULT_COUNTRY);
    cityPollutantSelect.property("value", DEFAULT_POLLUTANT);
    cityComparisonPollutantSpan.text(DEFAULT_POLLUTANT);

    setTimeout(() => { loadCountryData(DEFAULT_COUNTRY); }, 300);

    // --- Event Listeners ---
    pollutantSelect.on("change", function() { showLoader(); stopTimelapse(); const selectedPollutant = d3.select(this).property("value"); currentPollutant = selectedPollutant; updatePollutantInfo(selectedPollutant); currentDisplayYear = parseInt(yearSlider.property("value")); currentYearIndex = years.indexOf(currentDisplayYear); const dataForYear = historicalDummyData[currentDisplayYear]?.[currentPollutant]; if (dataForYear) { updateChart(currentPollutant, dataForYear, currentDisplayYear, false); } else { console.warn(`No data for ${currentPollutant} in ${currentDisplayYear}`); updateChart(currentPollutant, [], currentDisplayYear, false); } hideLoader(); const selectedCountry = countrySelect.property("value"); cityPollutantSelect.property("value", selectedPollutant); if (selectedCountry && countrySpecificDummyData[selectedCountry] && !countryVisualizationContent.classed("hidden")) { updateCityLollipopChart(selectedCountry, countrySpecificDummyData[selectedCountry], selectedPollutant, null); } else { cityComparisonPollutantSpan.text(selectedPollutant || 'N/A'); } });
    playPauseButton.on("click", togglePlayPause);
    yearSlider.on("input", function() { stopTimelapse(); const selectedYear = parseInt(d3.select(this).property("value")); if (selectedYear !== currentDisplayYear) { currentDisplayYear = selectedYear; currentYearIndex = years.indexOf(currentDisplayYear); const dataForYear = historicalDummyData[currentDisplayYear]?.[currentPollutant]; if (dataForYear) { updateChart(currentPollutant, dataForYear, currentDisplayYear, false); } else { console.warn(`No data for ${currentPollutant} in ${currentDisplayYear}`); updateChart(currentPollutant, [], currentDisplayYear, false); } } });
    countrySelect.on("change", function() { const selectedCountry = d3.select(this).property("value"); if (selectedCountry) { loadCountryData(selectedCountry); } });
    cityPollutantSelect.on("change", function() { const selectedCityPollutant = d3.select(this).property("value"); const selectedCountry = countrySelect.property("value"); console.log(`[V26] City pollutant changed to: ${selectedCityPollutant} for country: ${selectedCountry}`); if (selectedCountry && countrySpecificDummyData[selectedCountry] && selectedCityPollutant) { updateCityLollipopChart(selectedCountry, countrySpecificDummyData[selectedCountry], selectedCityPollutant, null); } });
 
    window.addEventListener('resize', debounce(() => {
        console.log("[V26 State] Resize detected, updating visualizations...");
        const overviewPollutant = pollutantSelect.property("value");
        if (overviewPollutant && currentDisplayYear) { const dataForYear = historicalDummyData[currentDisplayYear]?.[overviewPollutant]; if(dataForYear) { updateChart(overviewPollutant, dataForYear, currentDisplayYear); } }
        const selectedCountry = countrySelect.property("value");
        if (selectedCountry && countrySpecificDummyData[selectedCountry] && !countryVisualizationContent.classed("hidden")) {
            const countryData = countrySpecificDummyData[selectedCountry];
            const selectedCityPollutant = cityPollutantSelect.property("value");
            
            const pollutantsForEvoResize = lastCheckedPollutants.length > 0 ? lastCheckedPollutants : getSelectedEvolutionPollutants();

            updatePollutantDistributionChart(selectedCountry, countryData, null);
            updatePollutantEvolutionChart(selectedCountry, countryData, pollutantsForEvoResize, null, false);
            updateCityLollipopChart(selectedCountry, countryData, selectedCityPollutant, null);
            if(mapInstance) { requestAnimationFrame(() => { if(mapInstance) { mapInstance.invalidateSize({ animate: false }); console.log("[V26 State] Map size invalidated on resize."); } }); }
            setupEvolutionChartObserver();
        }
    }, 250));

    console.log("Dashboard V26 State initialized.");
}

// --- Run Initialization ---
document.addEventListener("DOMContentLoaded", () => {
    if (typeof L === 'undefined') { console.error("Leaflet library not loaded before DOMContentLoaded!"); if (countryMapContainer.node()) countryMapContainer.html('<p class="placeholder-text error-text">Map library (Leaflet) could not be loaded.</p>'); }
    initializeDashboard();
});

console.log("Air quality dashboard script V26 State loaded.");