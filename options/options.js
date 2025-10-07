const KEY = 'kanban.v1';
const exportButton = document.getElementById('export');
const importInput = document.getElementById('import');
const statusEl = document.getElementById('status');

exportButton?.addEventListener('click', handleExportClick);
importInput?.addEventListener('change', handleImportChange);

async function handleExportClick() {
  const stored = await chrome.storage.local.get(KEY);
  const state = stored[KEY];

  if (state == null) {
    showStatus('Nothing to export yet.', 'info');
    return;
  }

  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: 'application/json',
  });

  const download = document.createElement('a');
  download.href = URL.createObjectURL(blob);
  download.download = 'kanban.json';
  download.click();

  showStatus('Export ready.', 'info');
}


async function handleImportChange(event) {
  const input = event.target;
  const file = input.files?.[0];

  if (!file) {
    showStatus('No file selected.', 'error');
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    validateState(parsed);

    await chrome.storage.local.set({ [KEY]: parsed });
    showStatus('Import successful.', 'success');
  } catch (error) {
    console.error('Failed to import Kanban data', error);
    showStatus('Import failed. Please select a valid Kanban export file.', 'error');
  } finally {
    input.value = '';
  }
}

function validateState(value) {
  if (!value || typeof value !== 'object') {
    throw new Error('State must be an object.');
  }

  if (!Array.isArray(value.boards)) {
    throw new Error('Missing boards.');
  }

  value.boards.forEach((board) => {
    if (!board || typeof board !== 'object') {
      throw new Error('Invalid board.');
    }

    if (!Array.isArray(board.columns)) {
      throw new Error('Board missing columns.');
    }

    if (!Array.isArray(board.cards)) {
      throw new Error('Board missing cards.');
    }
  });

  if (typeof value.activeBoardId !== 'string') {
    throw new Error('Missing active board reference.');
  }
}

function showStatus(message, tone = 'info') {
  if (!statusEl) {
    return;
  }

  statusEl.textContent = message;
  if (tone) {
    statusEl.dataset.tone = tone;
  } else {
    delete statusEl.dataset.tone;
  }
}
