// Professional color palette for jobs
const jobColors = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e',
    '#f97316', '#eab308', '#10b981', '#14b8a6',
    '#06b6d4', '#0ea5e9', '#6366f1', '#a855f7'
];

// State management
let appState = {
    numMachines: 3,
    numJobs: 5,
    matrix: null,
    bestSolution: null,
    allSolutions: []
};

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
    // Modal button listeners
    document.getElementById('decreaseMachines').addEventListener('click', () => {
        const input = document.getElementById('numMachines');
        if (input.value > 2) input.value = parseInt(input.value) - 1;
        updateCombinationCount();
    });
    
    document.getElementById('increaseMachines').addEventListener('click', () => {
        const input = document.getElementById('numMachines');
        if (input.value < 10) input.value = parseInt(input.value) + 1;
        updateCombinationCount();
    });
    
    document.getElementById('decreaseJobs').addEventListener('click', () => {
        const input = document.getElementById('numJobs');
        if (input.value > 2) input.value = parseInt(input.value) - 1;
        updateCombinationCount();
    });
    
    document.getElementById('increaseJobs').addEventListener('click', () => {
        const input = document.getElementById('numJobs');
        if (input.value < 15) input.value = parseInt(input.value) + 1;
        updateCombinationCount();
    });
    
    // Generate button from modal
    document.getElementById('generateBtn').addEventListener('click', () => {
        updateMatrixDisplay();
    });
    
    // Calculate button
    document.getElementById('calculateBtn').addEventListener('click', calculateCDS);
    
    // Generate initial matrix
    updateMatrixDisplay();
    updateCombinationCount();
});

function updateCombinationCount() {
    const machines = parseInt(document.getElementById('numMachines').value);
    const jobs = parseInt(document.getElementById('numJobs').value);
    const combinations = Math.factorial(jobs);
    document.getElementById('combinationCount').textContent = combinations.toLocaleString();
}

Math.factorial = function(n) {
    if (n < 0) return -1;
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
};

// ============ MATRIX GENERATION ============
function updateMatrixDisplay() {
    appState.numMachines = parseInt(document.getElementById('numMachines').value);
    appState.numJobs = parseInt(document.getElementById('numJobs').value);
    
    const container = document.getElementById('matrixContainer');
    let html = `
        <table class="matrix-table">
            <thead>
                <tr>
                    <th>Tâche ⧵ Machine</th>
    `;
    
    for (let m = 1; m <= appState.numMachines; m++) {
        html += `<th>M${m}</th>`;
    }
    
    html += `</tr></thead><tbody>`;
    
    for (let j = 1; j <= appState.numJobs; j++) {
        html += `<tr><td><strong>Tâche ${j}</strong></td>`;
        for (let m = 1; m <= appState.numMachines; m++) {
            const value = Math.floor(Math.random() * 40) + 5;
            html += `
                <td>
                    <input 
                        type="number" 
                        min="1" 
                        value="${value}" 
                        data-job="${j}" 
                        data-machine="${m}"
                        class="matrix-input"
                    >
                </td>
            `;
        }
        html += `</tr>`;
    }
    
    html += `</tbody></table>`;
    container.innerHTML = html;
}

function getMatrixData() {
    const inputs = document.querySelectorAll('.matrix-input');
    const matrix = Array(appState.numJobs + 1).fill(null).map(() => Array(appState.numMachines + 1).fill(0));
    
    inputs.forEach(input => {
        const job = parseInt(input.dataset.job);
        const machine = parseInt(input.dataset.machine);
        matrix[job][machine] = parseInt(input.value) || 0;
    });
    
    return matrix;
}

