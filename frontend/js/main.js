// ============================================================
// main.js — AeroMiner Dashboard
// Reads sessionStorage (config) and backend API (logs)
// ============================================================
'use strict';

const BACKEND = 'https://aerominer-production.up.railway.app';

// ============================================================
// INIT
// ============================================================
window.addEventListener('load', async () => {
  renderConfigCard();
  renderSystemStatus(false);
  await loadDashboardData();
});

// ============================================================
// LOAD DATA FROM BACKEND
// ============================================================
async function loadDashboardData() {
  try {
    const res  = await fetch(`${BACKEND}/api/logs?limit=100`);
    const data = await res.json();
    const logs = data.logs || [];

    renderNavStatus(logs);
    renderLogStats(logs);
    renderRecentLogs(logs);
    renderSystemStatus(logs.length > 0);

  } catch (err) {
    // Backend not running — show offline state
    showOfflineBanner();
  }
}

function showOfflineBanner() {
  const container = document.querySelector('.container');
  if (!container) return;
  const banner = document.createElement('div');
  banner.className = 'config-warning-banner';
  banner.innerHTML = '⚠ Backend is not running. Start the backend to see live data.';
  container.prepend(banner);
}

// ============================================================
// NAV STATUS
// ============================================================
function renderNavStatus(logs) {
  if (!logs || logs.length === 0) return;
  const last   = logs[0]; // already sorted DESC from backend
  const navbar = document.querySelector('.navbar');
  const status = document.createElement('span');
  status.className   = 'nav-status';
  status.title       = `Last run: ${last.created_at}`;
  status.textContent = '● Pipeline active';
  navbar.appendChild(status);
}

// ============================================================
// CONFIG CARD
// ============================================================
function renderConfigCard() {
  const config  = JSON.parse(sessionStorage.getItem('aerominer-config'));
  const emptyEl = document.getElementById('dash-config-empty');
  const dataEl  = document.getElementById('dash-config-data');

  if (!config) {
    if (emptyEl) emptyEl.style.display = 'block';
    if (dataEl)  dataEl.style.display  = 'none';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';
  if (dataEl)  dataEl.style.display  = 'block';

  setText('d-keyword', config.keyword  || '—');
  setText('d-stars',   config.minStars || '0');
  setText('d-lang',    config.language || 'Any');
  setText('d-repos',   config.maxRepos || '—');
  setText('d-format',  config.format   || '—');
  setText('dash-repos', config.maxRepos || '—');
}

// ============================================================
// LOG STATS
// ============================================================
function renderLogStats(logs) {
  const errors = logs.filter(l => l.level === 'ERROR');

  setText('dash-logs',   logs.length   || '0');
  setText('dash-errors', errors.length || '0');

  const statusEl = document.getElementById('dash-status');
  if (!statusEl) return;

  if (logs.length === 0) {
    statusEl.textContent = 'Idle';
    statusEl.style.color = '#8b949e';
  } else {
    statusEl.textContent = 'Active';
    statusEl.style.color = '#3fb950';
  }
}

// ============================================================
// RECENT LOGS
// ============================================================
function renderRecentLogs(logs) {
  const body = document.getElementById('recent-logs-body');
  if (!body) return;

  if (logs.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="4" class="table-empty">
          No logs yet — <a href="pipeline.html" style="color:#58a6ff;">run the pipeline</a> to see activity here.
        </td>
      </tr>`;
    return;
  }

  // Show 5 most recent
  body.innerHTML = logs.slice(0, 5).map(log => `
    <tr>
      <td class="log-timestamp">${log.created_at || '—'}</td>
      <td><span class="badge log-badge-${log.level}">${log.level}</span></td>
      <td class="log-message">${log.message}</td>
      <td><span class="stage-tag">${log.stage}</span></td>
    </tr>
  `).join('');
}

// ============================================================
// SYSTEM FLOW
// ============================================================
function renderSystemStatus(hasLogs) {
  const config = JSON.parse(sessionStorage.getItem('aerominer-config'));

  const steps = [
    { done: !!config, label: 'Configure',    link: 'configure.html' },
    { done: hasLogs,  label: 'Run Pipeline', link: 'pipeline.html'  },
    { done: false,    label: 'Export Data',  link: 'export.html'    },
  ];

  const container = document.getElementById('system-flow');
  if (!container) return;

  container.innerHTML = steps.map((step, i) => `
    <div class="flow-step ${step.done ? 'flow-done' : 'flow-pending'}">
      <div class="flow-num">${step.done ? '✓' : i + 1}</div>
      <div class="flow-label">
        <a href="${step.link}" style="color:inherit;text-decoration:none;">${step.label}</a>
      </div>
    </div>
    ${i < steps.length - 1 ? '<div class="flow-arrow">→</div>' : ''}
  `).join('');
}

// ============================================================
// UTILITY
// ============================================================
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}