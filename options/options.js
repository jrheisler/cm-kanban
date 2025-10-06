import { loadState, saveState, initDefault, normalizeState } from '../sidepanel/state.js';

const exportButton = document.getElementById('export');
const importInput = document.getElementById('import');
const themeSelect = document.getElementById('theme');
const statusElement = document.getElementById('status');

let state = await loadState();
if (!state) {
  state = await initDefault();
}

if (themeSelect) {
  themeSelect.value = state.settings?.theme ?? 'dark';
}

if (exportButton) {
  exportButton.addEventListener('click', handleExport);
}

if (importInput) {
  importInput.addEventListener('change', handleImport);
}

if (themeSelect) {
  themeSelect.addEventListener('change', handleThemeChange);
}

function announce(message, variant = 'info') {
  if (!statusElement) {
    return;
  }
  statusElement.textContent = message;
  statusElement.classList.remove('success', 'error');
  if (variant === 'success') {
    statusElement.classList.add('success');
  } else if (variant === 'error') {
    statusElement.classList.add('error');
  }
}

async function handleExport() {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'kanban.json';
  anchor.click();
  URL.revokeObjectURL(url);
  announce('Exported current board data.', 'success');
}

async function handleImport(event) {
  const input = event.target;
  const file = input.files?.[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      throw new Error('The selected file does not contain valid JSON.');
    }

    const { state: normalized, diagnostics } = normalizeState(parsed);
    state = normalized;
    await saveState(state);

    if (themeSelect) {
      themeSelect.value = state.settings?.theme ?? 'dark';
    }

    const note = diagnostics.length ? ` Fixes applied: ${diagnostics.join(' ')}` : '';
    announce(`Import successful.${note}`, 'success');
  } catch (error) {
    console.error(error);
    announce(error.message || 'Import failed.', 'error');
  } finally {
    input.value = '';
  }
}

async function handleThemeChange(event) {
  const selectedTheme = event.target.value;
  if (!['dark', 'light', 'system'].includes(selectedTheme)) {
    announce('Unknown theme selected.', 'error');
    return;
  }

  state = {
    ...state,
    settings: {
      ...state.settings,
      theme: selectedTheme,
    },
  };
  await saveState(state);
  announce(`Theme updated to “${selectedTheme}”.`, 'success');
}
