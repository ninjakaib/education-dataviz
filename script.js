let allData = [];

// Function to load JSON data
async function loadData() {
    try {
        const response = await fetch('data/highered.json'); // Update the path if necessary
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
            .attr("fill", "#526D82")
            .on("mouseover", function(event, d) {
                // Show the count when hovering

                d3.select(this).attr('fill', '#27374D');
                const xPos = x.bandwidth() / 2 + parseFloat(d3.select(this).attr("x"));
                const yPos = y(d);
                chart.append("text")
                    .attr("id", "tooltip")
                    .attr("x", xPos)
                    .attr("y", yPos - 10)
                    .attr("text-anchor", "middle")
                    .style("font-size", "12px")
                    // .style("fill", "#000")
                    .text(`Count: ${d}`);
            })
            .on("mouseout", function() {
                // Revert the bar color and remove the tooltip
                d3.select(this).attr('fill', '#526D82');
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
        .attr("y", height + margin.top + 60) // Move the label closer to the axis
        .text("Salary")
        .style("font-size","16px");

    // Add y-axis label
    svg.append("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .attr("y", margin.left / 4) // Adjusted position
        .attr("x", -margin.top - height / 2 + 20)
        .text("Count");
}

function calculateJobCounts(filteredData) {
    let jobCounts = {};
    filteredData.forEach(d => {
        if (d.job != null) {
            jobCounts[d.job] = (jobCounts[d.job] || 0) + 1;
        }
    });
    return jobCounts;
}

function calculateEmployedCounts(filteredData) {
    let employedStatus = {};
    filteredData.forEach(d => {
        if (d.status != null) {
            employedStatus[d.status] = (employedStatus[d.status] || 0) + 1;
        }
    });
    return employedStatus;
}

function drawBubbleChart(jobCounts) {
    // Convert jobCounts object to array format suitable for D3
    const data = Object.keys(jobCounts).map((job, index) => ({
      id: job,
      value: jobCounts[job]
    }));
  
    // Dimensions of the chart
    const width = 928;
    const height = width;
    const padding = 40;
  
    // Create the pack layout
    const pack = d3.pack()
      .size([width - 2, height - 2])
      .padding(4);
  
    // Compute the hierarchy from the data and apply the pack layout
    const root = pack(d3.hierarchy({ children: data }).sum(d => d.value));
  
    // Create a unique color scale
    const colorScale = d3.scaleOrdinal()
      .domain(data.map(d => d.id))
      .range(["#274847", "#274249", "#27374D", "#93AA88", "#5D7C67", "#274D45"]);
  
    // Select the SVG container and set attributes
    const svg = d3.select('#bubbleChart')
      .attr('width', width)
      .attr('height', height)
      .attr("text-anchor", "middle");
  
    // Clear any previous SVG contents
    svg.selectAll("*").remove();
  
  
    // Place each node (leaf) according to the layout’s x and y values
    const node = svg.selectAll("g")
      .data(root.leaves())
      .enter();


    
    // Add a filled circle for each node
    node.append("circle")
        .attr("class", "circle")
        .attr("r", function(d){ return d.r; })
        .attr("cx", function(d){ return d.x; })
        .attr("cy", function(d){ return d.y; })
        .attr("fill-opacity", 0.7)
        .attr("fill", d => colorScale(d.data.id))
        .attr("r", d => d.r);
  
    // Add labels to each node, scaling the font size
    node.append("text")
        .attr("x", function(d) {
            return d.x;
          })
        .attr("y", function(d, i, nodes) {
            return d.y + 4;
          })
        .attr("text-anchor", "middle")
        .attr("font-size", function(d, i, nodes) {
            if (d.r <=26){
                return 0; // don't show text for very small bubbles
            }
            else {
                return Math.max(10, d.r / 8);
            }

        }
        )
        .text(function(d) {
            return d.data["id"];
          })
        .style("fill", "#27323F")
        .each(wrap);// Wrap text to avoid spilling over the bubble
  
    function wrap(d){
        var text = d3.select(this),
        width = d.r * 2,
        x = d.x,
        y = d.y,
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1.1,
        tspan = text.text(null).append("tspan").attr("x", x).attr("y", y);
        while (word = words.pop()) {
        line.push(word);
        tspan.text(line.join(" "));
        if (tspan.node().getComputedTextLength() > width) {
            line.pop();
            tspan.text(line.join(" "));
            line = [word];
            tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + "em").text(word);
        }}
    };


    // Add tooltip functionality on mouseover
    // node.on("mouseover", function(event, d) {
    //   d3.select(this).select('circle').attr('stroke', 'black');
    //   svg.append("text")
    //     .attr("id", "tooltip")
    //     .attr("x", event.pageX)
    //     .attr("y", event.pageY - 10)
    //     .attr("text-anchor", "middle")
    //     .text(`${d.data.id}: ${d.data.value}`);
    // })
    // .on("mouseout", function() {
    //   d3.select(this).select('circle').attr('stroke', null);
    //   d3.select("#tooltip").remove();
    // });
  }



function drawPieChart(data) {
    const svg = d3.select('#pieChart');
    const width = +svg.attr('width');
    const height = +svg.attr('height');
    const radius = Math.min(width, height) / 2;

    // Create a pie chart layout
    const pie = d3.pie().value(d => d.value);

    // Create an arc generator
    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);

    // Generate pie chart data
    const pieData = pie(Object.entries(data).map(([category, value]) => ({ category, value })));

    // Create a group element for the pie chart
    const chart = svg.append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

    // Append the arcs for the pie chart
    const arcs = chart.selectAll('.arc')
        .data(pieData)
        .enter().append('g')
            .attr('class', 'arc')
            .style('opacity', 1) // Set initial opacity to 1

    arcs.append('path')
        .attr('d', arc)
        .attr('fill', (d, i) => ["#3a5273", "#3e7275", "#93aa88"][i])
        .attr('stroke', "#27323F") // Set initial stroke color to black
        .attr('stroke-width', 2) // Set initial stroke width
        .on('mouseover', function (event, d) {
            // Highlight the hovered arc
            d3.select(this)
                .transition()
                .style('opacity', 0.5)
                .attr('stroke-width', 4)
                .attr('stroke', 'black'); // Change stroke color

            // Show tooltip
            const tooltip = d3.select('#tooltip');
            tooltip.transition()
                .duration(200)
                .style('opacity', 0.9);

            // Set tooltip content
            tooltip.html(`${d.data.category}: ${d.data.value}`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 20) + 'px');
        })
        .on('mousemove', function (event) {
            // Move tooltip smoothly with the mouse
            d3.select('#tooltip')
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 20) + 'px');
        })
        .on('mouseout', function () {
            // Restore the opacity and stroke of all arcs on mouseout
            d3.select(this)
                .transition()
                .style('opacity', 1)
                .attr('stroke-width', 2)
                .attr('stroke', '#27323F');

            // Hide tooltip
            d3.select('#tooltip')
                .transition()
                .duration(500)
                .style('opacity', 0);
        });

    // Add category names and percentages as text labels for larger slices
    arcs.filter(d => d.endAngle - d.startAngle > 0.2) // Only show labels for slices larger than 0.2 radians
        .append('text')
            .attr('transform', d => `translate(${arc.centroid(d)}) rotate(${(d.startAngle + d.endAngle) * 90 / Math.PI - 90})`)
            .attr('dy', '0.35em') // Adjust vertical alignment
            .attr('text-anchor', 'middle')
            .text(d => `${d.data.category}: ${d3.format('.1%')(d.data.value / d3.sum(Object.values(data)))}`);
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

    const jobCounts = calculateJobCounts(filteredData);

    // Now pass these jobCounts to a function that draws the bubble chart
    drawBubbleChart(jobCounts);

    const employeeCounts = calculateEmployedCounts(filteredData);
    console.log(employeeCounts);
    drawPieChart(employeeCounts);


    console.log("hello");
}

// Load data when the page loads
window.addEventListener('DOMContentLoaded', (event) => {
    loadData();
});
