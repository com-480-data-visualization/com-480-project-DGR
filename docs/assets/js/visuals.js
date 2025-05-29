import { pollutantInfo, availablePollutants } from './pollutantInfo.js';

import {
    flashcard,
    tooltip,
    themeToggleButton,
    currentYearFooterSpan,
    heatmapContainerEurope,
    heatmapTimeframeSelect,
    heatmapLegendContainer,
    heatmapRadiusSlider,
    heatmapRadiusValue,
    heatmapBlurSlider,
    heatmapBlurValue,
    mapTooltip,
    chartContainer,
    chartLoader,
    playPauseButton,
    currentYearDisplay,
    yearSlider,
    yearSliderValue,
    countryViewSection,
    countrySelect,
    countryVisualizationContent,
    countryMapSection,
    countryStatsSection,
    countryMapContainer,
    pollutantDistributionChartContainer,
    pollutantEvolutionChartContainer,
    evolutionCheckboxContainer,
    evolutionClickInfoContainer,
    selectedCountryNameMap,
    selectedCountryNameStats,
    dominantPollutantDisplay,
    cityComparisonChartContainer,
    cityComparisonPollutantSpan,
    cityPollutantSelect,
    evCountrySelect1,
    evCountrySelect2,
    evAirQualityChartContainer,
    evAirQualityChartDiv,
    evChartLegendContainer,
    pollutantSelect
} from './selectors.js';
  
import { 
    loadAndTransformData, 
    loadCountrySpecificData, 
    loadAQIData,
    loadEVData
} from './loadData.js';

import { availableCountries } from './countries.js';

// Globale Variables
let mapInstance = null;
let currentMarkers = [];
let evolutionChartObserver = null;
let evolutionChartAnimated = false;
let currentlySelectedPoint = null;
let dataForEvolutionChart = [];
let lastCheckedPollutants = [];

// Global Constants
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const DEFAULT_COUNTRY = "Italy";
const DEFAULT_POLLUTANT = "PM2.5";

// Heatmap Global Variables
let europeHeatmap = null;
let heatLayer = null;
let currentAqiDataPoints = [];

// Heatmap Constants
const AQI_CATEGORIES_HEATMAP = [
    { level: "Good", min: 0, max: 50, color: "rgba(0, 228, 0, 0.7)", gradientPoint: 0.1 },
    { level: "Moderate", min: 51, max: 100, color: "rgba(255, 255, 0, 0.7)", gradientPoint: 0.25 },
    { level: "Unhealthy SG", min: 101, max: 150, color: "rgba(255, 126, 0, 0.7)", gradientPoint: 0.4 },
    { level: "Unhealthy", min: 151, max: 200, color: "rgba(255, 0, 0, 0.7)", gradientPoint: 0.6 },
    { level: "Very Unhealthy", min: 201, max: 300, color: "rgba(143, 63, 151, 0.8)", gradientPoint: 0.8 },
    { level: "Hazardous", min: 301, max: 500, color: "rgba(126, 0, 35, 0.8)", gradientPoint: 1.0 }
];
const MAX_AQI_FOR_HEATMAP = 350;
const PM25_THRESHOLDS_FOR_POPUP = [
    { level: "Good", min: 0, max: 10, popupClass: 'aqi-good', icon: 'fas fa-seedling' }, // WHO Guideline 2021
    { level: "Moderate", min: 10.1, max: 25, popupClass: 'aqi-moderate', icon: 'fas fa-leaf' }, // WHO IT-1
    { level: "Unhealthy SG", min: 25.1, max: 50, popupClass: 'aqi-unhealthy-s', icon: 'fas fa-tree' }, // WHO IT-2
    { level: "Unhealthy", min: 50.1, max: 75, popupClass: 'aqi-unhealthy', icon: 'fas fa-smog' }, // Extended threshold
    { level: "Very Unhealthy", min: 75.1, max: 100, popupClass: 'aqi-very-unhealthy', icon: 'fas fa-cloud-sun' }, // Extended threshold
    { level: "Hazardous", min: 100.1, max: Infinity, popupClass: 'aqi-hazardous', icon: 'fas fa-industry' } // Extended threshold
    // Note: These are indicative thresholds, not strict official AQI boundaries for all regions.
];


// Graphical Variables and Settings
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
const colorScale = d3.scaleOrdinal(d3.schemeTableau10);

const years = Array.from({ length: 2024 - 2013 + 1 }, (_, i) => 2013 + i);

// Global State
let timelapseInterval = null; 
let currentYearIndex = 0; 
const timelapseSpeed = 1500; 
let currentPollutant = null; 
let currentDisplayYear = years[0]; 
let isPlaying = false;

const evAvailableCountries = availableCountries
const evYears = years

// Global Variables for EV chart
let evChartWidth, evChartHeight, evChartInnerWidth, evChartInnerHeight;
const evChartMargin = { top: 50, right: 100, bottom: 70, left: 90 };

function debounce(func, wait, immediate) { 
    let timeout; 
    return function executedFunction() { 
        const context = this; 
        const args = arguments; 
        const later = function() { 
            timeout = null; 
            if (!immediate) func.apply(context, args); 
        }; const callNow = immediate && !timeout; 
        clearTimeout(timeout); 
        timeout = setTimeout(later, wait); 
        if (callNow) func.apply(context, args);
    }; 
}

function calculateZScores(data) { 
    const values = Object.values(data).filter(v => typeof v === 'number' && isFinite(v));
    if (values.length < 2) 
        return Object.keys(data).reduce((acc, key) => { acc[key] = 0; return acc; }, {}); 
    const mean = d3.mean(values); 
    const stdDev = d3.deviation(values); 
    if (stdDev === 0 || stdDev === undefined || !isFinite(stdDev)) 
        return Object.keys(data).reduce(
            (acc, key) => { acc[key] = (typeof data[key] === 'number' && isFinite(data[key])) ? 0 : NaN; return acc; }, {}
        ); 
    const zScores = {}; 
    for (const key in data) { 
        if (typeof data[key] === 'number' && isFinite(data[key])) 
            zScores[key] = (data[key] - mean) / stdDev; 
        else zScores[key] = NaN;
    } 
    return zScores; 
}

function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    lat1 = lat1 * Math.PI / 180;
    lat2 = lat2 * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    themeToggleButton.select("i").attr("class", theme === "dark" ? "fas fa-sun" : "fas fa-moon");
    localStorage.setItem("dashboardTheme", theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.dataset.theme || "light";
    const newTheme = currentTheme === "light" ? "dark" : "light";
    applyTheme('light');
}

function loadThemePreference() {
    let preferredTheme = localStorage.getItem("dashboardTheme");
    preferredTheme = 'light'
    if (preferredTheme) {
        applyTheme(preferredTheme);
    } else {
        applyTheme(document.documentElement.dataset.theme || 'light');
    }
}

function positionTooltip(event, tooltipSelection) {
    if (tooltipSelection.empty()) return;
    const tooltipNode = tooltipSelection.node();
    if (!tooltipNode) return;

    console.log("Tooltip node:", tooltipNode);

    const rect = tooltipNode.getBoundingClientRect();
    const tooltipWidth = rect.width;
    const tooltipHeight = rect.height;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate desired position
    let left = event.pageX + 12;
    let top = event.pageY - tooltipHeight - 12; // Position above the cursor

    // Adjust if it goes off the right edge
    if (left + tooltipWidth > viewportWidth - 20) { // 20px margin from right edge
        left = event.pageX - tooltipWidth - 12; // Position to the left of the cursor
    }

    if (top < 10) {
        top = event.pageY + 18;
    }

    tooltipSelection.style("left", left + "px").style("top", top + "px");
}

