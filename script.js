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

// ============ GANTT CHART (Custom DOM-based) ============
function displayGanttChart(solution) {
    const ganttSection = document.getElementById('ganttSection');
    ganttSection.style.display = 'block';

    const container = document.getElementById('ganttChart');
    container.innerHTML = '';

    // Build a simple DOM-based Gantt chart (machine rows + numeric scale + makespan line)
    const colors = ['#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9'];
    const jobColorMap = {};
    for (let j = 1; j <= appState.numJobs; j++) jobColorMap[j] = colors[(j - 1) % colors.length];

    const maxTime = Math.max(1, solution.makespan);
    const leftCol = 120;
    const chartWidth = 760;

    // Inject styles for the DOM Gantt
    const styleId = 'dom-gantt-styles';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.textContent = `
            #ganttChart { position: relative; padding: 12px; background: #fff; border-radius: 8px; }
            .gantt-row { display: block; position: relative; height: 44px; margin-bottom: 6px; }
            .gantt-row-label { position: absolute; left: 0; top: 0; width: ${leftCol - 12}px; padding: 8px; font-weight: 700; }
            .gantt-row-track { position: absolute; left: ${leftCol}px; right: 12px; top: 0; height: 44px; background: transparent; }
            .gantt-bar { position: absolute; top: 6px; height: 32px; border-radius: 6px; color: #fff; display: flex; align-items: center; justify-content: center; padding: 0 8px; font-weight: 600; box-shadow: 0 3px 8px rgba(0,0,0,0.08); cursor: pointer; }
            .gantt-scale { position: absolute; left: ${leftCol}px; right: 12px; height: 28px; top: -36px; }
            .gantt-scale .marker { position: absolute; top: 0; transform: translateX(-50%); font-size: 12px; color: #374151; }
            .gantt-makespan { position: absolute; top: -36px; width: 2px; background: rgba(220,38,38,0.9); height: calc(100% + 36px); }
        `;
        document.head.appendChild(styleEl);
    }

    // Legend
    const legend = document.createElement('div');
    legend.style.display = 'flex';
    legend.style.gap = '8px';
    legend.style.flexWrap = 'wrap';
    legend.style.marginBottom = '8px';
    for (let j = 1; j <= appState.numJobs; j++) {
        const it = document.createElement('div');
        it.style.display = 'flex';
        it.style.alignItems = 'center';
        it.style.gap = '6px';
        const sw = document.createElement('span');
        sw.style.width = '14px'; sw.style.height = '14px'; sw.style.background = jobColorMap[j]; sw.style.display = 'inline-block'; sw.style.borderRadius = '3px';
        const lbl = document.createElement('span');
        lbl.textContent = 'Tâche ' + j;
        lbl.style.fontSize = '13px';
        it.appendChild(sw);
        it.appendChild(lbl);
        legend.appendChild(it);
    }
    container.appendChild(legend);

    // Scale markers
    const scale = document.createElement('div');
    scale.className = 'gantt-scale';
    for (let t = 0; t <= maxTime; t += Math.max(1, Math.ceil(maxTime / 12))) {
        const mark = document.createElement('div');
        mark.className = 'marker';
        const left = Math.round((t / maxTime) * chartWidth);
        mark.style.left = left + 'px';
        mark.textContent = t;
        scale.appendChild(mark);
    }
    container.appendChild(scale);

    // Rows per machine
    for (let m = 1; m <= appState.numMachines; m++) {
        const row = document.createElement('div');
        row.className = 'gantt-row';
        const label = document.createElement('div');
        label.className = 'gantt-row-label';
        label.textContent = 'M' + m;
        row.appendChild(label);
        
        const track = document.createElement('div');
        track.className = 'gantt-row-track';
        track.style.width = chartWidth + 'px';

        // Add bars for tasks on this machine
        for (let idx = 0; idx < solution.order.length; idx++) {
            const job = solution.order[idx];
            const pt = (appState.matrix[job] && appState.matrix[job][m]) || 0;
            const end = (solution.completion[job] && solution.completion[job][m]) || 0;
            const start = Math.max(0, end - pt);
            if (pt <= 0 || end <= 0) continue;

            const leftPx = Math.round((start / maxTime) * chartWidth);
            const widthPx = Math.max(6, Math.round((pt / maxTime) * chartWidth));

            const bar = document.createElement('div');
            bar.className = 'gantt-bar';
            bar.style.left = leftPx + 'px';
            bar.style.width = widthPx + 'px';
            bar.style.background = jobColorMap[job];
            bar.textContent = job;
            bar.title = `Tâche ${job} — M${m} (${pt}) [${start}..${end}]`;
            track.appendChild(bar);
        }

        row.appendChild(track);
        container.appendChild(row);
    }

    // Makespan line
    const makespanLine = document.createElement('div');
    makespanLine.className = 'gantt-makespan';
    makespanLine.style.left = Math.round((solution.makespan / maxTime) * chartWidth) + leftCol + 'px';
    container.appendChild(makespanLine);

    // Display TFR/TAR metrics
    displayTFRTAR(solution);
}

