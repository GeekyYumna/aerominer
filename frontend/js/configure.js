// ============================================================
// configure.js — AeroMiner
// Handles search parameter configuration.
// Stores config in sessionStorage (clears on tab close).
// Never persists sensitive data to localStorage.
// ============================================================

'use strict';

// --- DOM references ---
const saveBtn    = document.getElementById('save-btn');
const clearBtn   = document.getElementById('clear-btn');
const successMsg = document.getElementById('success-msg');
const form       = document.getElementById('config-form');

// --- Field references ---
const keywordField  = document.getElementById('keyword');
const starsField    = document.getElementById('min-stars');
const langField     = document.getElementById('language');
const reposField    = document.getElementById('max-repos');

// ============================================================
// INIT — restore config from sessionStorage if available
// ============================================================
window.addEventListener('load', () => {
  restoreForm();
  updateCharCount();
  attachLiveValidation();
});

function restoreForm() {
  const saved = JSON.parse(sessionStorage.getItem('aerominer-config'));
  if (!saved) return;

  keywordField.value = saved.keyword  || '';
  starsField.value   = saved.minStars || '';
  langField.value    = saved.language || '';
  reposField.value   = saved.maxRepos || '';

  const savedFormat = saved.format || 'cli';
  const formatRadio = document.querySelector(`input[name="config-format"][value="${savedFormat}"]`);
  if (formatRadio) formatRadio.checked = true;

  // Show restored state indicator
  showRestoredBanner();
}

function showRestoredBanner() {
  const existing = document.getElementById('restored-banner');
  if (existing) return;

  const banner = document.createElement('div');
  banner.id        = 'restored-banner';
  banner.className = 'info-banner';
  banner.innerHTML = `
    ℹ Configuration restored from current session.
    <button type="button" id="start-fresh-btn" class="inline-btn">Start fresh</button>
  `;
  form.prepend(banner);

  document.getElementById('start-fresh-btn').addEventListener('click', () => {
    sessionStorage.removeItem('aerominer-config');
    clearForm();
    banner.remove();
  });
}

// ============================================================
// LIVE VALIDATION — attach to each field on input
// ============================================================
function attachLiveValidation() {
  keywordField.addEventListener('input', () => {
    validateKeyword(true);
    updateCharCount();
  });
  starsField.addEventListener('input',  () => validateStars(true));
  reposField.addEventListener('input',  () => validateRepos(true));
  langField.addEventListener('change',  () => clearError('lang-error'));
}

// ============================================================
// VALIDATION — each field has its own validator
// Returns true if valid, false if not.
// silent=true means don't show errors (used for submit check).
// ============================================================

function validateKeyword(silent = false) {
  const val = keywordField.value.trim();
  if (!val) {
    if (!silent) showError('keyword-error', 'Keyword is required.');
    return false;
  }
  if (val.length < 2) {
    if (!silent) showError('keyword-error', 'Keyword must be at least 2 characters.');
    return false;
  }
  if (val.length > 50) {
    if (!silent) showError('keyword-error', 'Keyword must be under 50 characters.');
    return false;
  }
  clearError('keyword-error');
  return true;
}

function validateStars(silent = false) {
  const val = starsField.value;
  if (val === '') {
    clearError('stars-error');
    return true; // optional field
  }
  if (isNaN(val) || Number(val) < 0) {
    if (!silent) showError('stars-error', 'Must be a positive number.');
    return false;
  }
  if (Number(val) > 100000) {
    if (!silent) showError('stars-error', 'Value too high — most repos have under 100,000 stars.');
    return false;
  }
  clearError('stars-error');
  return true;
}

function validateLanguage() {
  clearError('lang-error');
  return true; // optional field — backend handles empty language
}

function validateRepos(silent = false) {
  const val = Number(reposField.value);
  if (!reposField.value || isNaN(val)) {
    if (!silent) showError('repos-error', 'This field is required.');
    return false;
  }
  if (val < 1) {
    if (!silent) showError('repos-error', 'Must be at least 1.');
    return false;
  }
  if (val > 30) {
    if (!silent) showError('repos-error', 'Maximum is 30 (GitHub API rate limit).');
    return false;
  }
  clearError('repos-error');
  return true;
}

function validateForm() {
  // Run all validators — collect results (don't short-circuit)
  // so all errors show at once
  const results = [
    validateKeyword(),
    validateStars(),
    validateLanguage(),
    validateRepos(),
  ];
  return results.every(Boolean);
}

// ============================================================
// SAVE
// ============================================================
saveBtn.addEventListener('click', () => {
  if (!validateForm()) {
    // Scroll to first error
    const firstError = form.querySelector('.error-msg:not(:empty)');
    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const config = buildConfig();
  sessionStorage.setItem('aerominer-config', JSON.stringify(config));

  showSuccess();
  updateSaveButton();
});

function buildConfig() {
  return {
    keyword:   keywordField.value.trim(),
    minStars:  starsField.value   ? parseInt(starsField.value)   : 0,
    language:  langField.value,
    maxRepos:  parseInt(reposField.value),
    format:    document.querySelector('input[name="config-format"]:checked')?.value || 'cli',
    savedAt:   new Date().toISOString(),
  };
}

function showSuccess() {
  successMsg.style.display = 'block';
  successMsg.innerHTML = `
    ✅ Configuration saved for this session.
    <a href="pipeline.html">Run the pipeline →</a>
  `;
  setTimeout(() => {
    successMsg.style.opacity = '0';
    setTimeout(() => {
      successMsg.style.display  = 'none';
      successMsg.style.opacity  = '1';
    }, 400);
  }, 4000);
}

function updateSaveButton() {
  saveBtn.textContent = '✓ Saved';
  saveBtn.style.background = '#1a7f37';
  setTimeout(() => {
    saveBtn.textContent      = 'Validate & Save';
    saveBtn.style.background = '';
  }, 2000);
}

// ============================================================
// CLEAR
// ============================================================
clearBtn.addEventListener('click', () => {
  if (!sessionStorage.getItem('aerominer-config')) {
    clearForm();
    return;
  }

  const confirmed = confirm('Clear the current configuration? This cannot be undone.');
  if (!confirmed) return;

  sessionStorage.removeItem('aerominer-config');
  clearForm();

  const restored = document.getElementById('restored-banner');
  if (restored) restored.remove();
});

function clearForm() {
  keywordField.value = '';
  starsField.value   = '';
  langField.value    = '';
  reposField.value   = '';
  clearAllErrors();
  successMsg.style.display = 'none';
  updateCharCount();
}

// ============================================================
// CHAR COUNT for keyword field
// ============================================================
function updateCharCount() {
  let counter = document.getElementById('keyword-counter');
  if (!counter) {
    counter = document.createElement('span');
    counter.id        = 'keyword-counter';
    counter.className = 'char-counter';
    keywordField.parentElement.appendChild(counter);
  }
  const len     = keywordField.value.trim().length;
  counter.textContent = `${len}/50`;
  counter.style.color = len > 45 ? '#f85149' : '#8b949e';
}

// ============================================================
// ERROR HELPERS
// ============================================================
function showError(id, message) {
  const el = document.getElementById(id);
  if (el) el.textContent = message;
}

function clearError(id) {
  const el = document.getElementById(id);
  if (el) el.textContent = '';
}

function clearAllErrors() {
  document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
}