// File: pollutantPlots.js
// Description: This file contains the code for the pollutants' plots (Bar plots, Timelapse, Pollutant info)

import { pollutantInfo } from './pollutantInfo.js';
import { availableCountries } from './countries.js';
import { loadAndTransformData } from './loadData.js';

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

let initialChartWidth = 600;
try { 
    initialChartWidth = parseInt(d3.select("#bar-chart-container").style("width")) || 600; 
} catch (e) { 
    console.warn("Could not parse overview chart container width.") 
}
let currentChartWidth = initialChartWidth; 

let initialChartHeight = initialChartWidth > 0 ? initialChartWidth * 0.65 : 450;
let currentChartHeight = initialChartHeight;

const margin = { top: 30, right: 50, bottom: 75, left: 120 };
function getInnerDimensions(currentWidth, currentHeight) { 
    return { 
        innerWidth: Math.max(10, currentWidth - margin.left - margin.right), innerHeight: Math.max(10, currentHeight - margin.top - margin.bottom) 
    }; 
}
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
const years = Array.from({ length: 2023 - 2013 + 1 }, (_, i) => 2013 + i);
let timelapseInterval = null; 
let currentYearIndex = 0; 
const timelapseSpeed = 1500; 
let currentPollutant = null;
let currentDisplayYear = years[0];
let isPlaying = false;

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

    console.log(`Updating chart for ${pollutantKey} in ${year}`, validData);

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

    console.log(`Updated chart for ${pollutantKey} in ${year}`);
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
    stopTimelapse(); if (pollutantKey) { currentPollutant = pollutantKey; } else if (!currentPollutant) { console.error("Cannot start timelapse."); return; }
    isPlaying = true; playPauseButton.attr("aria-label", "Pause timelapse").select("i").attr("class", "fas fa-pause");
    runTimelapseStep(); timelapseInterval = setInterval(runTimelapseStep, timelapseSpeed);
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

export {
    updateChart,
    updatePollutantInfo,
    startTimelapse,
    stopTimelapse,
    togglePlayPause,
    handleMouseOver,
    handleMouseOut
};