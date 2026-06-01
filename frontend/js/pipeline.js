'use strict';

// --- DOM references ---
const runBtn         = document.getElementById('run-btn');
const resetBtn       = document.getElementById('reset-btn');
const logFeed        = document.getElementById('log-feed');
const pipelineResult = document.getElementById('pipeline-result');
const pipelineError  = document.getElementById('pipeline-error');
const progressFill   = document.getElementById('progress-fill');
const progressLabel  = document.getElementById('progress-label');

// --- State ---
let isRunning        = false;
let runCount         = 0;
let renderedLogCount = 0;

// ============================================================
// INIT
// ============================================================
window.addEventListener('load', () => {
  const config = JSON.parse(sessionStorage.getItem('aerominer-config'));
  if (!config) {
    showConfigGuard();
    return;
  }
  renderConfigSummary(config);
});

function showConfigGuard() {
  runBtn.disabled   = true;
  resetBtn.disabled = true;
  const container = document.querySelector('.container');
  const guard     = document.createElement('div');
  guard.className = 'config-warning-banner';
  guard.innerHTML = `⚠ No configuration found. <a href="configure.html">Configure the pipeline first →</a>`;
  container.prepend(guard);
  ['extract', 'transform', 'load'].forEach(stage => {
    const el = document.getElementById(`stage-${stage}`);
    if (el) el.style.opacity = '0.4';
  });
}

function renderConfigSummary(config) {
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setText('s-keyword', config.keyword  || '—');
  setText('s-stars',   config.minStars || '0');
  setText('s-lang',    config.language || 'Any');
  setText('s-repos',   config.maxRepos || '—');
}

// ============================================================
// BUTTONS
// ============================================================
runBtn.addEventListener('click', () => {
  if (isRunning) return;
  pipelineResult.style.display = 'none';
  pipelineError.style.display  = 'none';
  logFeed.innerHTML             = '';
  renderedLogCount              = 0;
  resetAllStages();
  setProgress(0);
  setButtonState(true);
  runPipeline();
});

resetBtn.addEventListener('click', () => {
  if (isRunning) return;
  resetAllStages();
  setProgress(0);
  logFeed.innerHTML            = '<span class="log-placeholder">Pipeline not started yet...</span>';
  pipelineResult.style.display = 'none';
  pipelineError.style.display  = 'none';
  renderedLogCount             = 0;
});

// ============================================================
// PIPELINE — calls backend
// ============================================================
async function runPipeline() {
  isRunning = true;
  runCount++;

  const config = JSON.parse(sessionStorage.getItem('aerominer-config')) || {};

  addToFeed('INFO', 'System', `Pipeline run #${runCount} initiated.`);
  addToFeed('INFO', 'System', 'Connecting to backend...');

  try {
    const res = await fetch('http://localhost:3001/api/pipeline/run', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword:  config.keyword  || 'aviation',
        language: config.language || '',
        minStars: config.minStars || 0,
        maxRepos: config.maxRepos || 10,
      }),
    });

    if (!res.ok) throw new Error(`Server error: ${res.status}`);

    const { runId } = await res.json();
    addToFeed('INFO', 'System', `Pipeline started — Run ID: ${runId}`);
    pollPipelineStatus(runId);

  } catch (err) {
    addToFeed('ERROR', 'System', `Failed to start pipeline: ${err.message}`);
    pipelineError.style.display = 'block';
    setButtonState(false);
    isRunning = false;
  }
}

// ============================================================
// POLLING
// ============================================================
async function pollPipelineStatus(runId) {
  const interval = setInterval(async () => {
    try {
      const res  = await fetch(`http://localhost:3001/api/pipeline/status/${runId}`);
      const data = await res.json();

      renderPollLogs(data.logs || []);
      updateStagesFromLogs(data.logs || []);

      if (data.status === 'complete') {
        clearInterval(interval);
        setStage('extract',   'done');
        setStage('transform', 'done');
        setStage('load',      'done');
        setProgress(100);
        document.getElementById('repo-count').textContent = data.repos_found;
        pipelineResult.style.display = 'block';
        setButtonState(false);
        isRunning = false;
      }

      if (data.status === 'error') {
        clearInterval(interval);
        pipelineError.style.display = 'block';
        setButtonState(false);
        isRunning = false;
      }

    } catch (err) {
      clearInterval(interval);
      addToFeed('ERROR', 'System', `Polling failed: ${err.message}`);
      setButtonState(false);
      isRunning = false;
    }
  }, 2000);
}

function renderPollLogs(logs) {
  const newLogs = logs.slice(renderedLogCount);
  newLogs.forEach(l => addToFeed(l.level, l.stage, l.message));
  renderedLogCount = logs.length;
}

function updateStagesFromLogs(logs) {
  const stages = logs.map(l => l.stage.toLowerCase());
  if (stages.includes('extract'))   { setStage('extract',   'running'); setProgress(10); }
  if (stages.includes('transform')) { setStage('extract',   'done');    setStage('transform', 'running'); setProgress(50); }
  if (stages.includes('load'))      { setStage('transform', 'done');    setStage('load',      'running'); setProgress(80); }
}

// ============================================================
// LIVE FEED
// ============================================================
function addToFeed(level, stage, message) {
  const line = document.createElement('div');
  line.className = 'log-line';
  line.innerHTML = `
    <span class="log-time">${new Date().toLocaleTimeString()}</span>
    <span class="log-level log-${level.toLowerCase()}">${level}</span>
    <span class="log-stage">[${stage}]</span>
    <span class="log-msg">${message}</span>
  `;
  logFeed.appendChild(line);
  logFeed.scrollTop = logFeed.scrollHeight;
}

// ============================================================
// STAGE HELPERS
// ============================================================
function setStage(name, status) {
  const badge   = document.getElementById(`badge-${name}`);
  const stageEl = document.getElementById(`stage-${name}`);
  if (!badge) return;
  const states = {
    running: { cls: 'badge--running', text: '⟳ Running...' },
    done:    { cls: 'badge--done',    text: '✓ Done'       },
    error:   { cls: 'badge--error',   text: '✕ Error'      },
  };
  badge.className   = `badge ${states[status]?.cls || 'badge--idle'}`;
  badge.textContent = states[status]?.text || 'Idle';
  if (stageEl) {
    stageEl.classList.toggle('stage-active', status === 'running');
    stageEl.classList.toggle('stage-done',   status === 'done');
  }
}

function resetAllStages() {
  ['extract', 'transform', 'load'].forEach(name => {
    const badge   = document.getElementById(`badge-${name}`);
    const stageEl = document.getElementById(`stage-${name}`);
    if (badge)   { badge.className = 'badge badge--idle'; badge.textContent = 'Idle'; }
    if (stageEl) { stageEl.classList.remove('stage-active', 'stage-done'); }
  });
}

function setProgress(pct) {
  if (progressFill)  progressFill.style.width  = `${pct}%`;
  if (progressLabel) progressLabel.textContent = `${pct}%`;
}

function setButtonState(running) {
  runBtn.disabled    = running;
  resetBtn.disabled  = running;
  runBtn.textContent = running ? '⟳ Running...' : '▶ Run Pipeline';
}