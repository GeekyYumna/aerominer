'use strict';

let allLogs = [];

// ============================================================
// INIT
// ============================================================
window.addEventListener('load', () => {
  loadLogsFromBackend();
});

// ============================================================
// FETCH LOGS FROM BACKEND
// ============================================================
async function loadLogsFromBackend() {
  try {
    const res  = await fetch('http://localhost:3001/api/logs?limit=500');
    const data = await res.json();
    allLogs    = data.logs || [];
    renderLogs(allLogs);
    updateStats(allLogs);
  } catch (err) {
    document.getElementById('log-body').innerHTML = `
      <tr>
        <td colspan="4" class="table-empty" style="color:#f85149;">
          ❌ Could not connect to backend: ${err.message}
        </td>
      </tr>`;
  }
}

// ============================================================
// FILTER BUTTON
// ============================================================
document.getElementById('filter-btn').addEventListener('click', () => {
  const level  = document.getElementById('filter-level').value;
  const search = document.getElementById('filter-search').value.toLowerCase().trim();

  const filtered = allLogs.filter(log => {
    const levelMatch  = level === 'all' || log.level === level;
    const searchMatch = !search || log.message.toLowerCase().includes(search);
    return levelMatch && searchMatch;
  });

  renderLogs(filtered);
  document.getElementById('log-count').textContent = `${filtered.length} of ${allLogs.length}`;
});

// ============================================================
// CLEAR FILTERS
// ============================================================
document.getElementById('clear-filter-btn').addEventListener('click', () => {
  document.getElementById('filter-level').value  = 'all';
  document.getElementById('filter-search').value = '';
  renderLogs(allLogs);
  document.getElementById('log-count').textContent = `${allLogs.length} entries`;
});

// ============================================================
// CLEAR ALL LOGS
// ============================================================
document.getElementById('clear-logs-btn').addEventListener('click', async () => {
  if (!confirm('Clear all log entries? This cannot be undone.')) return;

  try {
    await fetch('http://localhost:3001/api/logs', { method: 'DELETE' });
    allLogs = [];
    renderLogs([]);
    updateStats([]);
  } catch (err) {
    alert('Failed to clear logs: ' + err.message);
  }
});

// ============================================================
// RENDER TABLE
// ============================================================
function renderLogs(logs) {
  const body = document.getElementById('log-body');
  document.getElementById('log-count').textContent = `${logs.length} entries`;

  if (logs.length === 0) {
    body.innerHTML = '<tr><td colspan="4" class="table-empty">No logs found. Run the pipeline first.</td></tr>';
    return;
  }

  body.innerHTML = logs.map(log => `
    <tr>
      <td class="log-timestamp">${log.created_at || log.time || '—'}</td>
      <td><span class="badge log-badge-${log.level}">${log.level}</span></td>
      <td class="log-message">${log.message}</td>
      <td><span class="stage-tag">${log.stage}</span></td>
    </tr>
  `).join('');
}

// ============================================================
// UPDATE STATS
// ============================================================
function updateStats(logs) {
  document.getElementById('stat-total').textContent = logs.length;
  document.getElementById('stat-info').textContent  = logs.filter(l => l.level === 'INFO').length;
  document.getElementById('stat-warn').textContent  = logs.filter(l => l.level === 'WARN').length;
  document.getElementById('stat-error').textContent = logs.filter(l => l.level === 'ERROR').length;
}