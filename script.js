let allData = [];

// Function to load JSON data
async function loadData() {
    try {
        const response = await fetch('/data/highered.json'); // Update the path if necessary
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

    // Filter out null values and then map to salaries
    const salaries = filteredData.filter(d => d.salary != null).map(d => d.salary);

    // Log to see if filtering is correct
    console.log("Filtered data:", filteredData);
    console.log("Salaries:", salaries);

    if (salaries.length > 0) {
        const minSalary = Math.min(...salaries);
        const maxSalary = Math.max(...salaries);

        // Update the text content of the min and max salary elements
        document.getElementById('min-salary').textContent = minSalary;
        document.getElementById('max-salary').textContent = maxSalary;
    } else {
        document.getElementById('min-salary').textContent = 'N/A';
        document.getElementById('max-salary').textContent = 'N/A';
    }
}

// Load data when the page loads
window.addEventListener('DOMContentLoaded', (event) => {
    loadData();
});
