import { initDefault, loadState, saveState } from '../sidepanel/state.js';

const titleInput = document.getElementById('title');
const saveButton = document.getElementById('save');

saveButton?.addEventListener('click', handleSaveClick);

titleInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    saveButton?.click();
  }
});

async function handleSaveClick() {
  let state = await loadState();

  if (!state) {
    state = await initDefault();
  }

  const activeBoard = state.boards.find((board) => board.id === state.activeBoardId);

  if (!activeBoard || activeBoard.columns.length === 0) {
    return;
  }

  const title = titleInput?.value.trim();

  if (!title) {
    titleInput?.focus();
    return;
  }

  activeBoard.cards.push({
    id: crypto.randomUUID(),
    title,
    columnId: activeBoard.columns[0].id,
  });

  await saveState(state);
  window.close();
}
