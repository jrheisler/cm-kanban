import { loadState, saveState, initDefault } from '../sidepanel/state.js';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'kanban-add',
    title: 'Add to Kanban',
    contexts: ['selection', 'page'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'kanban-add') {
    return;
  }

  let state = await loadState();

  if (!state) {
    state = await initDefault();
  }

  const board = state.boards.find((item) => item.id === state.activeBoardId);

  if (!board || board.columns.length === 0) {
    return;
  }

  const title = info.selectionText?.trim() || tab?.title?.trim() || 'New card';

  board.cards.push({
    id: crypto.randomUUID(),
    title,
    columnId: board.columns[0].id,
  });

  await saveState(state);
});
