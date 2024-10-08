let processes = [];
let processId = 1;
let algorithm = '';

const algorithmButtons = document.querySelectorAll('.algorithmBtn');
const inputForm = document.getElementById('inputForm');
const algorithmNameDisplay = document.getElementById('algorithmName');
const priorityField = document.getElementById('priorityField');
const timeQuantumField = document.getElementById('timeQuantumField');
const processListTable = document.getElementById('processList');
const processTableDiv = document.getElementById('processTable');
const ganttChartDiv = document.getElementById('ganttChart');
const metricsDiv = document.getElementById('metrics');
const resultsTable = document.getElementById('results');
const ganttCanvas = document.getElementById('ganttCanvas');

let highestPriority = 0;
let lowestPriority = 0;

// Add event listener to each algorithm button
algorithmButtons.forEach(button => {
    button.addEventListener('click', function () {
        algorithm = this.dataset.algorithm;
        inputForm.classList.remove('hidden');
        algorithmNameDisplay.innerText = this.innerText;

        if (algorithm === 'priorityNonPreemptive' || algorithm === 'priorityPreemptive') {
            highestPriority = parseInt(prompt("Enter the highest priority value (lower number means higher priority):"));
            lowestPriority = parseInt(prompt("Enter the lowest priority value (higher number means lower priority):"));
            priorityField.classList.remove('hidden');
        } else {
            priorityField.classList.add('hidden');
        }

        timeQuantumField.classList.toggle('hidden', algorithm !== 'roundRobin');
    });
});

// Add process logic
document.getElementById('addProcessBtn').addEventListener('click', () => {
    const arrivalTime = parseInt(document.getElementById('arrivalTime').value);
    const burstTime = parseInt(document.getElementById('burstTime').value);
    const priority = parseInt(document.getElementById('priority').value) || 0;

    const process = {
        id: processId++,
        arrivalTime,
        burstTime,
        priority,
        completionTime: 0,
        turnaroundTime: 0,
        waitingTime: 0,
        responseTime: 0
    };

    processes.push(process);
    updateProcessTable();
    document.getElementById('processForm').reset();
});

// Update process table function
function updateProcessTable() {
    processListTable.innerHTML = '';
    processes.forEach(process => {
        const row = `<tr>
                        <td>${process.id}</td>
                        <td>${process.arrivalTime}</td>
                        <td>${process.burstTime}</td>
                        <td>${process.priority}</td>
                        <td><button class="removeBtn" data-id="${process.id}">Remove</button></td>
                     </tr>`;
        processListTable.innerHTML += row;
    });
    processTableDiv.classList.remove('hidden');
    addRemoveEventListeners();
}

// Function to add event listeners to remove buttons
function addRemoveEventListeners() {
    const removeButtons = document.querySelectorAll('.removeBtn');
    removeButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const id = parseInt(e.target.dataset.id);
            processes = processes.filter(process => process.id !== id);
            updateProcessTable();
        });
    });
}

// Generate Gantt chart and performance metrics
document.getElementById('generateBtn').addEventListener('click', () => {
    let currentTime = 0;
    let waitingTimes = [];
    let turnaroundTimes = [];
    let responseTimes = [];
    let completionTimes = [];
    let ganttSteps = [];
    let readyQueue = [];
    let priorityQueue = [];

    // Sort processes by arrival time (FCFS logic for simplicity)
    processes.sort((a, b) => a.arrivalTime - b.arrivalTime);

    processes.forEach((process, index) => {
        // Response time: first time the process gets the CPU
        if (currentTime < process.arrivalTime) {
            currentTime = process.arrivalTime;
        }
        if (process.responseTime === 0) {
            process.responseTime = currentTime - process.arrivalTime;
        }

        process.completionTime = currentTime + process.burstTime;
        process.turnaroundTime = process.completionTime - process.arrivalTime;
        process.waitingTime = process.turnaroundTime - process.burstTime;

        waitingTimes.push(process.waitingTime);
        turnaroundTimes.push(process.turnaroundTime);
        responseTimes.push(process.responseTime);
        completionTimes.push(process.completionTime);

        // Save Gantt chart step
        ganttSteps.push({
            process: `P${process.id}`,
            start: currentTime,
            end: currentTime + process.burstTime,
            readyQueue: [...readyQueue],
            priorityQueue: [...priorityQueue]
        });

        // Update ready queue and priority queue if applicable
        readyQueue.push(`P${process.id}`);
        if (algorithm === 'priorityNonPreemptive' || algorithm === 'priorityPreemptive') {
            priorityQueue.push(`P${process.id} (Priority: ${process.priority})`);
        }

        currentTime += process.burstTime;
    });

    updateMetricsTable();
    updateGanttChart(ganttSteps);
});

// Function to update metrics table
function updateMetricsTable() {
    resultsTable.innerHTML = '';
    let totalWaitingTime = 0;
    let totalTurnaroundTime = 0;

    processes.forEach(process => {
        totalWaitingTime += process.waitingTime;
        totalTurnaroundTime += process.turnaroundTime;

        const row = `<tr>
                        <td>${process.id}</td>
                        <td>${process.arrivalTime}</td>
                        <td>${process.burstTime}</td>
                        <td>${process.completionTime}</td>
                        <td>${process.turnaroundTime}</td>
                        <td>${process.waitingTime}</td>
                        <td>${process.responseTime}</td>
                    </tr>`;
        resultsTable.innerHTML += row;
    });

    const avgWaitingTime = totalWaitingTime / processes.length;
    const avgTurnaroundTime = totalTurnaroundTime / processes.length;

    const avgRow = `<tr>
                        <td colspan="4"><strong>Average</strong></td>
                        <td><strong>${avgTurnaroundTime.toFixed(2)}</strong></td>
                        <td><strong>${avgWaitingTime.toFixed(2)}</strong></td>
                        <td></td>
                    </tr>`;
    resultsTable.innerHTML += avgRow;
    metricsDiv.classList.remove('hidden');
}

// Function to update Gantt chart
function updateGanttChart(ganttSteps) {
    const chartData = {
        labels: ganttSteps.map(step => step.process),
        datasets: [{
            label: 'Gantt Chart',
            data: ganttSteps.map(step => ({ x: step.process, y: [step.start, step.end] })),
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
        }]
    };

    const chartOptions = {
        type: 'bar',
        data: chartData,
        options: {
            scales: {
                x: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Processes'
                    }
                },
                y: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Time'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: ${context.raw.y[0]} - ${context.raw.y[1]}`;
                        }
                    }
                }
            }
        }
    };

    if (ganttCanvas.chart) {
        ganttCanvas.chart.destroy();
    }

    // Generate the entire Gantt chart at once
    ganttCanvas.chart = new Chart(ganttCanvas, chartOptions);

    ganttChartDiv.classList.remove('hidden');
}