// Build and display TFR/TAR metrics (simplified, avoids large template literals)
function displayTFRTAR(solution) {
    const metrics = {
        machineMetrics: [],
        globalTFR: 0,
        globalTAR: 0,
        makespan: solution.makespan || 0,
        totalWorkTime: 0,
        totalFlowTime: 0,
        totalWeightedTime: 0
    };

    // Compute per-machine work and idle times using solution completion times
    for (let m = 1; m <= appState.numMachines; m++) {
        let work = 0;
        let idle = 0;
        let prevEnd = 0;
        for (let i = 0; i < solution.order.length; i++) {
            const job = solution.order[i];
            const pt = (appState.matrix[job] && appState.matrix[job][m]) || 0;
            const end = (solution.completion[job] && solution.completion[job][m]) || 0;
            const start = Math.max(0, end - pt);
            work += pt;
            if (start > prevEnd) idle += (start - prevEnd);
            prevEnd = Math.max(prevEnd, end);
        }
        const tfr = metrics.makespan ? (work / metrics.makespan * 100) : 0;
        const tar = metrics.makespan ? (idle / metrics.makespan * 100) : 0;
        metrics.machineMetrics.push({ machine: m, workTime: work, idleTime: idle, tfr: tfr.toFixed(2), tar: tar.toFixed(2) });
        metrics.totalWorkTime += work;
    }

    metrics.globalTFR = metrics.makespan && appState.numMachines ? ((metrics.totalWorkTime / (metrics.makespan * appState.numMachines)) * 100).toFixed(2) : '0.00';
    metrics.globalTAR = (100 - parseFloat(metrics.globalTFR)).toFixed(2);

    // Simple flow time calculation
    let totalFlow = 0;
    for (let i = 0; i < solution.order.length; i++) {
        const job = solution.order[i];
        const c = (solution.completion[job] && solution.completion[job][appState.numMachines]) || 0;
        totalFlow += c;
    }
    metrics.totalFlowTime = totalFlow;
    metrics.totalWeightedTime = totalFlow; // placeholder (weights not implemented)

    // Render compact metrics HTML
    let metricsHtml = '<div class="row g-3">';
    metricsHtml += `<div class="col-12"><div class="metric-card"><div class="metric-label">Cmax</div><div class="metric-value">${metrics.makespan}</div></div></div>`;
    metricsHtml += `<div class="col-6"><div class="metric-card"><div class="metric-label">TFR Global</div><div class="metric-value">${metrics.globalTFR}%</div></div></div>`;
    metricsHtml += `<div class="col-6"><div class="metric-card tar"><div class="metric-label">TAR Global</div><div class="metric-value">${metrics.globalTAR}%</div></div></div>`;

    for (let i = 0; i < metrics.machineMetrics.length; i++) {
        const mm = metrics.machineMetrics[i];
        metricsHtml += `<div class="col-md-4"><div class="metric-card"><div class="metric-label">Machine ${mm.machine}</div><div class="metric-value">${mm.workTime}</div><div class="metric-percentage">TFR ${mm.tfr}%</div></div></div>`;
    }
    metricsHtml += '</div>';

    document.getElementById('tfrTarMetrics').innerHTML = metricsHtml;

    // Simple charts placeholder
    document.getElementById('tfrTarCharts').innerHTML = '<div class="text-muted">Graphiques disponibles</div>';
}

function adjustColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}