function handleMouseOver(event, d) {

    let countryName = d.Paese || d.name || d.pollutant || "N/A";
    let value, unit, isZScore = false, yearInfo = d.year || null;

    if (d.hasOwnProperty('Concentrazione')) {
        value = d.Concentrazione;
        unit = 'µg/m³';
    } else if (d.hasOwnProperty('value') && d.hasOwnProperty('year')) {
        value = d.value;
        unit = 'µg/m³';
    } else if (d.hasOwnProperty('zScore')) {
        value = d.zScore;
        unit = 'Z';
        isZScore = true;
    } else if (d.hasOwnProperty('value')) {
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

    tooltip.transition("tooltipFade").duration(100).style("opacity", 1).style("transform", "translateY(0px)");
    positionTooltip(event, tooltip);
    d3.select(this).style("filter", "brightness(0.85)");
}

function handleMouseOut(event, d) {
    tooltip.transition("tooltipFadeOut").duration(150).style("opacity", 0).style("transform", "translateY(5px)");
    d3.select(this).style("filter", "brightness(1)");
}


function updateChart(pollutantKey, data, year, updateSlider = true) {
    try { 
        currentChartWidth = parseInt(d3.select("#bar-chart-container").style("width")) || currentChartWidth; 
    } catch(e){}
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
    const allPossibleCountries = availableCountries;
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
        .on("mouseover", handleMouseOver)
        .on("mouseout", handleMouseOut)
        .on("click", function(event, d) {
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

    overviewG.selectAll(".bar-hover-label").remove();

    const yAxisGenerator = d3.axisLeft(y).tickSize(0).tickPadding(10);
    const yAxis = overviewG.selectAll(".y-axis.overview-axis").data([null]);
    yAxis
        .enter()
        .append("g")
        .attr("class", "y-axis overview-axis axis")
        .attr("aria-hidden", "true")
        .merge(yAxis)
        .transition(t_overview)
        .call(yAxisGenerator)
        .selectAll(".tick text")
        .attr("transform", "translate(-5, 0)");
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
    if (guidelineValue !== undefined && guidelineValue > 0) { 
        const guidelineX = x(guidelineValue); 
        if (guidelineX >= 0 && guidelineX <= innerWidth) { 
            const guidelineGroup = 
                overviewG
                    .append("g")
                    .attr("class", "guideline-group")
                    .attr("aria-label", `WHO Guideline limit: ${guidelineValue} µg/m³`); 
                guidelineGroup
                    .append("line")
                    .attr("x1", guidelineX)
                    .attr("x2", guidelineX)
                    .attr("y1", -5)
                    .attr("y2", innerHeight)
                    .style("opacity", 0)
                    .transition(t_overview.delay(200))
                    .style("opacity", 0.8); 
                guidelineGroup
                    .append("text")
                    .attr("x", guidelineX)
                    .attr("y", -12)
                    .text(`WHO Guideline (${guidelineValue})`)
                    .style("opacity", 0)
                    .transition(t_overview.delay(200))
                    .style("opacity", 1); 
            } 
        }
    const yearText = overviewG.selectAll(".year-overlay-text").data([year]);
    yearText
        .enter()
        .append("text")
        .attr("class", "year-overlay-text")
        .attr("x", innerWidth - 5)
        .attr("y", 5)
        .style("opacity", 0)
        .merge(yearText)
        .text(d => d)
        .transition(t_fast_overview)
        .attr("x", innerWidth - 5)
        .attr("y", 5)
        .style("opacity", 0.65);
    currentYearDisplay.text(year); 
    yearSliderValue.text(year); 
    if (updateSlider) { 
        yearSlider.property("value", year); 
    }
}

function updatePollutantInfo(pollutantKey) {
    const info = pollutantInfo[pollutantKey]; 
    flashcard.classed("updating", true);
    setTimeout(() => {
        flashcard.select("#pollutant-name").html(info ? info.name : "N/A");
        flashcard.select("#acceptable-range").text(info ? `${info.acceptableRange}` : "N/A");
        flashcard.select("#health-risks").text(info ? info.healthRisks : "N/A");
        flashcard.select("#emission-sources").text(info ? info.emissionSources : "N/A");
        setTimeout(() => { flashcard.classed("updating", false); }, 50);
    }, 100);
}

function stopTimelapse() {
    if (timelapseInterval) { 
        clearInterval(timelapseInterval); timelapseInterval = null; isPlaying = false; playPauseButton.attr("aria-label", "Play timelapse").select("i").attr("class", "fas fa-play"); 
    }
}

async function runTimelapseStep() {
    if (!currentPollutant || !isPlaying) { 
        stopTimelapse(); 
        return; 
    }
    const data = await loadAndTransformData();
    currentDisplayYear = years[currentYearIndex];
    const dataForYear = data[currentDisplayYear]?.[currentPollutant];
    if (dataForYear) { 
        updateChart(currentPollutant, dataForYear, currentDisplayYear, true); 
    } else { 
        console.warn(`No data for ${currentPollutant} in ${currentDisplayYear}`); updateChart(currentPollutant, [], currentDisplayYear, true); 
    }
    currentYearIndex++; 
    if (currentYearIndex >= years.length) { 
        currentYearIndex = 0; 
    }
}

function startTimelapse(pollutantKey) {
    stopTimelapse(); 
    if (pollutantKey) { 
        currentPollutant = pollutantKey; 
    } else if (!currentPollutant) { 
        console.error("Cannot start timelapse."); 
        return; 
    }
    isPlaying = true; 
    playPauseButton.attr("aria-label", "Pause timelapse").select("i").attr("class", "fas fa-pause");
    runTimelapseStep(); 
    timelapseInterval = setInterval(runTimelapseStep, timelapseSpeed);
}

function togglePlayPause() {
    if (isPlaying) { 
        stopTimelapse(); 
    } else { 
        const selectedPollutant = pollutantSelect.property("value"); 
        if (selectedPollutant) { 
            startTimelapse(selectedPollutant); 
        } else { 
            console.warn("Select pollutant first."); 
        } 
    }
}

async function updateEuropeHeatmap(timeframe = null) {
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

    const aqiDataForLayer = await loadAQIData(timeframe);
    currentAqiDataPoints = aqiDataForLayer

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
        maxZoom: europeHeatmap.getMaxZoom(),
        max: MAX_AQI_FOR_HEATMAP,
        gradient: gradientAQI,
        minOpacity: 0.25
    }).addTo(europeHeatmap);

    createOrUpdateHeatmapLegend();
}

function createOrUpdateHeatmapLegend() {
    if (heatmapLegendContainer.empty()) {
        console.error("#heatmap-legend-europe container not found. Cannot create legend.");
        return;
    }
    heatmapLegendContainer.html('');
    heatmapLegendContainer.append("h4").text("AQI Legend");
    const legendItems = heatmapLegendContainer.selectAll(".heatmap-legend-item")
        .data(AQI_CATEGORIES_HEATMAP)
        .enter()
        .append("div")
        .attr("class", "heatmap-legend-item")
        .on("mouseover", function(event, d) {
            d3.select(this).style("background-color", "var(--border-secondary)");
        })
        .on("mouseout", function(event, d) {
            d3.select(this).style("background-color", "transparent");
        });

    legendItems.append("span")
        .attr("class", "legend-color-box")
        .style("background-color", d => d.color.replace(/, 0\.\d+\)/, ', 1)'));

    legendItems.append("span")
        .attr("class", "legend-text")
        .text(d => {
            if (d.max === 500) return `${d.level} (${d.min}+)`;
            return `${d.level} (${d.min} - ${d.max})`;
        });
}

