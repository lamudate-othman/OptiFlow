// Professional color palette for jobs
const jobColors = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e',
    '#f97316', '#eab308', '#10b981', '#14b8a6',
    '#06b6d4', '#0ea5e9', '#6366f1', '#a855f7'
];

// State management
let appState = {
    numMachines: 3,
    numJobs: 9,
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
    
    const defaultMatrix = [
        null,
        [null, 4, 8, 3],
        [null, 3, 5, 7],
        [null, 5, 2, 4],
        [null, 2, 4, 7],
        [null, 7, 3, 5],
        [null, 3, 7, 6],
        [null, 6, 6, 6],
        [null, 7, 8, 8],
        [null, 5, 9, 3]
    ];
    
    for (let j = 1; j <= appState.numJobs; j++) {
        html += `<tr><td><strong>Tâche ${j}</strong></td>`;
        for (let m = 1; m <= appState.numMachines; m++) {
            const value = defaultMatrix[j][m];
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
            for (let m = k + 1; m <= appState.numMachines; m++) {
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
        
        // Debug: log best solution to console
        console.log('=== BEST SOLUTION ===');
        console.log('Iteration K:', best.iteration);
        console.log('Makespan (Cmax):', best.makespan);
        console.log('Job Order:', best.order);
        console.log('Completion Matrix:');
        console.table(best.completion);
        console.log('Virtual A (first k machines):', best.A);
        console.log('Virtual B (machines k+1 to M):', best.B);
        console.log('All solutions:', appState.allSolutions);
        
        // Display Gantt chart
        displayGanttChart(best);
    }
}

// ============ GANTT CHART with Frappe ============
function displayGanttChart(solution) {
    const ganttSection = document.getElementById('ganttSection');
    ganttSection.style.display = 'block';
    
    // Clear previous Gantt if exists
    const container = document.getElementById('ganttChart');
    container.innerHTML = '';
    
    // Prepare task data for Frappe Gantt
    const ganttTasks = [];
    const colors = ['#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9'];
    const jobColorMap = {};
    
    // Create color map for jobs
    for (let j = 1; j <= appState.numJobs; j++) {
        jobColorMap[j] = colors[(j - 1) % colors.length];
    }
    
    // Create tasks for each job on each machine
    for (let m = 1; m <= appState.numMachines; m++) {
        for (let i = 1; i <= solution.order.length; i++) {
            const job = solution.order[i - 1];
            
            if (!appState.matrix[job] || !solution.completion[job]) continue;
            
            const processingTime = appState.matrix[job][m] || 0;
            const endTime = solution.completion[job][m] || 0;
            const startTime = Math.max(0, endTime - processingTime);
            
            if (endTime <= 0 || processingTime <= 0) continue;
            
            const taskId = `job-${job}-m${m}`;
            
            // Create base date and adjust by start time
            const baseDate = new Date(2024, 0, 1, 0, 0, 0);
            const startDate = new Date(baseDate.getTime() + startTime * 60 * 60 * 1000);
            const endDate = new Date(baseDate.getTime() + endTime * 60 * 60 * 1000);
            
            ganttTasks.push({
                id: taskId,
                name: `M${m}: Tâche ${job}`,
                start: startDate.toISOString().split('T')[0],
                end: endDate.toISOString().split('T')[0],
                progress: 100,
                custom_class: `job-color-${job}`
            });
            
            console.log(`Task: Job ${job} M${m} | Start: ${startTime} End: ${endTime} | Processing: ${processingTime}`);
        }
    }
    
    // Initialize Frappe Gantt
    try {
        const gantt = new Gantt('#ganttChart', ganttTasks, {
            header_height: 50,
            column_width: 30,
            step: 24,
            view_modes: ['Jour', 'Semaine'],
            bar_height: 35,
            bar_corner_radius: 5,
            arrow_curve: 5,
            padding: 18,
            view_mode: 'Jour',
            date_format: 'YYYY-MM-DD HH:mm',
            on_click: function(task) {
                console.log('Task clicked:', task);
            },
            on_date_change: null,
            on_progress_change: null,
            on_view_change: null,
            custom_popup_html: null,
            language: 'en'
        });
        
        // Apply custom styling for job colors
        const style = document.createElement('style');
        style.textContent = `
            #ganttChart .gantt-container {
                background-color: #f9fafb;
            }
            ${colors.map((color, idx) => `
                #ganttChart .job-color-${idx + 1} {
                    background-color: ${color} !important;
                }
                #ganttChart .job-color-${idx + 1}.bar-progress {
                    background-color: ${adjustColor(color, -20)} !important;
                }
            `).join('')}
            #ganttChart .bar {
                border-radius: 5px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            #ganttChart .bar-label {
                font-weight: 600;
                font-size: 12px;
            }
        `;
        if (!document.getElementById('gantt-custom-styles')) {
            style.id = 'gantt-custom-styles';
            document.head.appendChild(style);
        }
        
        console.log(`Frappe Gantt initialized with ${ganttTasks.length} tasks`);
    } catch (error) {
        console.error('Error initializing Frappe Gantt:', error);
        // Fallback to simple message if Gantt library not loaded
        container.innerHTML = '<div style="padding:20px; color:red;">Erreur: Bibliothèque Gantt non chargée. Vérifiez la connexion CDN.</div>';
    }
    
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
    
    // Calculate TFT (Total Flow Time) = sum of completion times of last job on each machine
    let totalFlowTime = 0;
    for (let j = 1; j <= solution.order.length; j++) {
        totalFlowTime += (solution.completion[j] ? solution.completion[j][appState.numMachines] : 0);
    }
    
    // Calculate TWT (Total Weighted Time) = weighted average based on job count
    const totalWeightedTime = totalFlowTime > 0 ? Math.round(totalFlowTime / solution.order.length) : 0;
    
    return {
        machineMetrics,
        globalTFR: globalTFR.toFixed(2),
        globalTAR: globalTAR.toFixed(2),
        totalWorkTime: totalWorkTimeAll,
        totalIdleTime: totalIdleTimeAll,
        makespan: solution.makespan,
        totalFlowTime: Math.round(totalFlowTime),
        totalWeightedTime: totalWeightedTime
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
            <div class="metric-label">Cmax</div>
            <div class="metric-value">${metrics.makespan}</div>
            <div class="metric-percentage">Durée Totale (Makespan)</div>
        </div>
        <div class="metric-card">
            <div class="metric-icon">🔢</div>
            <div class="metric-label">TT</div>
            <div class="metric-value">${metrics.totalWorkTime}</div>
            <div class="metric-percentage">Temps de Travail Total</div>
        </div>
        <div class="metric-card">
            <div class="metric-icon">📊</div>
            <div class="metric-label">TFT</div>
            <div class="metric-value">${metrics.totalFlowTime}</div>
            <div class="metric-percentage">Temps Flux Total</div>
        </div>
        <div class="metric-card">
            <div class="metric-icon">⚖️</div>
            <div class="metric-label">TWT</div>
            <div class="metric-value">${metrics.totalWeightedTime}</div>
            <div class="metric-percentage">Temps Pondéré Total</div>
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
