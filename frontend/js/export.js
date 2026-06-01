// ============================================================
// export.js — AeroMiner
// Fetches repository data from the backend API.
// Backend queries MySQL database populated by the ETL pipeline.
// ============================================================

'use strict';

// --- DOM references ---
const previewBtn    = document.getElementById('preview-btn');
const downloadBtn   = document.getElementById('download-btn');
const tableBody     = document.getElementById('table-body');
const countBadge    = document.getElementById('record-count');
const filterCat     = document.getElementById('filter-category');
const filterStars   = document.getElementById('filter-stars');
const formatRadios  = document.querySelectorAll('input[name="export-format"]');

// --- State ---
let filteredData  = [];
let allFetched    = [];
let isFetching    = false;

// ============================================================
// INIT — Guard: warn if no config found
// ============================================================
window.addEventListener('load', () => {
  const config = JSON.parse(sessionStorage.getItem('aerominer-config'));

  if (!config) {
    showConfigWarning();
    previewBtn.disabled = true;
    return;
  }

  // Show active config summary above table
  renderConfigSummary(config);
});

function showConfigWarning() {
  const container = document.querySelector('.container');
  const warning   = document.createElement('div');
  warning.className   = 'config-warning-banner';
  warning.innerHTML   = `
    ⚠ No pipeline configuration found.
    <a href="configure.html">Go to Configure →</a>
    to set your search parameters before exporting.
  `;
  container.prepend(warning);
}

function renderConfigSummary(config) {
  const existing = document.getElementById('active-config-summary');
  if (existing) return;

  const summary = document.createElement('div');
  summary.id        = 'active-config-summary';
  summary.className = 'config-summary-bar';
  summary.innerHTML = `
    <span class="cs-label">Active config:</span>
    <span class="cs-item">🔍 <strong>${config.keyword}</strong></span>
    <span class="cs-item">⭐ min ${config.minStars || 0}</span>
    <span class="cs-item">💻 ${config.language || 'Any language'}</span>
    <span class="cs-item">📦 max ${config.maxRepos} repos</span>
    <a href="configure.html" class="cs-edit">Edit →</a>
  `;
  document.querySelector('.container').prepend(summary);
}



// ============================================================
// FILTERS
// ============================================================

function applyFilters(data) {
  const category = filterCat.value;
  const minStars = parseInt(filterStars.value) || 0;

  return data.filter(repo => {
    const categoryMatch = category === 'all' || repo.category === category;
    const starsMatch    = repo.stars >= minStars;
    return categoryMatch && starsMatch;
  });
}

// ============================================================
// RENDER TABLE
// ============================================================

function renderTable(data) {
  if (data.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="table-empty">
          <div class="empty-state-icon">🔍</div>
          No repositories match your filters.
        </td>
      </tr>`;
    return;
  }

  tableBody.innerHTML = data.map(repo => {
    const name     = repo.full_name || repo.name || 'Unknown';
    const url      = repo.github_url || repo.url || '#';
    const topics   = typeof repo.topics === 'string'
                     ? JSON.parse(repo.topics)
                     : (repo.topics || []);
    const updated  = repo.updated || repo.last_fetched || '—';

    return `
      <tr>
        <td>
          <a href="${url}" target="_blank" rel="noopener" class="repo-name">${name}</a>
          <div class="repo-desc">${repo.description || ''}</div>
          ${topics.slice(0, 4).map(t => `<span class="topic-tag">${t}</span>`).join('')}
        </td>
        <td><span class="cat-badge cat-${repo.category}">${repo.category}</span></td>
        <td>${repo.language || 'N/A'}</td>
        <td>
          <span class="stars-count">⭐ ${(repo.stars || 0).toLocaleString()}</span>
          <div class="forks-count">🍴 ${(repo.forks || 0).toLocaleString()}</div>
        </td>
        <td>${updated}</td>
      </tr>
    `;
  }).join('');
}

// ============================================================
// LOADING / ERROR STATES
// ============================================================

function setLoading(isLoading) {
  if (isFetching === isLoading) return;
  isFetching = isLoading;

  previewBtn.disabled    = isLoading;
  downloadBtn.disabled   = isLoading;
  previewBtn.textContent = isLoading ? '⏳ Fetching...' : 'Preview Data';

  if (isLoading) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="table-empty">
          <div class="loading-dots">
            <span></span><span></span><span></span>
          </div>
          <div style="margin-top:12px;color:#8b949e;">
            Loading repositories from database...
          </div>
        </td>
      </tr>`;
    countBadge.textContent = '';
  }
}

function showError(message) {
  tableBody.innerHTML = `
    <tr>
      <td colspan="5" class="table-empty">
        <div style="color:#f85149;font-size:20px;margin-bottom:8px;">❌</div>
        <div style="color:#f85149;font-weight:500;">${message}</div>
        <div style="margin-top:8px;font-size:12px;color:#8b949e;">
          Check the console for more details.
        </div>
      </td>
    </tr>`;
  countBadge.textContent = '';
}

// ============================================================
// EVENT LISTENERS
// ============================================================

previewBtn.addEventListener('click', async () => {
  if (isFetching) return;

  const config   = JSON.parse(sessionStorage.getItem('aerominer-config')) || {};
  const category = filterCat.value;
  const minStars = filterStars.value || 0;

  setLoading(true);

  try {
    const params = new URLSearchParams({
      category:  category,
      language:  config.language || '',
      min_stars: minStars,
      limit:     config.maxRepos || 30,
    });

    const res = await fetch(`https://aerominer-production.up.railway.app/api/repos?${params}`);
    if (!res.ok) throw new Error(`Server error: ${res.status}`);

    const data   = await res.json();
    allFetched   = data.repos;
    filteredData = allFetched;

    renderTable(filteredData);
    countBadge.textContent = `${filteredData.length} of ${data.total} repos`;

    // Dynamically populate category filter
    populateCategoryFilter(allFetched);

  } catch (err) {
    console.error('[AeroMiner] Export fetch error:', err);
    showError(err.message);
  } finally {
    setLoading(false);
  }
});

function populateCategoryFilter(repos) {
  const categories = [...new Set(repos.map(r => r.category))].sort();
  const current    = filterCat.value;

  filterCat.innerHTML = '<option value="all">All Categories</option>';
  categories.forEach(cat => {
    const option       = document.createElement('option');
    option.value       = cat;
    option.textContent = cat;
    if (cat === current) option.selected = true;
    filterCat.appendChild(option);
  });

  // Show the filter now that it has real options
  document.getElementById('category-filter-group').style.display = 'flex';
}

// Re-filter without re-fetching when filters change
filterCat.addEventListener('change',   refilter);
filterStars.addEventListener('input',  refilter);

function refilter() {
  if (allFetched.length === 0) return;
  filteredData = applyFilters(allFetched);
  renderTable(filteredData);
  countBadge.textContent = `${filteredData.length} of ${allFetched.length} repos`;
}

downloadBtn.addEventListener('click', () => {
  if (filteredData.length === 0) {
    alert('Click "Preview Data" first to load results.');
    return;
  }

  const format   = document.querySelector('input[name="export-format"]:checked').value;
  const config   = JSON.parse(sessionStorage.getItem('aerominer-config')) || {};
  const category = filterCat.value;
  const minStars = filterStars.value || 0;

  const params = new URLSearchParams({
    category:  category,
    language:  config.language || '',
    min_stars: minStars,
  });

  window.location.href = `https://aerominer-production.up.railway.app/api/export/${format}?${params}`;
});