function initializeEuropeHeatmap() {
    if (typeof L === 'undefined' || typeof L.heatLayer === 'undefined') {
        console.error("Leaflet or Leaflet.heat is not loaded! Cannot initialize heatmap.");
        heatmapContainerEurope.html('<p class="placeholder-text error-text">Map library (Leaflet/Leaflet.heat) could not be loaded. Heatmap disabled.</p>');
        heatmapLegendContainer.html('<p class="error-text" style="text-align:center; font-size:0.9em;">Legend unavailable</p>');
        return;
    }
    heatmapContainerEurope.select(".placeholder-text").text("Initializing AQI heatmap...");

    try {
        const southWestEurope = L.latLng(32, -27);
        const northEastEurope = L.latLng(71, 50);
        const europeBounds = L.latLngBounds(southWestEurope, northEastEurope);

        europeHeatmap = L.map('heatmap-container-europe', {
            scrollWheelZoom: true,
            worldCopyJump: false,
            maxBounds: europeBounds,
            maxBoundsViscosity: 0.95
        }).setView([53, 15], 4);
        europeHeatmap.setMinZoom(3); europeHeatmap.setMaxZoom(10);

        L.tileLayer(TILE_URL, {
            attribution: TILE_ATTRIBUTION,
            minZoom: europeHeatmap.getMinZoom(),
            maxZoom: 18,
            bounds: europeBounds
        }).addTo(europeHeatmap);

        heatmapRadiusSlider.property("value", 25);
        heatmapRadiusValue.text(25);
        heatmapBlurSlider.property("value", 15);
        heatmapBlurValue.text(15);

        updateEuropeHeatmap(heatmapTimeframeSelect.property("value"));

        heatmapTimeframeSelect.on("change", function() { updateEuropeHeatmap(d3.select(this).property("value")); });
        heatmapRadiusSlider.on("input", function() {
            const value = d3.select(this).property("value");
            heatmapRadiusValue.text(value);
            updateEuropeHeatmap();
        });
        heatmapBlurSlider.on("input", function() {
            const value = d3.select(this).property("value");
            heatmapBlurValue.text(value);
            updateEuropeHeatmap();
        });

        europeHeatmap.on('mousemove', function(e) {
            if (!currentAqiDataPoints || currentAqiDataPoints.length === 0 || !heatLayer) {
                mapTooltip.style("display", "none");
                return;
            }
            let nearestPoint = null;
            let minDist = Infinity;
            currentAqiDataPoints.forEach(point => {
                const dist = haversineDistance(e.latlng.lat, e.latlng.lng, point[0], point[1]);
                const screenDist = europeHeatmap.latLngToContainerPoint(e.latlng).distanceTo(europeHeatmap.latLngToContainerPoint(L.latLng(point[0], point[1])));
                if (screenDist < 50 && screenDist < minDist) {
                     minDist = screenDist;
                     nearestPoint = point;
                }
            });

            if (nearestPoint) {
                mapTooltip
                    .style("display", "block")
                    .style("left", (e.containerPoint.x + 15) + "px")
                    .style("top", (e.containerPoint.y - 30) + "px")
                    .html(`Lat: ${nearestPoint[0].toFixed(2)}, Lon: ${nearestPoint[1].toFixed(2)}<br>Approx. AQI: <strong>${nearestPoint[2]}</strong>`);
            } else {
                mapTooltip.style("display", "none");
            }
        });
        europeHeatmap.on('mouseout', function() { mapTooltip.style("display", "none"); });

        europeHeatmap.on('click', function(e) {
            console.log("Clicked on map:", e.latlng);
            console.log("Clicked on map2:", heatLayer);
            console.log("Clicked on map3:", currentAqiDataPoints);
            if (!currentAqiDataPoints || currentAqiDataPoints.length === 0 || !heatLayer) return;
            console.log("Clicked on map3:", e.latlng);
            let nearestPoint = null;
            let minDist = Infinity;
            currentAqiDataPoints.forEach(point => {
                const dist = haversineDistance(e.latlng.lat, e.latlng.lng, point[0], point[1]);
                if (dist < minDist) {
                    minDist = dist;
                    nearestPoint = point;
                }
            });

            let popupContent = `<strong>Location Details</strong><br>Lat: ${e.latlng.lat.toFixed(3)}, Lon: ${e.latlng.lng.toFixed(3)}`;
            if (nearestPoint && minDist < 200) {
                popupContent += `<br>Approx. AQI: ${nearestPoint[2]}`;
                const simulatedFactors = ["local traffic", "regional transport", "weather patterns", "industrial activity", "natural sources"];
                popupContent += `<br><small>Possible factors: ${simulatedFactors[Math.floor(Math.random()*simulatedFactors.length)]}</small>`;
            } else {
                popupContent += `<br>No detailed data nearby.`;
            }

            L.popup()
             .setLatLng(e.latlng)
             .setContent(popupContent)
             .openOn(europeHeatmap);
        });


        createOrUpdateHeatmapLegend();
        setTimeout(() => { if (europeHeatmap) europeHeatmap.invalidateSize(); }, 250);

    } catch (error) {
        console.error("Error during Europe AQI heatmap initialization:", error);
        heatmapContainerEurope.html(`<p class="placeholder-text error-text">Error initializing heatmap: ${error.message}</p>`);
        heatmapLegendContainer.html('<p class="error-text" style="text-align:center; font-size:0.9em;">Legend unavailable due to error.</p>');
    }
}

function populateCountryDropdowns() {
    countrySelect.selectAll("option").data([DEFAULT_COUNTRY, ...availableCountries.filter(c => c !== DEFAULT_COUNTRY)])
        .enter().append("option").attr("value", d => d).text(d => d);
    countrySelect.property("value", DEFAULT_COUNTRY);
}

