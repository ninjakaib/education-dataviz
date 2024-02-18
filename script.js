let allData = [];

// Function to load JSON data
async function loadData() {
    try {
        const response = await fetch('./data/highered.json'); // Update the path if necessary
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        allData = data;
        populateDropdowns(data);
        setupDropdownListeners();
        updateVisualization();
        
    } catch (error) {
        console.error('Could not load data:', error);
    }
}

// Function to populate dropdowns
function populateDropdowns(data) {
    const majors = [...new Set(data.map(item => item.major))].sort();
    const degrees = [...new Set(data.map(item => item.degree))].sort();
    const ethnicities = [...new Set(data.map(item => item.ethnicity))].sort();

    populateDropdown('major-dropdown', majors);
    populateDropdown('degree-dropdown', degrees);
    populateDropdown('ethnicity-dropdown', ethnicities);

    setupDropdownListeners();
}

// Helper function to populate a single dropdown
function populateDropdown(dropdownId, options) {
    const dropdown = document.getElementById(dropdownId);
    
    // Create a placeholder option
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = `Select ${dropdownId.split('-')[0].charAt(0).toUpperCase() + dropdownId.split('-')[0].slice(1)}`; // Capitalize the first letter
    placeholderOption.disabled = true;
    placeholderOption.selected = true;

    // Add the placeholder option as the first option
    dropdown.appendChild(placeholderOption);
    
    options.forEach(option => {
        if (option) { // Check if the option is not an empty string or null
            const optElement = document.createElement('option');
            optElement.value = option;
            optElement.textContent = option;
            dropdown.appendChild(optElement);
        }
    });
}


function setupDropdownListeners() {
    document.getElementById('major-dropdown').addEventListener('change', updateVisualization);
    document.getElementById('degree-dropdown').addEventListener('change', updateVisualization);
    document.getElementById('ethnicity-dropdown').addEventListener('change', updateVisualization);
}

function updateRecordCount(filteredData) {
    const countElement = document.getElementById('record-count');
    countElement.textContent = filteredData.length;
}

function calculateBinCounts(filteredData) {
    let binCounts = new Array(16).fill(0);
    filteredData.forEach(d => {
        if (d.salary != null) {
            if (d.salary >= 150000) {
                // All salaries of 150k and above
                binCounts[15]++;
            } else {
                // Salaries from 0 to 149k
                binCounts[Math.floor(d.salary / 10000)]++;
            }
        }
    });
    return binCounts;
}

function drawHistogram(binCounts) {
    const svg = d3.select('#salaryHistogram');
    const margin = { top: 10, right: 30, bottom: 70, left: 60 }; // Adjusted margins
    const width = +svg.attr('width') - margin.left - margin.right;
    const height = +svg.attr('height') - margin.top - margin.bottom;
    const barPadding = 0.1;

    // Clear any previous SVG contents
    svg.selectAll("*").remove();

    // Create a group element for appending chart elements
    const chart = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create the x scale
    const x = d3.scaleBand()
        .range([0, width])
        .domain(binCounts.map((_, i) => i === binCounts.length - 1 ? '150k+' : `${i * 10}k - ${(i + 1) * 10}k`)) // Adjusted domain for last label
        .padding(barPadding);

    // Create the y scale
    const y = d3.scaleLinear()
        .range([height, 0])
        .domain([0, d3.max(binCounts)]);

    // Append the rectangles for the bar chart
    chart.selectAll(".bar")
        .data(binCounts)
        .enter().append("rect")
            .attr("class", "bar")
            .attr("x", (d, i) => x(i === binCounts.length - 1 ? '150k+' : `${i * 10}k - ${(i + 1) * 10}k`))
            .attr("y", d => y(d))
            .attr("width", x.bandwidth())
            .attr("height", d => height - y(d))
            .attr("fill", "#69b3a2")
            .on("mouseover", function(event, d) {
                // Show the count when hovering
                d3.select(this).attr('fill', '#2171b5');
                const xPos = x.bandwidth() / 2 + parseFloat(d3.select(this).attr("x"));
                const yPos = y(d);
                chart.append("text")
                    .attr("id", "tooltip")
                    .attr("x", xPos)
                    .attr("y", yPos - 10)
                    .attr("text-anchor", "middle")
                    .text(`Count: ${d}`);
            })
            .on("mouseout", function() {
                // Revert the bar color and remove the tooltip
                d3.select(this).attr('fill', '#69b3a2');
                chart.select("#tooltip").remove();
            });

    // Add the x-axis
    chart.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
            .attr("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-40)"); // Rotate the labels to prevent overlap

    // Add the y-axis
    chart.append("g")
        .call(d3.axisLeft(y));

    // Add x-axis label
    svg.append("text")
        .attr("text-anchor", "end")
        .attr("x", width / 2 + margin.left)
        .attr("y", height + margin.top + 50) // Move the label closer to the axis
        .text("Salary");

    // Add y-axis label
    svg.append("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .attr("y", margin.left / 4) // Adjusted position
        .attr("x", -margin.top - height / 2 + 20)
        .text("Count");
}




function updateVisualization() {
    const selectedMajor = document.getElementById('major-dropdown').value;
    const selectedDegree = document.getElementById('degree-dropdown').value;
    const selectedEthnicity = document.getElementById('ethnicity-dropdown').value;

    // Log selected values to ensure they are captured correctly
    console.log("Selected Major:", selectedMajor);
    console.log("Selected Degree:", selectedDegree);
    console.log("Selected Ethnicity:", selectedEthnicity);

    const filteredData = allData.filter(d =>
        (selectedMajor === '' || (d.major && d.major === selectedMajor)) &&
        (selectedDegree === '' || (d.degree && d.degree === selectedDegree)) &&
        (selectedEthnicity === '' || (d.ethnicity && d.ethnicity === selectedEthnicity))
    );

    updateRecordCount(filteredData);

    // Filter out null values and then map to salaries
    const salaries = filteredData.filter(d => d.salary != null).map(d => d.salary);

    // Log to see if filtering is correct
    console.log("Filtered data:", filteredData);
    console.log("Salaries:", salaries);

    const binCounts = calculateBinCounts(filteredData);

    // Now pass these binCounts to a function that draws the histogram
    drawHistogram(binCounts);
}

// Load data when the page loads
window.addEventListener('DOMContentLoaded', (event) => {
    loadData();
});
