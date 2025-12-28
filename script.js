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
    allSolutions: [],
    enableTTList: false,
    ttValues: {}, // { jobId: ttValue }
    enableDjList: false,
    djValues: {} // { jobId: djValue }
};

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
    // TT List checkbox listener
    document.getElementById('enableTTList').addEventListener('change', (e) => {
        const ttGroup = document.getElementById('ttListGroup');
        appState.enableTTList = e.target.checked;
        ttGroup.style.display = e.target.checked ? 'block' : 'none';
    });

    // dj List checkbox listener
    document.getElementById('enableDjList').addEventListener('change', (e) => {
        const djGroup = document.getElementById('djListGroup');
        appState.enableDjList = e.target.checked;
        djGroup.style.display = e.target.checked ? 'block' : 'none';
    });

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
        // Parse TT list if enabled
        if (appState.enableTTList) {
            const ttInput = document.getElementById('ttListInput').value.trim();
            appState.ttValues = parseTTList(ttInput);
        }
        // Parse dj list if enabled
        if (appState.enableDjList) {
            const djInput = document.getElementById('djListInput').value.trim();
            appState.djValues = parseDjList(djInput);
        }
        updateMatrixDisplay();
    });
    
    // Calculate button
    document.getElementById('calculateBtn').addEventListener('click', calculateCDS);
    
    // Generate initial matrix
    updateMatrixDisplay();
    updateCombinationCount();
});

function parseTTList(input) {
    const ttObj = {};
    if (!input) return ttObj;
    
    // Try format: j1:5, j2:3, j3:0
    if (input.includes(':')) {
        const pairs = input.split(',');
        for (const pair of pairs) {
            const [jobStr, valStr] = pair.trim().split(':');
            const jobId = parseInt(jobStr.replace('j', ''));
            const val = parseInt(valStr);
            if (!isNaN(jobId) && !isNaN(val)) ttObj[jobId] = val;
        }
    } else {
        // Try format: one value per line or space-separated
        const values = input.split(/[\s,]+/).filter(v => v);
        for (let i = 0; i < values.length; i++) {
            const val = parseInt(values[i]);
            if (!isNaN(val)) ttObj[i + 1] = val;
        }
    }
    return ttObj;
}