function createPopupContent(city) {
    const pm25Value = city.pollution?.['PM2.5'];

    let aqiCategoryDetails = PM25_THRESHOLDS_FOR_POPUP.find(cat => pm25Value >= cat.min && (pm25Value <= cat.max || cat.max === Infinity));
    if (!aqiCategoryDetails && pm25Value !== undefined && pm25Value !== null) {
         aqiCategoryDetails = PM25_THRESHOLDS_FOR_POPUP[PM25_THRESHOLDS_FOR_POPUP.length -1];
    } else if (!aqiCategoryDetails || pm25Value === undefined || pm25Value === null) {
         aqiCategoryDetails = { level: 'Unknown', popupClass: 'aqi-unknown', icon: 'fas fa-question-circle' };
    }

    let pollutantListHtml = '<ul class="popup-pollutant-list">';
    const displayOrder = ["PM2.5", "PM10", "NO2", "O3", "SO2", "CO"];
    const availablePollutantsForCity = displayOrder.filter(p => city.pollution && city.pollution.hasOwnProperty(p));

    if (availablePollutantsForCity.length > 0) {
         availablePollutantsForCity.forEach(pollutantKey => {
            const value = city.pollution[pollutantKey];
             const info = pollutantInfo[pollutantKey];
             const unit = (pollutantKey === 'CO' ? 'mg/m³' : 'µg/m³');
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

    const now = new Date();
    const timestamp = `Updated: ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} ${now.getDate()}/${now.getMonth() + 1}`;

    return `
        <div class="popup-header ${aqiCategoryDetails.popupClass}">
            <span class="popup-aqi-icon">Sampling Point Details</span>
        </div>
        <div class="popup-body">
            <h4 class="popup-city-name">${city.name}</h4>
            ${pollutantListHtml}
        </div>
        <div class="popup-timestamp">${timestamp}</div>`;
}

function updateCountryMap(countryName, countryData, initialLoad = true) {
    if (!countryMapContainer.node()) { console.error("Country map container not found."); return; }
    countryMapContainer.html('');

    if (typeof L === 'undefined') {
        countryMapContainer.html('<p class="placeholder-text error-text">Map library (Leaflet) could not be loaded.</p>');
        return;
    }

    const mapId = `country-map-div-${new Date().getTime()}`;
    countryMapContainer.append('div').attr('id', mapId).style('width', '100%').style('height', '100%');

    if (mapInstance) { 
        mapInstance.remove(); 
        mapInstance = null; 
    }
    currentMarkers.forEach(marker => marker.remove()); currentMarkers = [];

    mapInstance = L.map(mapId).setView(countryData.center, countryData.zoom);
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, minZoom: 4, maxZoom: 12 }).addTo(mapInstance);

    (countryData.cities || []).forEach(city => {
        if (city.lat !== undefined && city.lon !== undefined) {
            const marker = L.marker([city.lat, city.lon], {})
                .addTo(mapInstance)
                .bindPopup(createPopupContent(city), {offset: L.point(0, -15)});
            currentMarkers.push(marker);
        }
    });
    setTimeout(() => { if(mapInstance) mapInstance.invalidateSize({animate: true}); }, 100);
    selectedCountryNameMap.text(countryName);
    countryMapSection.style("opacity", 0).style("transform", "translateY(10px)")
        .transition().duration(500).delay(initialLoad ? 100 : 0)
        .style("opacity", 1).style("transform", "translateY(0px)");
}

function updatePollutantDistributionChart(countryName, countryData, selectedCityPollutant, initialLoad = true) {
    if (!pollutantDistributionChartContainer.node()) return;
    pollutantDistributionChartContainer.html('');

    const statsData = (countryData.cities || []).flatMap(city =>
        Object.entries(city.pollution || {}).map(([pollutant, value]) => ({ city: city.name, pollutant, value }))
    );

    if (statsData.length === 0) {
        pollutantDistributionChartContainer.html('<p class="placeholder-text">No detailed city pollution data for Z-score distribution.</p>');
        dominantPollutantDisplay.html('N/A');
        return;
    }

    const avgPollutionByPollutant = {};
    const relevantPollutantsForStats = availablePollutants.filter(p => statsData.some(d => d.pollutant === p));

    relevantPollutantsForStats.forEach(p => {
        const values = statsData.filter(d => d.pollutant === p && typeof d.value === 'number').map(d => d.value);
        avgPollutionByPollutant[p] = values.length > 0 ? d3.mean(values) : NaN;
    });

    const zScores = calculateZScores(avgPollutionByPollutant);

    const zScoreData = Object.entries(zScores)
        .filter(([pollutant, zScore]) => !isNaN(zScore))
        .map(([pollutant, zScore]) => ({ pollutant, zScore: parseFloat(zScore.toFixed(2)) }));
         const desiredOrder = ["O3", "PM10", "NO2", "PM2.5", "SO2"];
         zScoreData.sort((a, b) => {
             const orderA = desiredOrder.indexOf(a.pollutant);
             const orderB = desiredOrder.indexOf(b.pollutant);
             if (orderA === -1 && orderB === -1) return 0;
             if (orderA === -1) return 1;
             if (orderB === -1) return -1;
             return orderA - orderB;
         });


    if (zScoreData.length === 0) {
        pollutantDistributionChartContainer.html('<p class="placeholder-text">Could not calculate Z-scores (insufficient or uniform data).</p>');
        dominantPollutantDisplay.html('N/A');
        return;
    }

    const dominantPollutantObj = zScoreData.length > 0 ? zScoreData.reduce((max, p) => Math.abs(p.zScore) > Math.abs(max.zScore) ? p : max) : null;
    const dominantPollutant = dominantPollutantObj && dominantPollutantObj.pollutant ? dominantPollutantObj.pollutant : "N/A";
    dominantPollutantDisplay.html(`<br><strong>${dominantPollutant} (${dominantPollutantObj?.zScore?.toFixed(2) || 'N/A'})</strong>`);


    const pDistChartWidth = parseInt(pollutantDistributionChartContainer.style("width")) || 300;
    const pDistChartHeight = Math.max(280, zScoreData.length * 35 + 70);
    const pDistMargin = { top: 25, right: 30, bottom: 55, left: 80 };
    if (pDistChartWidth < pDistMargin.left + pDistMargin.right + 50) {
         pDistMargin.left = 50;
         pDistMargin.right = 10;
    }
    const pDistInnerWidth = pDistChartWidth - pDistMargin.left - pDistMargin.right;
    const pDistInnerHeight = pDistChartHeight - pDistMargin.top - pDistMargin.bottom;


    const svg = pollutantDistributionChartContainer.append("svg")
        .attr("width", pDistChartWidth).attr("height", pDistChartHeight)
        .append("g").attr("transform", `translate(${pDistMargin.left},${pDistMargin.top})`);

    const xDistMax = d3.max(zScoreData, d => Math.abs(d.zScore)) || 1;
    const xDist = d3.scaleLinear().range([0, pDistInnerWidth]).domain([-xDistMax * 1.1, xDistMax * 1.1]).nice();

    const yDist = d3.scaleBand().range([pDistInnerHeight, 0]).padding(0.4).domain(zScoreData.map(d => d.pollutant));

    if (pDistInnerWidth <= 0 || pDistInnerHeight <= 0 || xDist.domain()[0] === undefined || yDist.domain().length === 0) {
        console.warn("Distribution chart has invalid dimensions or data domain.", {pDistInnerWidth, pDistInnerHeight, xDomain: xDist.domain(), yDomain: yDist.domain()});
        pollutantDistributionChartContainer.html('<p class="placeholder-text">Chart could not be rendered due to invalid dimensions or data.</p>');
        dominantPollutantDisplay.html('N/A');
        return;
    }

    svg.append("g").attr("class", "x-axis dist-axis axis")
        .attr("transform", `translate(0,${pDistInnerHeight})`)
        .call(d3.axisBottom(xDist).ticks(5).tickSizeInner(-pDistInnerHeight).tickPadding(8));
    svg.selectAll(".x-axis.dist-axis .tick line").style("stroke-dasharray", "var(--grid-line-style-dense)").style("opacity", 0.5);

    svg.append("g").attr("class", "y-axis dist-axis axis")
        .call(d3.axisLeft(yDist).tickSize(0).tickPadding(10));

    svg.append("line").attr("class", "zero-line")
        .attr("x1", xDist(0)).attr("x2", xDist(0))
        .attr("y1", 0).attr("y2", pDistInnerHeight);

    svg.selectAll(".dist-bar").data(zScoreData).enter().append("rect")
        .attr("class", "dist-bar")
        .attr("x", d => xDist(Math.min(0, d.zScore)))
        .attr("y", d => yDist(d.pollutant) ?? 0)
        .attr("height", yDist.bandwidth())
        .attr("width", 0)
        .style("fill", d => d.zScore >= 0 ? "var(--dist-bar-positive)" : "var(--dist-bar-negative)")
        .on("mouseover", handleMouseOver)
        .on("mouseout", handleMouseOut)
        .transition().duration(600).delay((d, i) => i * 70)
        .attr("x", d => xDist(Math.min(0, d.zScore)))
        .attr("width", d => Math.abs(xDist(d.zScore) - xDist(0)));

    svg.append("text").attr("class", "x-axis-label dist-label axis-label")
        .attr("x", pDistInnerWidth / 2)
        .attr("y", pDistInnerHeight + pDistMargin.bottom - 15)
        .text("Z-Score (Normalized Value)");

    selectedCountryNameStats.text(countryName);
}

function updateCityLollipopChart(countryName, countryData, selectedPollutant, initialLoad = true) {
    if (!cityComparisonChartContainer.node()) {
        console.error("City comparison chart container not found.");
        return;
    }
    cityComparisonChartContainer.html('');
    cityComparisonPollutantSpan.text(selectedPollutant);
    cityPollutantSelect.property('value', selectedPollutant);

    const cityData = (countryData.cities || [])
        .map(city => ({ name: city.name, value: city.pollution ? city.pollution[selectedPollutant] : undefined }))
        .filter(d => d.value !== undefined && d.value !== null && !isNaN(d.value))
        .sort((a, b) => b.value - a.value);

    if (cityData.length === 0) {
        cityComparisonChartContainer.html(`<p class="placeholder-text">No data for ${selectedPollutant} in cities of ${countryName}.</p>`);
        console.warn(`No city data found for ${selectedPollutant} in ${countryName}.`);
        return;
    }

    const chartWidth = parseInt(cityComparisonChartContainer.style("width")) || 300;
    const chartHeight = Math.max(220, cityData.length * 28 + 60);
    const marginLollipop = { top: 20, right: 80, bottom: 45, left: 95 };
    if (chartWidth < marginLollipop.left + marginLollipop.right + 50) {
        marginLollipop.right = 20;
        marginLollipop.left = 60;
    }
    const innerWidthLollipop = chartWidth - marginLollipop.left - marginLollipop.right;
    const innerHeightLollipop = chartHeight - marginLollipop.top - marginLollipop.bottom;

    const svg = cityComparisonChartContainer.append("svg")
        .attr("width", chartWidth).attr("height", chartHeight)
        .append("g").attr("transform", `translate(${marginLollipop.left},${marginLollipop.top})`);

    const xLolli = d3.scaleLinear().domain([0, d3.max(cityData, d => d.value) * 1.1 || 10]).range([0, innerWidthLollipop]).nice();
    const yLolli = d3.scaleBand().domain(cityData.map(d => d.name)).range([0, innerHeightLollipop]).padding(0.5);

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
        .attr("x2", 0) .attr("y2", 0)
        .transition().duration(600).delay((d,i) => i * 60)
        .attr("x2", d => xLolli(d.value));

    groups.append("circle").attr("class", "lollipop-dot")
        .attr("cy", 0)
        .attr("cx", 0)
        .attr("r", 0)
        .on("mouseover", function(event, d) {
            d3.select(this).transition("dotHoverLolli").duration(100).attr("r", 7.5).style("filter", "brightness(0.85)");
            tooltip.html(`<strong>${d.name}</strong><br>${selectedPollutant}: <i style="color: var(--text-accent)" >${d.value.toFixed(1)}</i> µg/m³`);
            tooltip.transition("tooltipFade").duration(100).style("opacity", 1).style("transform", "translateY(0px)");
            positionTooltip(event, tooltip);

         })
        .on("mouseout", function(event, d) {
            d3.select(this).transition("dotHoverOutLolli").duration(150).attr("r", 5.5).style("filter", "brightness(1)");
            d3.select(this.parentNode).select(".on-lollipop-hover-label").transition().duration(150).style("opacity", 0).remove();
            tooltip.transition("tooltipFadeOut").duration(150).style("opacity", 0).style("transform", "translateY(5px)");
        })
        .transition().duration(600).delay((d,i) => i * 60 + 100)
        .attr("cx", d => xLolli(d.value))
        .attr("r", 5.5);

    groups.append("text")
        .attr("class", "lollipop-value-label")
        .attr("x", 0)
        .attr("y", 0)
        .attr("dy", "0.35em")
        .style("text-anchor", "start")
        .style("font-size", "15px")
        .style("opacity", 0)
        .text(d => `${d.value.toFixed(1)} µg/m³`)
        .transition().duration(600).delay((d,i) => i * 60 + 200)
        .attr("x", d => xLolli(d.value) + 8)
        .style("opacity", 1);

    const guidelineVal = pollutantInfo[selectedPollutant]?.guidelineValue;
    if (guidelineVal !== undefined && guidelineVal > 0 && xLolli(guidelineVal) > 0 && xLolli(guidelineVal) <= innerWidthLollipop) {
        svg.append("line").attr("class", "guideline-line")
            .attr("x1", xLolli(guidelineVal)).attr("x2", xLolli(guidelineVal))
            .attr("y1", -5).attr("y2", innerHeightLollipop + 5)
            .style("opacity", 0).transition().duration(500).delay(400).style("opacity", 0.75);
        svg.append("text").attr("class", "guideline-label")
            .attr("x", xLolli(guidelineVal)).attr("y", 0)
            .text(`WHO Guideline (${guidelineVal})`)
            .style("opacity", 0).transition().duration(500).delay(400).style("opacity", 1);
    } else {
        console.log(`Guideline not drawn for ${selectedPollutant}. Value: ${guidelineVal}, Y Pos: ${yLolli(guidelineVal)}, InnerHeight: ${innerHeightLollipop}`); // Log se guideline non viene disegnata
    }
}


function getSelectedEvolutionPollutants() {
    const selected = [];
    evolutionCheckboxContainer.selectAll('input[type="checkbox"]:checked').each(function() { selected.push(d3.select(this).property("value")); });
    return selected;
}

function updatePollutantEvolutionChart(countryName, countryData, pollutantsToPlot, selectedPointInfo = null, animate = true) {
    if (!pollutantEvolutionChartContainer.node()) {
        console.error("Pollutant evolution chart container not found.");
        return;
    }
    pollutantEvolutionChartContainer.html('');
    lastCheckedPollutants = pollutantsToPlot;
    currentlySelectedPoint = selectedPointInfo;
    if (!pollutantsToPlot || pollutantsToPlot.length === 0) {
        pollutantEvolutionChartContainer.html('<p class="placeholder-text">Select pollutants from checkboxes to view evolution.</p>');
        evolutionClickInfoContainer.html("Click on a point in the chart to see details."); return;
    }
    if (selectedPointInfo) {
        evolutionClickInfoContainer.html(`Selected: <strong>${selectedPointInfo.pollutant}</strong> <br> Year: ${selectedPointInfo.year} <br> Value: <span class="value">${selectedPointInfo.value.toFixed(1)} µg/m³</span>`);
    } else { evolutionClickInfoContainer.html("Click on a point in the chart to see details."); }

    dataForEvolutionChart = [];
    pollutantsToPlot.forEach(pollutant => {
        const evolutionData = countryData.pollutantEvolution ? countryData.pollutantEvolution[pollutant] : null;
        if (evolutionData) {
            const points = Object.entries(evolutionData)
                .map(([year, value]) => ({ year: +year, value: value !== null && !isNaN(value) ? +value : null }))
                .filter(d => d.value !== null && d.year >= Math.min(...years) && d.year <= Math.max(...years))
                .sort((a, b) => a.year - b.year);
            if (points.length > 0) dataForEvolutionChart.push({ pollutant, points, color: colorScale(pollutant) });
        } else {
            console.warn(`No evolution data found for pollutant ${pollutant} in ${countryName}.`);
        }
    });

    if (dataForEvolutionChart.length === 0) {
        pollutantEvolutionChartContainer.html(`<p class="placeholder-text">No evolution data for selected pollutants in ${countryName}.</p>`);
        return;
    }
    const pEvoChartWidth = parseInt(pollutantEvolutionChartContainer.style("width")) || 300;
    const pEvoChartHeight = 300;
    const pEvoMargin = { top: 20, right: 45, bottom: 55, left: 50 };
    let pEvoInnerWidth = pEvoChartWidth - pEvoMargin.left - pEvoMargin.right;
    let pEvoInnerHeight = pEvoChartHeight - pEvoMargin.top - pEvoMargin.bottom;

    if (pEvoChartWidth < pEvoMargin.left + pEvoMargin.right + 50) {
         pEvoMargin.right = 10;
         pEvoMargin.left = 30;
         pEvoInnerWidth = pEvoChartWidth - pEvoMargin.left - pEvoMargin.right;
         pEvoInnerHeight = pEvoChartHeight - pEvoMargin.top - pEvoMargin.bottom;
    }

    const svg = pollutantEvolutionChartContainer.append("svg")
        .attr("width", pEvoChartWidth).attr("height", pEvoChartHeight)
        .append("g").attr("transform", `translate(${pEvoMargin.left},${pEvoMargin.top})`);

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
        if (animate) animateEvolutionChartLines(path);

        const guidelineValue = pollutantInfo[series.pollutant]?.guidelineValue;
         if (guidelineValue !== undefined && guidelineValue > 0 && yEvo(guidelineValue) >= 0 && yEvo(guidelineValue) <= pEvoInnerHeight) {
            const guidelineGroup = svg.append("g").attr("class", "evolution-guideline-group");
            guidelineGroup.append("line").attr("class", "evolution-guideline-line")
                .attr("x1", 0).attr("x2", pEvoInnerWidth)
                .attr("y1", yEvo(guidelineValue)).attr("y2", yEvo(guidelineValue))
                .style("stroke", series.color).style("stroke-dasharray", "4,4").style("opacity", 0.45)
                .style("stroke-width", 1.2);

            svg.append("text").attr("class", "evolution-guideline-label")
                 .attr("x", pEvoInnerWidth - 5)
                 .attr("y", yEvo(guidelineValue) - 4)
                 .attr("text-anchor", "end")
                 .text(`${series.pollutant} WHO Limit (${guidelineValue})`)
                 .style("fill", series.color)
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
            .attr("r", d => {
                 if (animate) return 0;
                 return (currentlySelectedPoint && d.year === currentlySelectedPoint.year && series.pollutant === currentlySelectedPoint.pollutant) ? 6 : 4;
             })
            .style("fill", series.color)
            .classed("selected", d => currentlySelectedPoint && d.year === currentlySelectedPoint.year && series.pollutant === currentlySelectedPoint.pollutant)
            .on("mouseover", function(event, d) {
                if (!(currentlySelectedPoint && d.year === currentlySelectedPoint.year && series.pollutant === currentlySelectedPoint.pollutant)) {
                    d3.select(this).transition("pointHover").duration(100).attr("r", 6.5).style("opacity", 1);
                }
                tooltip.html(`<strong>${series.pollutant}</strong><br>Year: ${d.year}<br>Value: <i style="color: var(--text-accent)" >${d.value.toFixed(1)}</i> µg/m³`);
                tooltip.transition("tooltipFade").duration(100).style("opacity", 1).style("transform", "translateY(0px)");
                positionTooltip(event, tooltip);

            })
            .on("mouseout", function(event, d) {
                if (!(currentlySelectedPoint && d.year === currentlySelectedPoint.year && series.pollutant === currentlySelectedPoint.pollutant)) {
                    d3.select(this).transition("pointHoverOut").duration(100).attr("r", 4).style("opacity", 0.8);
                }
                tooltip.transition("tooltipFadeOut").duration(150).style("opacity", 0).style("transform", "translateY(5px)");
            })
            .on("click", function(event, d) {
                const clickedPollutant = series.pollutant;
                const clickedYear = d.year;

                const isAlreadySelected = currentlySelectedPoint &&
                                          currentlySelectedPoint.pollutant === clickedPollutant &&
                                          currentlySelectedPoint.year === clickedYear;

                let newSelectedPoint = null;

                if (!isAlreadySelected) {
                    newSelectedPoint = { pollutant: clickedPollutant, year: clickedYear, value: d.value };
                    currentlySelectedPoint = newSelectedPoint;

                } else {
                    currentlySelectedPoint = null;
                }

                svg.selectAll(".evolution-point").classed("selected", false).attr("r", 4);
                if (currentlySelectedPoint) {
                     svg.selectAll(".evolution-point")
                        .filter(pt => pt.year === currentlySelectedPoint.year && dataForEvolutionChart.find(s => s.points.includes(pt))?.pollutant === currentlySelectedPoint.pollutant)
                        .classed("selected", true)
                        .attr("r", 6);
                }

                if (currentlySelectedPoint) {
                    evolutionClickInfoContainer.html(`Selected: <strong>${currentlySelectedPoint.pollutant}</strong> <br> Year: ${currentlySelectedPoint.year} <br> Value: <span class="value">${currentlySelectedPoint.value.toFixed(1)} µg/m³</span>`);
                } else {
                    evolutionClickInfoContainer.html("Click on a point in the chart to see details.");
                }

            })
            .transition("pointAppear").duration(animate ? 600 : 0).delay(animate ? (d, i) => i * 20 + 500 : 0)
            .attr("cx", d => xEvo(d.year))
            .attr("r", d => {
                if (currentlySelectedPoint && d.year === currentlySelectedPoint.year && series.pollutant === currentlySelectedPoint.pollutant) {
                    return 6;
                } else {
                    return 4;
                }
             });
    });
    evolutionChartAnimated = true;
}


