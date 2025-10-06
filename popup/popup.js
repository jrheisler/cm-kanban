import { loadState, saveState, initDefault } from '../sidepanel/state.js';

const saveButton = document.getElementById('save');

saveButton?.addEventListener('click', async () => {
  let state = await loadState();

  if (!state || !Array.isArray(state.boards) || state.boards.length === 0) {
    state = await initDefault();
  }

  let board = state.boards.find((candidate) => candidate.id === state.activeBoardId);

  if (!board && state.boards.length > 0) {
    board = state.boards[0];
    state.activeBoardId = board.id;
  }

  if (!board) {
    state = await initDefault();
    board = state.boards[0];
  }

  if (!Array.isArray(board.columns) || board.columns.length === 0) {
    const column = { id: crypto.randomUUID(), name: 'Backlog' };
    board.columns = [column];
  }

  if (!Array.isArray(board.cards)) {
    board.cards = [];
  }

  const titleInput = document.getElementById('title');
  const title = titleInput?.value?.trim();
  const cardTitle = title?.length ? title : 'New task';

  board.cards.push({
    id: crypto.randomUUID(),
    title: cardTitle,
    columnId: board.columns[0].id,
  });

  await saveState(state);
  window.close();
});