function parseDjList(input) {
    const djObj = {};
    if (!input) return djObj;
    
    // Try format: j1:20, j2:25, j3:30
    if (input.includes(':')) {
        const pairs = input.split(',');
        for (const pair of pairs) {
            const [jobStr, valStr] = pair.trim().split(':');
            const jobId = parseInt(jobStr.replace('j', ''));
            const val = parseInt(valStr);
            if (!isNaN(jobId) && !isNaN(val)) djObj[jobId] = val;
        }
    } else {
        // Try format: one value per line or space-separated
        const values = input.split(/[\s,]+/).filter(v => v);
        for (let i = 0; i < values.length; i++) {
            const val = parseInt(values[i]);
            if (!isNaN(val)) djObj[i + 1] = val;
        }
    }
    return djObj;
}

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
                    <th>Job ⧵ Machine</th>
                    <th>rj</th>
                    <th>dj</th>
    `;

    for (let m = 1; m <= appState.numMachines; m++) {
        html += `<th>M${m}</th>`;
    }
    
    html += `</tr></thead><tbody>`;
    
    const defaultMatrix = [
        null,
        [0, 20, 4, 8, 3],
        [0, 25, 3, 5, 7],
        [2, 30, 5, 2, 4],
        [1, 35, 2, 4, 7],
        [3, 40, 7, 3, 5],
        [2, 45, 3, 7, 6],
        [1, 50, 6, 6, 6],
        [0, 55, 7, 8, 8],
        [2, 60, 5, 9, 3]
    ];
    
    for (let j = 1; j <= appState.numJobs; j++) {
        html += `<tr><td><strong>Job ${j}</strong></td>`;
        // rj column (arrival/delay - machine index 0)
        const rj = (defaultMatrix[j] && defaultMatrix[j][0]) != null ? defaultMatrix[j][0] : 0;
        html += `
            <td>
                <input
                    type="number"
                    min="0"
                    value="${rj}"
                    data-job="${j}"
                    data-machine="0"
                    class="matrix-input"
                >
            </td>
        `;
        // dj column (delivery date - machine index -1)
        const dj = (defaultMatrix[j] && defaultMatrix[j][1]) != null ? defaultMatrix[j][1] : 20;
        html += `
            <td>
                <input
                    type="number"
                    min="0"
                    value="${dj}"
                    data-job="${j}"
                    data-machine="-1"
                    class="matrix-input"
                >
            </td>
        `;
        for (let m = 1; m <= appState.numMachines; m++) {
            const value = (defaultMatrix[j] && defaultMatrix[j][m + 1]) != null ? defaultMatrix[j][m + 1] : 1;
            html += `
                <td>
                    <input 
                        type="number" 
                        min="0" 
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
    const matrix = Array(appState.numJobs + 1).fill(null).map(() => Array(appState.numMachines + 2).fill(0));
    
    inputs.forEach(input => {
        const job = parseInt(input.dataset.job);
        let machine = parseInt(input.dataset.machine);
        const value = parseInt(input.value) || 0;
        
        // Store rj at index 0, dj at index -1 (numMachines+1), processing times at 1..numMachines
        if (machine === -1) {
            machine = appState.numMachines + 1;
        }
        matrix[job][machine] = value;
    });
    
    // Auto-populate djValues from matrix if not already set
    if (!appState.enableDjList) {
        appState.djValues = {};
        for (let j = 1; j <= appState.numJobs; j++) {
            const dj = matrix[j][appState.numMachines + 1];
            if (dj > 0) appState.djValues[j] = dj;
        }
        // Automatically enable dj values from matrix
        if (Object.keys(appState.djValues).length > 0) {
            appState.enableDjList = true;
        }
    }
    
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
        // Respect job initial delay stored at matrix[job][0]
        completion[i][0] = (matrix[job] && matrix[job][0]) ? matrix[job][0] : 0;
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
        const sequenceStr = solution.order.map(j => `j${j}`).join(' → ');
        
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
        const sequenceStr = best.order.map((j) => `j${j}`).join(' → ');
        
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
    container.style.position = 'relative';
    container.style.padding = '40px 12px 12px 12px';
    container.style.background = '#fff';
    container.style.borderRadius = '8px';
    // Make chart scrollable when it overflows
    container.style.overflowX = 'auto';
    container.style.overflowY = 'auto';
    container.style.maxHeight = '65vh';

    const colors = ['#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9'];
    const jobColorMap = {};
    for (let j = 1; j <= appState.numJobs; j++) jobColorMap[j] = colors[(j - 1) % colors.length];

    const maxTime = Math.max(1, solution.makespan);
    const leftCol = 100;
    const chartWidth = 800;

    // Legend
    const legend = document.createElement('div');
    legend.style.marginBottom = '16px';
    legend.style.display = 'flex';
    legend.style.gap = '8px';
    legend.style.flexWrap = 'wrap';
    for (let j = 1; j <= appState.numJobs; j++) {
        const it = document.createElement('div');
        it.style.display = 'flex';
        it.style.alignItems = 'center';
        it.style.gap = '4px';
        const sw = document.createElement('span');
        sw.style.width = '12px';
        sw.style.height = '12px';
        sw.style.background = jobColorMap[j];
        sw.style.borderRadius = '2px';
        const lbl = document.createElement('span');
        lbl.textContent = 'J' + j;
        lbl.style.fontSize = '12px';
        it.appendChild(sw);
        it.appendChild(lbl);
        legend.appendChild(it);
    }
    container.appendChild(legend);

    // Header (scale markers)
    const headerContainer = document.createElement('div');
    headerContainer.style.position = 'relative';
    headerContainer.style.height = '28px';
    headerContainer.style.marginBottom = '8px';
    headerContainer.style.paddingLeft = leftCol + 'px';

    const scaleTrack = document.createElement('div');
    scaleTrack.style.position = 'relative';
    scaleTrack.style.height = '100%';
    scaleTrack.style.width = chartWidth + 'px';
    scaleTrack.style.borderBottom = '1px solid #e5e7eb';

    // Add numeric markers
    const step = Math.max(1, Math.ceil(maxTime / 12));
    for (let t = 0; t <= maxTime; t += step) {
        const mark = document.createElement('div');
        mark.style.position = 'absolute';
        mark.style.top = '0';
        mark.style.height = '100%';
        mark.style.borderLeft = '1px solid #d1d5db';
        mark.style.fontSize = '11px';
        mark.style.color = '#6b7280';
        mark.style.paddingLeft = '3px';
        mark.style.paddingTop = '6px';
        mark.textContent = t;
        const left = Math.round((t / maxTime) * chartWidth);
        mark.style.left = left + 'px';
        scaleTrack.appendChild(mark);
    }
    headerContainer.appendChild(scaleTrack);
    container.appendChild(headerContainer);

    // (Cmax makespan line removed by user request)

    // Build a map from job id -> position index in the sequence (completion matrix rows)
    const jobPos = {};
    for (let i = 0; i < solution.order.length; i++) {
        jobPos[solution.order[i]] = i + 1; // completion matrix is 1-based on positions
    }

    // Rows per machine
    for (let m = 1; m <= appState.numMachines; m++) {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.marginBottom = '6px';
        row.style.alignItems = 'stretch';

        const label = document.createElement('div');
        label.style.width = leftCol + 'px';
        label.style.padding = '8px';
        label.style.fontWeight = '700';
        label.style.fontSize = '13px';
        label.style.flexShrink = '0';
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.textContent = 'M' + m;
        row.appendChild(label);

        const track = document.createElement('div');
        track.style.position = 'relative';
        track.style.width = chartWidth + 'px';
        track.style.height = '38px';
        track.style.background = '#f9fafb';
        track.style.borderRadius = '4px';
        track.style.border = '1px solid #e5e7eb';

        // Add bars for tasks on this machine
        for (let idx = 0; idx < solution.order.length; idx++) {
            const job = solution.order[idx];
            const pt = (appState.matrix[job] && appState.matrix[job][m]) || 0;
            const pos = jobPos[job];
            const end = (solution.completion[pos] && solution.completion[pos][m]) || 0;
            const start = Math.max(0, end - pt);
            if (pt <= 0 || end <= 0) continue;

            const leftPx = Math.round((start / maxTime) * chartWidth);
            const widthPx = Math.max(8, Math.round((pt / maxTime) * chartWidth));

            const bar = document.createElement('div');
            bar.style.position = 'absolute';
            bar.style.top = '4px';
            bar.style.height = '30px';
            bar.style.borderRadius = '4px';
            bar.style.color = '#fff';
            bar.style.display = 'flex';
            bar.style.alignItems = 'center';
            bar.style.justifyContent = 'center';
            bar.style.fontSize = '12px';
            bar.style.fontWeight = '600';
            bar.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
            bar.style.cursor = 'pointer';
            bar.style.left = leftPx + 'px';
            bar.style.width = widthPx + 'px';
            bar.style.background = jobColorMap[job];
            bar.textContent = job;
            bar.title = `Job ${job} on M${m}: ${pt} units [${start}..${end}]`;
            track.appendChild(bar);
        }

        row.appendChild(track);
        container.appendChild(row);
    }

    // (Cmax makespan line removed by user request)

    console.log(`Gantt rendered: ${appState.numMachines} machines, makespan=${solution.makespan}, max time=${maxTime}`);
    
    // Display TFR/TAR metrics
    // Ensure metrics section is visible and render metrics below the Gantt
    const tfrSection = document.getElementById('tfrTarSection');
    if (tfrSection) tfrSection.style.display = 'block';
    displayTFRTAR(solution);
}