function animateEvolutionChartLines(pathSelection) {
    if (!pathSelection || pathSelection.empty()) return;
    pathSelection.each(function() {
        const pathNode = d3.select(this);
        const totalLength = pathNode.node().getTotalLength();
        pathNode.attr("stroke-dasharray", totalLength + " " + totalLength)
            .attr("stroke-dashoffset", totalLength)
            .transition("lineAnimEV").duration(1000).delay(100).ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0);
    });
}

function setupEvolutionChartObserver() {
    if (evolutionChartObserver) evolutionChartObserver.disconnect();
    const options = { root: null, rootMargin: '0px', threshold: 0.3 };
    evolutionChartObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !evolutionChartAnimated && dataForEvolutionChart.length > 0) {
                const paths = pollutantEvolutionChartContainer.selectAll(".pollutant-line");
                animateEvolutionChartLines(paths);
                pollutantEvolutionChartContainer.selectAll(".evolution-point")
                    .transition("pointAppear").duration(600).delay((d,i) => i * 20 + 500)
                    .attr("r", d => (currentlySelectedPoint && d.year === currentlySelectedPoint.year && dataForEvolutionChart.find(s=>s.points.includes(d))?.pollutant === currentlySelectedPoint.pollutant) ? 6 : 4); // Changed to numerical 6 and 4
                evolutionChartAnimated = true;
            }
        });
    }, options);
    if (pollutantEvolutionChartContainer.node()) evolutionChartObserver.observe(pollutantEvolutionChartContainer.node());
}