// ============ CDS ALGORITHM ============
function calculateCDS() {
    appState.matrix = getMatrixData();
    appState.allSolutions = [];
    appState.bestSolution = null;
    
    let bestMakespan = Infinity;
    
    // Show loading state
    showResultsLoading();
    
    // Perform CDS iterations
    for (let k = 1; k < appState.numMachines; k++) {
        // Create virtual 2-machine problem
        const A = Array(appState.numJobs + 1).fill(0);
        const B = Array(appState.numJobs + 1).fill(0);
        
        for (let j = 1; j <= appState.numJobs; j++) {
            for (let m = 1; m <= k; m++) {
                A[j] += appState.matrix[j][m];
            }
            for (let m = k + 1; m < appState.numMachines; m++) {
                B[j] += appState.matrix[j][m];
            }
        }
        
        // Apply Johnson's rule
        const order = johnsonRule(A, B, appState.numJobs);
        
        // Calculate makespan
        const {makespan, completion} = calculateMakespan(order, appState.matrix, appState.numMachines);
        
        const solution = {
            iteration: k,
            order,
            makespan,
            completion,
            A,
            B
        };
        
        appState.allSolutions.push(solution);
        
        if (makespan < bestMakespan) {
            bestMakespan = makespan;
            appState.bestSolution = solution;
        }
    }
    
    // Display results
    displayResults();
}

// ============ JOHNSON'S RULE ============
function johnsonRule(A, B, n) {
    const left = [];
    const right = [];
    const remaining = new Set();
    
    for (let i = 1; i <= n; i++) {
        remaining.add(i);
    }
    
    while (remaining.size > 0) {
        let minA = Infinity, minB = Infinity;
        let jobA = null, jobB = null;
        
        for (let j of remaining) {
            if (A[j] < minA) {
                minA = A[j];
                jobA = j;
            }
            if (B[j] < minB) {
                minB = B[j];
                jobB = j;
            }
        }
        
        if (minA <= minB && jobA !== null) {
            left.push(jobA);
            remaining.delete(jobA);
        } else if (jobB !== null) {
            right.unshift(jobB);
            remaining.delete(jobB);
        }
    }
    
    return [...left, ...right];
}

// ============ MAKESPAN CALCULATION ============
function calculateMakespan(order, matrix, numMachines) {
    const completion = Array(order.length + 1).fill(null).map(() => Array(numMachines + 1).fill(0));
    
    for (let i = 1; i <= order.length; i++) {
        const job = order[i - 1];
        for (let m = 1; m <= numMachines; m++) {
            completion[i][m] = Math.max(
                completion[i - 1][m] || 0,
                completion[i][m - 1] || 0
            ) + (matrix[job][m] || 0);
        }
    }
    
    const makespan = completion[order.length][numMachines];
    return {makespan, completion};
}

