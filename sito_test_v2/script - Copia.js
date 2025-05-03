const chartWidth = 600;
const chartHeight = 350;
const margin = {
    top: 20,
    right: 30,
    bottom: 60,
    left: 90
}; // Increased bottom margin for better label visibility

const svg = d3.select("#bar-chart")
    .append("svg")
    .attr("width", chartWidth)
    .attr("height", chartHeight);

const x = d3.scaleLinear().range([0, chartWidth - margin.left - margin.right]);
const y = d3.scaleBand().range([0, chartHeight - margin.top - margin.bottom]).padding(0.15);
const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
const tooltip = d3.select("body").append("div").attr("class", "tooltip");

const pollutantInfo = {
    "PM2.5": {
        name: "Fine Particulate Matter (PM2.5)",
        acceptableRange: "0-10 µg/m³ (WHO)",
        healthRisks: "Increased risk of respiratory and cardiovascular diseases, premature mortality.",
        emissionSources: "Combustion of fossil fuels, industrial processes, biomass burning."
    },
    "PM10": {
        name: "Coarse Particulate Matter (PM10)",
        acceptableRange: "0-20 µg/m³ (WHO)",
        healthRisks: "Irritation of the eyes, nose, and throat, respiratory infections, asthma exacerbation.",
        emissionSources: "Crushing and grinding operations, road dust, construction activities."
    },
    "O3": {
        name: "Ozone (O3)",
        acceptableRange: "0-100 µg/m³ (WHO)",
        healthRisks: "Chest pain, coughing, throat irritation, airway inflammation, reduced lung function.",
        emissionSources: "Secondary pollutant formed by reactions of NOx and VOCs in the presence of sunlight."
    },
    "NO2": {
        name: "Nitrogen Dioxide (NO2)",
        acceptableRange: "0-40 µg/m³ (WHO)",
        healthRisks: "Increased susceptibility to respiratory infections, airway inflammation, bronchitis.",
        emissionSources: "Combustion of fossil fuels in vehicles, power plants, and industrial processes."
    },
    "SO2": {
        name: "Sulfur Dioxide (SO2)",
        acceptableRange: "0-20 µg/m³ (WHO)",
        healthRisks: "Irritation of the eyes, nose, and throat, increased risk of respiratory symptoms.",
        emissionSources: "Burning of fossil fuels containing sulfur, industrial processes such as smelting."
    }
    // Add more pollutant information here as needed
};

function updateChart(data) {
    const top5Data = data.slice(0, 5).sort((a, b) => b.Concentrazione - a.Concentrazione);

    x.domain([0, d3.max(top5Data, d => d.Concentrazione)]);
    y.domain(top5Data.map(d => d.Paese));

    const t = d3.transition().duration(750);

    const bars = g.selectAll(".bar").data(top5Data, d => d.Paese);
    bars.exit().transition(t).style("opacity", 0).remove();
    bars.enter().append("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("y", d => y(d.Paese))
        .attr("width", 0)
        .attr("height", y.bandwidth())
        .on("mouseover", function(event, d) {
            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip.html(`<strong>${d.Paese}</strong><br>Concentration: <span class="value">${d.Concentrazione.toFixed(2)} µg/m³</span>`)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 35) + "px");
            // Highlight the hovered bar
            d3.select(this).style("fill", "#f9a825").style("transform", "scaleY(1.1)");
        })
        .on("mouseout", function(d) {
            tooltip.transition().duration(300).style("opacity", 0);
            // Revert the bar's style
            d3.select(this).style("fill", "#4db6ac").style("transform", "scaleY(1)");
        })
        .merge(bars)
        .transition(t)
        .attr("y", d => y(d.Paese))
        .attr("width", d => x(d.Concentrazione));

    const yAxis = g.select(".y-axis");
    if (yAxis.empty()) g.append("g").attr("class", "y-axis").call(d3.axisLeft(y));
    else yAxis.transition(t).call(d3.axisLeft(y));

    const xAxis = g.select(".x-axis");
    const xAxisGenerator = d3.axisBottom(x).ticks(5).tickSizeOuter(0);
    if (xAxis.empty()) {
        g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${chartHeight - margin.top - margin.bottom})`).call(xAxisGenerator).append("text").attr("class", "axis-label").attr("x", (chartWidth - margin.left - margin.right) / 2).attr("y", 40).style("text-anchor", "middle").style("fill", "#546e7a").text("Average Concentration (µg/m³)");
    } else {
        xAxis.transition(t).call(xAxisGenerator);
    }
}

function updatePollutantInfo(pollutant) {
    const info = pollutantInfo[pollutant];
    d3.select("#pollutant-name").text(info ? info.name : "");
    d3.select("#acceptable-range").text(info ? info.acceptableRange : "");
    d3.select("#health-risks").text(info ? info.healthRisks : "");
    d3.select("#emission-sources").text(info ? info.emissionSources : "");
}

// Load data from the JSON file
fetch('air_quality_data.json')
    .then(response => response.json())
    .then(data => {
        const pollutantSelect = d3.select("#pollutant-select");
        const pollutants = Object.keys(data);

        pollutantSelect.selectAll("option")
            .data(pollutants)
            .enter().append("option")
            .attr("value", d => d)
            .text(d => d);

        if (pollutants.length > 0) {
            updateChart(data[pollutants[0]]);
            updatePollutantInfo(pollutants[0]);
        }

        pollutantSelect.on("change", function() {
            const selectedPollutant = d3.select(this).property("value");
            if (data[selectedPollutant]) {
                updateChart(data[selectedPollutant]);
                updatePollutantInfo(selectedPollutant);
            }
        });
    })
    .catch(error => {
        console.error("Error loading air quality data:", error);
    });