function initializeCityPollutantSelect(countryData) {
    const pollutantsInCities = new Set();
    (countryData.cities || []).forEach(city => {
        if(city.pollution) Object.keys(city.pollution).forEach(p => pollutantsInCities.add(p));
    });
    const relevantPollutants = availablePollutants.filter(p => pollutantsInCities.has(p));

    cityPollutantSelect.selectAll('option').remove();
    cityPollutantSelect.selectAll('option')
        .data(relevantPollutants.length > 0 ? relevantPollutants : [DEFAULT_POLLUTANT])
        .enter().append('option')
        .attr('value', d => d)
        .text(d => d);

    if (relevantPollutants.includes(DEFAULT_POLLUTANT)) cityPollutantSelect.property('value', DEFAULT_POLLUTANT);
    else if (relevantPollutants.length > 0) cityPollutantSelect.property('value', relevantPollutants[0]);
    else cityPollutantSelect.property('value', DEFAULT_POLLUTANT);
}

async function loadCountryData(countryName, initialLoad = true) {
    countryVisualizationContent.classed("hidden", true);
    const fullData = await loadCountrySpecificData();
    if (!countryName || !fullData[countryName]) {
        console.warn(`No data for country: ${countryName}. Displaying placeholders.`);
        countryMapContainer.html('<p class="placeholder-text">Select a country to view data.</p>');
        pollutantDistributionChartContainer.html('<p class="placeholder-text">Select a country.</p>');
        pollutantEvolutionChartContainer.html('<p class="placeholder-text">Select a country.</p>');
        cityComparisonChartContainer.html('<p class="placeholder-text">Select a country.</p>');
        selectedCountryNameMap.text("N/A"); selectedCountryNameStats.text("N/A");
        dominantPollutantDisplay.text("N/A");
        evolutionCheckboxContainer.html('<p class="placeholder-text" style="margin: 5px 0; font-size: 0.85em;">Select a country first.</p>');
        cityPollutantSelect.selectAll('option').remove();
        cityPollutantSelect.append('option').attr('value', '').text('Select pollutant...');

        return;
    }
    const countryData = fullData[countryName];
    updateCountryMap(countryName, countryData, initialLoad);
    initializeCityPollutantSelect(countryData);
    const defaultCityPollutant = cityPollutantSelect.property("value");

    updateCityLollipopChart(countryName, countryData, defaultCityPollutant, initialLoad);
    updatePollutantDistributionChart(countryName, countryData, defaultCityPollutant, initialLoad);

    evolutionCheckboxContainer.html('');
    const availableEvoPollutants = Object.keys(countryData.pollutantEvolution || {});
    const relevantEvoPollutants = availablePollutants.filter(p => availableEvoPollutants.includes(p));

    if(relevantEvoPollutants.length > 0) {
        relevantEvoPollutants.forEach(pollutant => {
            const label = evolutionCheckboxContainer.append("label").attr("class", "checkbox-item");
            label.append("input").attr("type", "checkbox").attr("value", pollutant)
                 .property("checked", ["PM2.5", "NO2"].includes(pollutant))
                 .on("change", function() {
                     const checkbox = d3.select(this);
                     const isCheckedAfterChange = checkbox.property("checked");
                     const currentlyCheckedCount = evolutionCheckboxContainer.selectAll('input[type="checkbox"]:checked').size();

                    if (!isCheckedAfterChange && currentlyCheckedCount === 0) {
                         checkbox.property("checked", true);
                         console.warn(`Prevented unchecking the last pollutant (${pollutant}). At least one pollutant must be selected.`);
                         return;
                    }

                    const selectedPollutants = getSelectedEvolutionPollutants();
                    evolutionChartAnimated = false;
                    const newSelectedPoint = (currentlySelectedPoint && selectedPollutants.includes(currentlySelectedPoint.pollutant)) ? currentlySelectedPoint : null;
                    updatePollutantEvolutionChart(countryName, countryData, selectedPollutants, newSelectedPoint, true);
                 });
            label.append("span").attr("class","checkbox-label-text").style("color", colorScale(pollutant)).text(pollutant);
        });
    } else {
         evolutionCheckboxContainer.html('<p class="placeholder-text" style="margin: 5px 0; font-size: 0.85em;">No evolution data for this country.</p>');
    }
    const initialEvoPollutants = getSelectedEvolutionPollutants();
    evolutionChartAnimated = false;
    currentlySelectedPoint = null;
    updatePollutantEvolutionChart(countryName, countryData, initialEvoPollutants, null, initialLoad);
    if(initialLoad) setupEvolutionChartObserver();
    countryStatsSection.style("opacity", 0).style("transform", "translateY(10px)")
        .transition().duration(500).delay(initialLoad ? 250 : 50)
        .style("opacity", 1).style("transform", "translateY(0px)");
    setTimeout(() => { countryVisualizationContent.classed("hidden", false); }, initialLoad ? 50 : 0);
}

function initializeCountryView() {
    populateCountryDropdowns();
    countrySelect.on("change", function() {
        const selectedCountry = d3.select(this).property("value");
        loadCountryData(selectedCountry, false);
    });
    cityPollutantSelect.on("change", async function() {
        const selectedCountry = countrySelect.property("value");
        const selectedCityPollutant = d3.select(this).property("value");
        const fullData = await loadCountrySpecificData();
        const countryData = fullData[selectedCountry];
        if (countryData) {
            updateCityLollipopChart(selectedCountry, countryData, selectedCityPollutant, false);
        } else {
            console.warn(`Country data not available for ${selectedCountry} on city pollutant select change.`);
        }
    });
    loadCountryData(DEFAULT_COUNTRY, true);
}

function setupEVChartDimensions() {
    evChartWidth = parseInt(evAirQualityChartContainer.style("width")) || 600;
    evChartHeight = Math.max(380, evChartWidth * 0.55);
    evChartInnerWidth = evChartWidth - evChartMargin.left - evChartMargin.right;
    evChartInnerHeight = evChartHeight - evChartMargin.top - evChartMargin.bottom;
    evAirQualityChartDiv.select("svg").remove();
    const svgEV = evAirQualityChartDiv.append("svg")
        .attr("width", evChartWidth).attr("height", evChartHeight)
        .append("g").attr("transform", `translate(${evChartMargin.left},${evChartMargin.top})`);
    return { svgEV, xEV: d3.scaleLinear().range([0, evChartInnerWidth]), yEVLeft: d3.scaleLinear().range([evChartInnerHeight, 0]), yEVRight: d3.scaleLinear().range([evChartInnerHeight, 0]) };
}

function animateLineEV(pathSelection) {
    if (!pathSelection || pathSelection.empty()) return;

    pathSelection.each(function() {
        const path = d3.select(this);
        const totalLength = this.getTotalLength();

        // Preserve existing stroke-dasharray if already set
        const originalDashArray = path.attr("stroke-dasharray");

        path
            .attr("stroke-dasharray", originalDashArray || totalLength + " " + totalLength)
            .attr("stroke-dashoffset", totalLength)
            .transition("lineAnimEV")
            .duration(1200)
            .delay(150)
            .ease(d3.easeSinInOut)
            .attr("stroke-dashoffset", 0);
    });
}

function updateEVCountryDropdownsDisabledState() {
    const selected1 = evCountrySelect1.property("value");
    const selected2 = evCountrySelect2.property("value");

    evCountrySelect1.selectAll("option")
        .property("disabled", d => d !== "none" && d === selected2);

    evCountrySelect2.selectAll("option")
        .property("disabled", d => d !== "none" && d === selected1);
}