// Build and display TFR/TAR metrics (simplified, avoids large template literals)
function displayTFRTAR(solution) {
    // Compute metrics: per-machine utilization/idle, per-job flow/waiting, global TFR/TAR and total flow time (TFT)
    const metrics = {
        machineMetrics: [],
        jobMetrics: [],
        globalTFR: '0.00',
        globalTAR: '0.00',
        makespan: solution.makespan || 0,
        totalWorkTime: 0,
        totalFlowTime: 0,
        totalWaitingTime: 0
    };

    // Build job -> sequence position map
    const jobPos = {};
    for (let i = 0; i < solution.order.length; i++) jobPos[solution.order[i]] = i + 1;

    // Per-machine work/idle
    for (let m = 1; m <= appState.numMachines; m++) {
        let work = 0;
        let idle = 0;
        let prevEnd = 0;
        for (let i = 0; i < solution.order.length; i++) {
            const job = solution.order[i];
            const pos = jobPos[job];
            const pt = (appState.matrix[job] && appState.matrix[job][m]) || 0;
            const end = (solution.completion[pos] && solution.completion[pos][m]) || 0;
            const start = Math.max(0, end - pt);
            work += pt;
            if (start > prevEnd) idle += (start - prevEnd);
            prevEnd = Math.max(prevEnd, end);
        }
        metrics.machineMetrics.push({ machine: m, workTime: work, idleTime: idle });
        metrics.totalWorkTime += work;
    }

    // Compute TFR and TAR per machine (TFR = work%, TAR = 100 - TFR)
    for (const mm of metrics.machineMetrics) {
        const makespan = metrics.makespan || 1;
        // compute raw percentages then format
        const tfrVal = (mm.workTime / makespan) * 100;
        mm.TFR = tfrVal.toFixed(2);
        mm.TAR = (100 - tfrVal).toFixed(2);
    }

    // Global TFR (utilization %) and TAR (idle %)
    if (metrics.makespan && appState.numMachines) {
        const util = (metrics.totalWorkTime / (metrics.makespan * appState.numMachines)) * 100;
        metrics.globalTFR = util.toFixed(2);
        metrics.globalTAR = (100 - util).toFixed(2);
    }

    // Per-job metrics: processing sum, completion (Cj), flow time (Fj=Cj), waiting time (Wj) computed
    // as sum of idle gaps between consecutive operations for that job (uses completion by sequence position)
    let totalTardiness = 0;
    for (let j = 1; j <= appState.numJobs; j++) {
        const pos = jobPos[j];
        if (!pos) continue;
        const rj = (appState.matrix[j] && appState.matrix[j][0]) || 0; // job arrival/delay
        let sumP = 0;
        let prevEnd = null;
        let Wj = 0;
        let Cj = 0;
        let Sj = null; // job start date on first machine
        for (let m = 1; m <= appState.numMachines; m++) {
            const pt = (appState.matrix[j] && appState.matrix[j][m]) || 0;
            sumP += pt;
            const end = (solution.completion[pos] && solution.completion[pos][m]) || 0;
            if (pt <= 0 || end <= 0) continue;
            const start = Math.max(0, end - pt);
            if (prevEnd === null) {
                // first operation: record start date and don't count idle before it
                Sj = start;
                prevEnd = end;
            } else {
                if (start > prevEnd) Wj += (start - prevEnd);
                prevEnd = Math.max(prevEnd, end);
            }
            Cj = prevEnd;
        }
        const Fj = Cj;
        // Compute lateness Lj = max(0, Cj - dj) using dj from matrix or djValues
        let Lj = 0;
        let dj = appState.djValues[j];
        // If dj not in djValues, try to read from matrix
        if (dj === undefined && appState.matrix[j]) {
            dj = appState.matrix[j][appState.numMachines + 1];
        }
        if (dj !== undefined && dj > 0) {
            Lj = Math.max(0, Cj - dj);
            totalTardiness += Lj;
        }
        metrics.jobMetrics.push({ job: j, rj, Sj: Sj || 0, Cj, flowTime: Fj, waitingTime: Wj, sumProcessing: sumP, Lj, dj: dj || 0 });
        metrics.totalFlowTime += Fj;
        metrics.totalWaitingTime += Wj;
    }
    metrics.totalTardiness = totalTardiness;

    // Render per-job metric cards: rj, Sj, Cj, TWTj, TFT
    let metricsHtml = '<div style="margin-bottom:12px;"><strong>TFT (Total Flow Time):</strong> ' + metrics.totalFlowTime + ' | <strong>TT (Total Tardiness = Σ Lj):</strong> ' + metrics.totalTardiness + '</div>';
    if (appState.enableTTList && Object.keys(appState.ttValues).length > 0) {
        metricsHtml += '<div style="margin-bottom:12px; padding:8px; background:#fff3cd; border-radius:6px;"><strong>TT List Input:</strong> ';
        for (const jobId in appState.ttValues) {
            metricsHtml += `j${jobId}=${appState.ttValues[jobId]} `;
        }
        metricsHtml += '</div>';
    }
    if (appState.enableDjList && Object.keys(appState.djValues).length > 0) {
        metricsHtml += '<div style="margin-bottom:12px; padding:8px; background:#d1ecf1; border-radius:6px;"><strong>dj (Due Dates):</strong> ';
        for (const jobId in appState.djValues) {
            metricsHtml += `j${jobId}=${appState.djValues[jobId]} `;
        }
        metricsHtml += '</div>';
    }
    metricsHtml += '<div class="metrics-grid">';
    for (const jm of metrics.jobMetrics) {
        metricsHtml += `
            <div>
                <div class="metric-card">
                    <div class="metric-badge">j${jm.job}</div>
                    <div class="metric-stats">
                        <div class="metric-small"><strong>rj</strong>: ${jm.rj}</div>
                        <div class="metric-small"><strong>dj</strong>: ${jm.dj}</div>
                        <div class="metric-small"><strong>Sj</strong>: ${jm.Sj}</div>
                        <div class="metric-small"><strong>Cj</strong>: ${jm.Cj}</div>
                        <div class="metric-small"><strong>TWTj</strong>: ${jm.waitingTime}</div>
        `;
        if (appState.enableTTList && appState.ttValues[jm.job] !== undefined) {
            metricsHtml += `<div class="metric-small" style="color:#dc3545;"><strong>TT</strong>: ${appState.ttValues[jm.job]}</div>`;
        }
        // Lj (lateness) display removed per user request
        metricsHtml += `
                    </div>
                </div>
            </div>
        `;
    }
    metricsHtml += '</div>';

    document.getElementById('tfrTarMetrics').innerHTML = metricsHtml;
    // Render per-machine TAR/TER (TAR i, TFR i) below job cards
    let machineHtml = '<div style="margin-top:12px; margin-bottom:8px;"><strong>Machine Metrics (TAR i = idle %, TFR i = work %)</strong></div><div class="row" style="gap:8px;">';
    for (const mm of metrics.machineMetrics) {
        machineHtml += `
            <div style="min-width:160px; flex:1; max-width:220px;">
                <div class="metric-card ter">
                    <div class="metric-badge">M${mm.machine}</div>
                    <div class="metric-stats">
                        <div class="metric-small"><strong>TFR i</strong>: ${mm.TFR}%</div>
                        <div class="metric-small"><strong>TAR i</strong>: ${mm.TAR}%</div>
                    </div>
                </div>
            </div>
        `;
    }
    machineHtml += '</div>';
    document.getElementById('tfrTarCharts').innerHTML = machineHtml;
}

function adjustColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}