// ============ RESULTS DISPLAY ============
function showResultsLoading() {
    document.getElementById('resultsSection').style.display = 'block';
    document.getElementById('iterationsContainer').innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
            <div class="empty-state-icon">⏳</div>
            <div class="empty-state-text">Calcul en cours...</div>
        </div>
    `;
}

function displayResults() {
    const section = document.getElementById('resultsSection');
    section.style.display = 'block';
    
    // Display all iterations
    const iterationsHtml = appState.allSolutions.map(solution => {
        const isBest = solution === appState.bestSolution;
        const sequenceStr = solution.order.map(j => `T${j}`).join(' → ');
        
        return `
            <div class="iteration-card ${isBest ? 'best' : ''}">
                <div class="iteration-header">
                    <div>
                        <div class="iteration-label">Itération K</div>
                        <div class="iteration-value">${solution.iteration}</div>
                    </div>
                    ${isBest ? '<div style="color: var(--success-color); font-size: 1.5rem;">⭐</div>' : ''}
                </div>
                <div class="iteration-sequence">${sequenceStr}</div>
                <div class="iteration-makespan">
                    <div class="makespan-item">
                        <div class="makespan-label">Durée Totale</div>
                        <div class="makespan-value">${solution.makespan}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('iterationsContainer').innerHTML = iterationsHtml;
    
    // Display best solution banner
    if (appState.bestSolution) {
        const best = appState.bestSolution;
        const sequenceStr = best.order.map((j, idx) => `Tâche ${j}`).join(' → ');
        
        const bannerHtml = `
            <div class="best-solution">
                <div class="best-solution-header">
                    <span style="font-size: 2rem;">🏆</span>
                    <div class="best-solution-title">Meilleure Solution Trouvée</div>
                </div>
                <div class="best-solution-details">
                    <div class="solution-detail">
                        <div class="solution-detail-label">Itération Optimale</div>
                        <div class="solution-detail-value">K = ${best.iteration}</div>
                    </div>
                    <div class="solution-detail">
                        <div class="solution-detail-label">Durée Totale (Cmax)</div>
                        <div class="solution-detail-value">${best.makespan} unités</div>
                    </div>
                    <div class="solution-detail" style="grid-column: 1 / -1;">
                        <div class="solution-detail-label">Séquence Optimale</div>
                        <div class="solution-detail-value" style="font-size: 1rem; word-break: break-word;">${sequenceStr}</div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('bestSolutionContainer').innerHTML = bannerHtml;
        
        // Display Gantt chart
        displayGanttChart(best);
    }
}

// ============ GANTT CHART ============
function displayGanttChart(solution) {
    const ganttSection = document.getElementById('ganttSection');
    ganttSection.style.display = 'block';
    
    // Generate legend
    let legendHtml = '<div class="legend-grid">';
    for (let j = 1; j <= appState.numJobs; j++) {
        legendHtml += `
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${jobColors[j % jobColors.length]};"></div>
                <div class="legend-label">Tâche ${j}</div>
            </div>
        `;
    }
    legendHtml += '</div>';
    document.getElementById('legend').innerHTML = legendHtml;
    
    // Generate Gantt chart with professional styling
    let ganttHtml = '<div class="gantt-container">';
    const maxTime = solution.makespan;
    const pixelsPerUnit = Math.max(400 / maxTime, 12);
    
    // Header with time scale
    ganttHtml += `<div class="gantt-header">
        <div class="gantt-machine-col-header">Machine / Ressource</div>
        <div class="gantt-timeline-header" style="width: ${maxTime * pixelsPerUnit + 40}px;">
            <div class="time-scale">`;
    
    const timeStep = Math.ceil(maxTime / 12);
    for (let t = 0; t <= maxTime; t += timeStep) {
        ganttHtml += `<div class="time-marker" style="left: ${t * pixelsPerUnit}px;"><span>${t}</span></div>`;
    }
    ganttHtml += `</div>
            <div class="grid-lines" style="width: ${maxTime * pixelsPerUnit + 20}px;">`;
    
    for (let t = 0; t <= maxTime; t += timeStep) {
        ganttHtml += `<div class="grid-line" style="left: ${t * pixelsPerUnit}px;"></div>`;
    }
    ganttHtml += '</div></div></div>';
    
    // Machine rows with utilization
    const machineMetrics = calculateTFRTAR(solution);
    
    for (let m = 1; m <= appState.numMachines; m++) {
        const metrics = machineMetrics.machineMetrics.find(mm => mm.machine === m);
        const utilizationPercent = parseFloat(metrics.tfr);
        
        ganttHtml += `
            <div class="gantt-machine">
                <div class="machine-label">
                    <div class="machine-name">Machine ${m}</div>
                    <div class="machine-util" title="Utilisation de la Machine">
                        <div class="util-bar" style="width: ${utilizationPercent}%;"></div>
                    </div>
                    <div class="machine-stat">${utilizationPercent.toFixed(1)}%</div>
                </div>
                <div class="machine-timeline" style="width: ${maxTime * pixelsPerUnit + 40}px;">
                    <div class="timeline-background"></div>
        `;
        
        // Task blocks for this machine
        for (let i = 1; i <= solution.order.length; i++) {
            const job = solution.order[i - 1];
            const startTime = i === 1 ? 0 : solution.completion[i - 1][m];
            const endTime = solution.completion[i][m];
            const duration = endTime - startTime;
            
            const left = startTime * pixelsPerUnit;
            const width = Math.max(duration * pixelsPerUnit, 35);
            const color = jobColors[job % jobColors.length];
            
            ganttHtml += `
                <div class="task-block" 
                    style="
                        left: ${left}px; 
                        width: ${width}px; 
                        background: linear-gradient(135deg, ${color}, ${adjustColor(color, 20)});
                    "
                    data-tooltip="Tâche ${job} | ${startTime} - ${endTime} | Δ${duration}"
                >
                    <div class="task-content">
                        <div class="task-label">T${job}</div>
                        ${duration > 12 ? `<div class="task-duration">${duration}h</div>` : ''}
                    </div>
                </div>
            `;
        }
        
        ganttHtml += '</div></div>';
    }
    
    ganttHtml += '</div>';
    document.getElementById('ganttChart').innerHTML = ganttHtml;
    
    // Display TFR/TAR metrics
    displayTFRTAR(solution);
}

// ============ TFR/TAR CALCULATIONS ============
function calculateTFRTAR(solution) {
    const machineIdleTimes = Array(appState.numMachines + 1).fill(0);
    const machineWorkTimes = Array(appState.numMachines + 1).fill(0);
    
    // Calculate work and idle times for each machine
    for (let m = 1; m <= appState.numMachines; m++) {
        let previousEndTime = 0;
        
        for (let i = 1; i <= solution.order.length; i++) {
            const job = solution.order[i - 1];
            const processingTime = appState.matrix[job][m];
            
            if (i === 1) {
                // First job
                machineIdleTimes[m] += 0; // No idle time
                machineWorkTimes[m] += processingTime;
                previousEndTime = processingTime;
            } else {
                const previousCompletion = solution.completion[i - 1][m];
                const currentStart = previousCompletion;
                const currentEnd = previousCompletion + processingTime;
                
                // Add idle time between jobs
                machineIdleTimes[m] += Math.max(0, currentStart - previousEndTime);
                machineWorkTimes[m] += processingTime;
                previousEndTime = currentEnd;
            }
        }
    }
    
    // Calculate TFR and TAR for each machine
    const machineMetrics = [];
    for (let m = 1; m <= appState.numMachines; m++) {
        const totalTime = solution.makespan;
        const tfr = totalTime > 0 ? ((machineWorkTimes[m] / totalTime) * 100) : 0;
        const tar = totalTime > 0 ? ((machineIdleTimes[m] / totalTime) * 100) : 0;
        
        machineMetrics.push({
            machine: m,
            workTime: machineWorkTimes[m],
            idleTime: machineIdleTimes[m],
            tfr: tfr.toFixed(2),
            tar: tar.toFixed(2)
        });
    }
    
    // Calculate global metrics
    const totalWorkTimeAll = machineWorkTimes.slice(1).reduce((a, b) => a + b, 0);
    const totalIdleTimeAll = machineIdleTimes.slice(1).reduce((a, b) => a + b, 0);
    const globalMakespan = solution.makespan * appState.numMachines;
    
    const globalTFR = globalMakespan > 0 ? ((totalWorkTimeAll / globalMakespan) * 100) : 0;
    const globalTAR = globalMakespan > 0 ? ((totalIdleTimeAll / globalMakespan) * 100) : 0;
    
    return {
        machineMetrics,
        globalTFR: globalTFR.toFixed(2),
        globalTAR: globalTAR.toFixed(2),
        totalWorkTime: totalWorkTimeAll,
        totalIdleTime: totalIdleTimeAll,
        makespan: solution.makespan
    };
}

function displayTFRTAR(solution) {
    const metrics = calculateTFRTAR(solution);
    const tfrTarSection = document.getElementById('tfrTarSection');
    tfrTarSection.style.display = 'block';
    
    // Display global metrics
    let metricsHtml = `
        <div class="metric-card tfr">
            <div class="metric-icon">✅</div>
            <div class="metric-label">TFR Global</div>
            <div class="metric-value">${metrics.globalTFR}%</div>
            <div class="metric-percentage">Taux de Fonctionnement Réel</div>
        </div>
        <div class="metric-card tar">
            <div class="metric-icon">⏸️</div>
            <div class="metric-label">TAR Global</div>
            <div class="metric-value">${metrics.globalTAR}%</div>
            <div class="metric-percentage">Taux d'Arrêt Réel</div>
        </div>
        <div class="metric-card">
            <div class="metric-icon">⏱️</div>
            <div class="metric-label">Durée Totale</div>
            <div class="metric-value">${metrics.makespan}</div>
            <div class="metric-percentage">Temps Total d'Exécution</div>
        </div>
        <div class="metric-card">
            <div class="metric-icon">⚙️</div>
            <div class="metric-label">Utilisation</div>
            <div class="metric-value">${metrics.totalWorkTime}</div>
            <div class="metric-percentage">Temps de Travail Total</div>
        </div>
    `;
    
    document.getElementById('tfrTarMetrics').innerHTML = metricsHtml;
    
    // Display machine-level charts
    let chartsHtml = '';
    
    // TFR Chart
    chartsHtml += `
        <div class="chart-container">
            <div class="chart-title">📊 Taux de Fonctionnement Réel (TFR) par Machine</div>
            <div class="bar-chart">
    `;
    
    for (let i = 0; i < metrics.machineMetrics.length; i++) {
        const m = metrics.machineMetrics[i];
        const percentage = parseFloat(m.tfr);
        chartsHtml += `
            <div class="bar-container">
                <div class="bar tfr-bar" style="height: ${Math.max(percentage * 2, 5)}px;" title="M${m.machine}: ${m.tfr}%"></div>
                <div class="bar-value">${m.tfr}%</div>
                <div class="bar-label">M${m.machine}</div>
            </div>
        `;
    }
    
    chartsHtml += `
            </div>
            <div class="chart-stats">
                <div class="stat-item tfr-stat">
                    <div class="stat-label">Moyenne TFR</div>
                    <div class="stat-value">${(metrics.machineMetrics.reduce((sum, m) => sum + parseFloat(m.tfr), 0) / metrics.machineMetrics.length).toFixed(2)}%</div>
                </div>
                <div class="stat-item tfr-stat">
                    <div class="stat-label">TFR Global</div>
                    <div class="stat-value">${metrics.globalTFR}%</div>
                </div>
            </div>
        </div>
    `;
    
    // TAR Chart
    chartsHtml += `
        <div class="chart-container">
            <div class="chart-title">⏸️ Taux d'Arrêt Réel (TAR) par Machine</div>
            <div class="bar-chart">
    `;
    
    for (let i = 0; i < metrics.machineMetrics.length; i++) {
        const m = metrics.machineMetrics[i];
        const percentage = parseFloat(m.tar);
        chartsHtml += `
            <div class="bar-container">
                <div class="bar tar-bar" style="height: ${Math.max(percentage * 2, 5)}px;" title="M${m.machine}: ${m.tar}%"></div>
                <div class="bar-value">${m.tar}%</div>
                <div class="bar-label">M${m.machine}</div>
            </div>
        `;
    }
    
    chartsHtml += `
            </div>
            <div class="chart-stats">
                <div class="stat-item tar-stat">
                    <div class="stat-label">Moyenne TAR</div>
                    <div class="stat-value">${(metrics.machineMetrics.reduce((sum, m) => sum + parseFloat(m.tar), 0) / metrics.machineMetrics.length).toFixed(2)}%</div>
                </div>
                <div class="stat-item tar-stat">
                    <div class="stat-label">TAR Global</div>
                    <div class="stat-value">${metrics.globalTAR}%</div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('tfrTarCharts').innerHTML = chartsHtml;
}

function adjustColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}