async function drawEVAirQualityCorrelationChart(animate = true) {
    const selectedCountry1 = evCountrySelect1.property("value");
    const selectedCountry2 = evCountrySelect2.property("value");
    if (!selectedCountry1) {
        evAirQualityChartDiv.html('<p class="placeholder-text">Select at least one country to view data.</p>');
        evChartLegendContainer.html('');
        console.warn("No country selected for EV chart.");
        return;
    }

    const { svgEV, xEV, yEVLeft, yEVRight } = setupEVChartDimensions();
    const countriesToPlot = [selectedCountry1];
    if (selectedCountry2 && selectedCountry2 !== "none" && selectedCountry2 !== selectedCountry1) countriesToPlot.push(selectedCountry2);
    const evData = await loadEVData();
    const plotData = countriesToPlot.map(country => {
        const data = evData[country];
        if (!data) return null;
        return {
            name: country, color: data.color,
            purchases: evYears.map(year => ({ year, value: data.ev_purchases[year] === undefined ? null : data.ev_purchases[year] })).filter(d => d.value !== null),
            pm25: evYears.map(year => ({ year, value: data.avg_pm25[year] === undefined ? null : data.avg_pm25[year] })).filter(d => d.value !== null)
        };
    }).filter(d => d !== null);
    if (plotData.every(d => d.purchases.length === 0 && d.pm25.length === 0)) {
        evAirQualityChartDiv.html('<p class="placeholder-text">No data available for selected countries/years.</p>');
        evChartLegendContainer.html('');
        console.warn("No plot data available for EV chart.");
        return;
    }

    xEV.domain(d3.extent(evYears));
    const maxPurchases = d3.max(plotData, d => d3.max(d.purchases, p => p.value)) || 0;
    const maxPM25 = d3.max(plotData, d => d3.max(d.pm25, p => p.value)) || 0;
    yEVLeft.domain([0, maxPurchases * 1.1 || 10000]).nice();
    yEVRight.domain([0, maxPM25 * 1.1 || 25]).nice();

    if (evChartInnerWidth <= 0 || evChartInnerHeight <= 0 || xEV.domain()[0] === undefined || yEVLeft.domain()[1] <= 0 || yEVRight.domain()[1] <= 0) {
        console.warn("EV chart has invalid dimensions or data domain.", {evChartInnerWidth, evChartInnerHeight, xDomain: xEV.domain(), yLeftDomain: yEVLeft.domain(), yRightDomain: yEVRight.domain()});
        evAirQualityChartDiv.html('<p class="placeholder-text">Chart could not be rendered due to invalid dimensions or data.</p>');
        evChartLegendContainer.html('');
        return;
    }

    svgEV.append("g").attr("class", "x-axis ev-axis axis").attr("transform", `translate(0,${evChartInnerHeight})`).call(d3.axisBottom(xEV).tickFormat(d3.format("d")).ticks(Math.min(evYears.length, Math.floor(evChartInnerWidth/70))).tickSizeInner(-evChartInnerHeight).tickPadding(8));
    svgEV.append("g").attr("class", "y-axis ev-axis ev-axis-left axis").call(d3.axisLeft(yEVLeft).ticks(6).tickSizeInner(-evChartInnerWidth).tickPadding(8));
    svgEV.append("g").attr("class", "y-axis ev-axis ev-axis-right axis").attr("transform", `translate(${evChartInnerWidth},0)`).call(d3.axisRight(yEVRight).ticks(6).tickPadding(8));
    svgEV.selectAll(".ev-axis .tick line").style("stroke-dasharray", "var(--grid-line-style-dense)").style("opacity",0.5);
    svgEV.append("text").attr("class", "axis-label y-left-label").attr("transform", "rotate(-90)").attr("y", 0 - evChartMargin.left + 20).attr("x", 0 - (evChartInnerHeight / 2)).attr("dy", "1em").style("text-anchor", "middle").text("EV Purchases Share (%)");
    svgEV.append("text").attr("class", "axis-label y-right-label").attr("transform", "rotate(-90)").attr("y", evChartInnerWidth + evChartMargin.right - 25).attr("x", 0 - (evChartInnerHeight / 2)).attr("dy", "1em").style("text-anchor", "middle").text("Avg. PM2.5 (µg/m³)");

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
            .style("fill", "#999")
            .text(`Avg. EV (%): ${Math.round(avgEVAll).toLocaleString()}`);
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
            .style("fill", "#999")
            .text(`Avg. PM2.5: ${avgPM25All.toFixed(1)}`);
    }

    const linePurchases = d3.line().x(d => xEV(d.year)).y(d => yEVLeft(d.value)).defined(d => d.value !== null);
    const linePM25 = d3.line().x(d => xEV(d.year)).y(d => yEVRight(d.value)).defined(d => d.value !== null);
    const chartG_ev = svgEV.append("g").attr("class", "ev-chart-content");

    plotData.forEach((countryData, index) => {
        const pathPurchases = chartG_ev.append("path").datum(countryData.purchases).attr("class", `line-data ev-line ev-purchases-line series-${index}`)
            .attr("fill", "none").attr("stroke", countryData.color).attr("stroke-width", 2.5)
            .attr("stroke-dasharray", "5,3")
            .attr("d", linePurchases);
        if(animate) animateLineEV(pathPurchases);

        const pathPM25 = chartG_ev
            .append("path")
            .datum(countryData.pm25)
            .attr("class", `line-data ev-line ev-pm25-line series-${index}`)
            .attr("fill", "none")
            .attr("stroke", countryData.color)
            .attr("stroke-width", 2.5)
            .attr("stroke-dasharray", null)
            .attr("d", linePM25);
        if(animate) animateLineEV(pathPM25);

        chartG_ev.selectAll(`.dot-purchases-${index}`).data(countryData.purchases).enter().append("circle")
            .attr("class", `chart-dot ev-dot dot-purchases-${index} series-${index}`)
            .attr("cx", d => xEV(d.year)).attr("cy", d => yEVLeft(d.value))
            .attr("r", animate ? 0 : 4).style("fill", countryData.color)
            .on("mouseover", function(event, d) {
                const hoveredSeriesClass = d3.select(this).attr("class").split(" ").find(c => c.startsWith("series-"));
                chartG_ev.selectAll(".ev-line").classed("series-dimmed", true);
                chartG_ev.selectAll(".ev-dot").classed("series-dimmed", true);
                chartG_ev.selectAll(`.${hoveredSeriesClass}`).classed("series-dimmed", false).classed("series-hovered", true);
                d3.select(this).classed("dot-series-hovered", true).raise();
            })
            .on("mouseout", function(event, d) {
                chartG_ev.selectAll(".ev-line").classed("series-dimmed", false).classed("series-hovered", false);
                chartG_ev.selectAll(".ev-dot").classed("series-dimmed", false).classed("dot-series-hovered", false);
            })
            .transition("dotAppearEV").duration(animate ? 700:0).delay(animate ? (d,i)=> i*30 + 800:0).attr("r", 4);

        chartG_ev.selectAll(`.dot-pm25-${index}`).data(countryData.pm25).enter().append("circle")
            .attr("class", `chart-dot ev-dot dot-pm25-${index} series-${index}`)
            .attr("cx", d => xEV(d.year)).attr("cy", d => yEVRight(d.value))
            .attr("r", animate ? 0 : 4).style("fill", countryData.color)
            .on("mouseover", function(event, d) {
                const hoveredSeriesClass = d3.select(this).attr("class").split(" ").find(c => c.startsWith("series-"));
                chartG_ev.selectAll(".ev-line").classed("series-dimmed", true);
                chartG_ev.selectAll(".ev-dot").classed("series-dimmed", true);
                chartG_ev.selectAll(`.${hoveredSeriesClass}`).classed("series-dimmed", false).classed("series-hovered", true);
                d3.select(this).classed("dot-series-hovered", true).raise();
            })
            .on("mouseout", function(event, d) {
                chartG_ev.selectAll(".ev-line").classed("series-dimmed", false).classed("series-hovered", false);
                chartG_ev.selectAll(".ev-dot").classed("series-dimmed", false).classed("dot-series-hovered", false);
            })
            .transition("dotAppearEV").duration(animate ? 700:0).delay(animate ? (d,i)=> i*30 + 800:0).attr("r", 4);
    });

    evChartLegendContainer.html('');

    plotData.forEach(countryData => {
        const legendPM25 = evChartLegendContainer.append("div").attr("class", "legend-item");
        legendPM25.append("div")
            .attr("class", "legend-line pm25-line")
            .style("background-color", countryData.color);
        legendPM25.append("span").text(`${countryData.name} – PM2.5`);

        const legendEV = evChartLegendContainer.append("div").attr("class", "legend-item");
        legendEV.append("div")
            .attr("class", "legend-line ev-line")
            .style("border-top", `3px dashed ${countryData.color}`);
        legendEV.append("span").text(`${countryData.name} – EV Share`);
    });
}


function populateEVCountryDropdowns() {
    const currentVal1 = DEFAULT_COUNTRY;
    const currentVal2 = evCountrySelect2.property("value");

    evCountrySelect1.selectAll("option").remove();
    evCountrySelect1.selectAll("option").data(evAvailableCountries).enter()
        .append("option").attr("value", d => d).text(d => d);

    evCountrySelect2.selectAll("option").remove();
    evCountrySelect2.selectAll("option").data(["none", ...evAvailableCountries]).enter()
        .append("option").attr("value", d => d).text(d => d === "none" ? "Select to compare..." : d);

    evCountrySelect1.property("value", evAvailableCountries.includes(currentVal1) ? currentVal1 : evAvailableCountries[0] || "none");
    evCountrySelect2.property("value", evAvailableCountries.includes(currentVal2) || currentVal2 === "none" ? currentVal2 : "none");
}

function initializeEVCorrelationSection() {
    populateEVCountryDropdowns();
    updateEVCountryDropdownsDisabledState();

    evCountrySelect1.on("change", () => {
        updateEVCountryDropdownsDisabledState();
        drawEVAirQualityCorrelationChart(true);
    });
    evCountrySelect2.on("change", () => {
        const selected1 = evCountrySelect1.property("value");
        const selected2 = evCountrySelect2.property("value");
        if (selected2 !== "none" && selected1 === selected2) {
            console.warn(`Prevented selecting the same country (${selected2}) in EV Country 2 dropdown.`);
            evCountrySelect2.property("value", "none");
            return;
        }
        updateEVCountryDropdownsDisabledState();
        drawEVAirQualityCorrelationChart(true);
    });


    drawEVAirQualityCorrelationChart(true);
}

async function initializeDashboard() {
    pollutantSelect.selectAll("option").data(Object.keys(pollutantInfo))
        .enter().append("option").attr("value", d => d).text(d => pollutantInfo[d].name);
    pollutantSelect.property("value", DEFAULT_POLLUTANT);
    updatePollutantInfo(DEFAULT_POLLUTANT);
    currentPollutant = DEFAULT_POLLUTANT;
    currentDisplayYear = years[0];
    yearSlider.attr("min", years[0]).attr("max", years[years.length - 1]).property("value", currentDisplayYear);
    yearSliderValue.text(currentDisplayYear); currentYearDisplay.text(currentDisplayYear);
    const data = await loadAndTransformData();
    const countrySpecificData = await loadCountrySpecificData();
    const initialData = data[currentDisplayYear]?.[currentPollutant];
    if (initialData) { updateChart(currentPollutant, initialData, currentDisplayYear); }
    else { updateChart(currentPollutant, [], currentDisplayYear); }
    startTimelapse(currentPollutant);

    loadThemePreference();
    if (themeToggleButton && !themeToggleButton.empty()) {
      themeToggleButton.on("click", toggleTheme);
    } else {
      console.warn("Theme toggle button not found.");
    }
    if (currentYearFooterSpan && !currentYearFooterSpan.empty()) {
        currentYearFooterSpan.text(new Date().getFullYear());
    }

    initializeEuropeHeatmap();

    pollutantSelect.on("change", function() {
        const selectedPollutant = d3.select(this).property("value");
        updatePollutantInfo(selectedPollutant);
        currentPollutant = selectedPollutant;
        if (isPlaying) { startTimelapse(selectedPollutant); }
        else {
            const yearFromSlider = parseInt(yearSlider.property("value"));
            const dataForYear = data[yearFromSlider]?.[selectedPollutant];
            if(dataForYear) updateChart(selectedPollutant, dataForYear, yearFromSlider, false);
            else updateChart(selectedPollutant, [], yearFromSlider, false);
        }
    });
    playPauseButton.on("click", togglePlayPause);
    yearSlider.on("input", function() {
        stopTimelapse();
        const selectedYear = parseInt(d3.select(this).property("value"));
        currentDisplayYear = selectedYear;
        currentYearIndex = years.indexOf(selectedYear);
        const dataForYear = data[selectedYear]?.[currentPollutant];
        if(dataForYear) updateChart(currentPollutant, dataForYear, selectedYear, false);
        else updateChart(currentPollutant, [], selectedYear, false);
    });

    initializeCountryView();
    initializeEVCorrelationSection();

    window.addEventListener("resize", debounce(() => {
        console.log("Window resized, re-rendering charts...");
        const selectedPollutantOverview = pollutantSelect.property("value");
        const yearForOverviewResize = parseInt(yearSlider.property("value"));
        const dataForOverviewResize = data[yearForOverviewResize]?.[selectedPollutantOverview];
        if (dataForOverviewResize) { updateChart(selectedPollutantOverview, dataForOverviewResize, yearForOverviewResize, false); }
        else { updateChart(selectedPollutantOverview, [], yearForOverviewResize, false); }

        const selectedCountryForCountryView = countrySelect.property("value");
        if (countrySpecificData[selectedCountryForCountryView] && !countryVisualizationContent.classed("hidden")) {
            const countryData = countrySpecificData[selectedCountryForCountryView];
            const selectedCityPollutant = cityPollutantSelect.property("value");
            const pollutantsForEvoResize = lastCheckedPollutants.length > 0 ? lastCheckedPollutants : getSelectedEvolutionPollutants();
            evolutionChartAnimated = false;
            updateCountryMap(selectedCountryForCountryView, countryData, false);
            updatePollutantDistributionChart(selectedCountryForCountryView, countryData, selectedCityPollutant, false);
            updatePollutantEvolutionChart(selectedCountryForCountryView, countryData, pollutantsForEvoResize, currentlySelectedPoint, false);
            updateCityLollipopChart(selectedCountryForCountryView, countryData, selectedCityPollutant, false);
            if(mapInstance) { requestAnimationFrame(() => { if(mapInstance) { mapInstance.invalidateSize({ animate: false }); } }); }
            setupEvolutionChartObserver();
        }

        const selectedEVCountry1 = evCountrySelect1.property("value");
        const selectedEVCountry2 = evCountrySelect2.property("value");
        if (selectedEVCountry1 || (selectedEVCountry2 && selectedEVCountry2 !== "none")) {
             drawEVAirQualityCorrelationChart(false);
        }

        if (europeHeatmap && europeHeatmap.invalidateSize) {
            europeHeatmap.invalidateSize();
        }
    }, 250));
}

document.addEventListener("DOMContentLoaded", () => {
    let leafletCoreLoaded = typeof L !== 'undefined';
    let leafletHeatLoaded = leafletCoreLoaded && typeof L.heatLayer !== 'undefined';
    let d3Loaded = typeof d3 !== 'undefined';

    if (!d3Loaded) {
        console.error("D3.js library not loaded before DOMContentLoaded! Many features will not work.");
        const barChartContainer = document.getElementById("bar-chart-container");
        const countryVizContent = document.getElementById("country-visualization-content");
        const evChartContainer = document.getElementById("ev-air-quality-chart-container");
        if (barChartContainer) barChartContainer.innerHTML = '<p class="placeholder-text error-text">Data visualization library (D3.js) not loaded.</p>';
        if (countryVizContent) countryVizContent.innerHTML = '<p class="placeholder-text error-text">Data visualization library (D3.js) not loaded.</p>';
        if (evChartContainer) evChartContainer.innerHTML = '<p class="placeholder-text error-text">Data visualization library (D3.js) not loaded.</p>';
    }


    if (!leafletCoreLoaded) {
        console.error("LEAFLET CORE (L) IS UNDEFINED AT DOMCONTENTLOADED!");
        const countryMapNode = document.getElementById("country-map");
        const heatmapNode = document.getElementById("heatmap-container-europe");
        const legendNode = document.getElementById("heatmap-legend-europe");

        if (countryMapNode) countryMapNode.innerHTML = '<p class="placeholder-text error-text">Core Map library (Leaflet) not loaded.</p>';
        if (heatmapNode) heatmapNode.innerHTML = '<p class="placeholder-text error-text">Core Map library (Leaflet) not loaded. Heatmap failed.</p>';
        if (legendNode) legendNode.innerHTML = '<p class="error-text" style="text-align:center; font-size:0.9em;">Legend failed.</p>';
    } else if (!leafletHeatLoaded && d3Loaded) {
        console.warn("LEAFLET.HEAT (L.heatLayer) IS UNDEFINED AT DOMCONTENTLOADED! Heatmap functionality will be affected.");
        const heatmapNode = d3Loaded ? d3.select("#heatmap-container-europe").node() : document.getElementById("heatmap-container-europe");
        const legendNode = d3Loaded ? d3.select("#heatmap-legend-europe").node() : document.getElementById("heatmap-legend-europe");

        if (heatmapNode) heatmapNode.innerHTML = '<p class="placeholder-text error-text">Heatmap plugin (Leaflet.heat) not loaded. Heatmap functionality is disabled.</p>';
        if (legendNode) legendNode.innerHTML = '<p class="error-text" style="text-align:center; font-size:0.9em;">Legend unavailable (plugin error).</p>';
    }

    if (d3Loaded) {
        initializeDashboard();
    } else {
        console.error("Dashboard initialization skipped due to missing D3.js.");
    }
});