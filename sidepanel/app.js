import {
  loadState,
  saveState,
  initDefault,
  createDefaultBoard,
} from './state.js';
import { renderBoard } from './board.js';

let state = await loadState();
let awaitingInitialBoard = false;

if (!state) {
  state = await initDefault();
  awaitingInitialBoard = true;
}

async function handleState(nextState) {
  state = nextState;
  await saveState(state);
  renderBoard(state, { onState: handleState });
}

renderBoard(state, { onState: handleState });

if (awaitingInitialBoard) {
  void requestKanbanName();
}

chrome.runtime?.onMessage.addListener((message) => {
  if (message?.type === 'kanban/request-name') {
    void requestKanbanName();
  }
});

async function requestKanbanName() {
  if (!state) {
    state = await initDefault();
    awaitingInitialBoard = true;
  }

  if (!Array.isArray(state.boards) || state.boards.length === 0) {
    const board = createDefaultBoard();
    const seededState = {
      ...state,
      boards: [board],
      activeBoardId: board.id,
    };
    await handleState(seededState);
    state = seededState;
  }

  const activeBoard = state.boards.find((board) => board.id === state.activeBoardId) ?? state.boards[0];
  if (!activeBoard) {
    return;
  }

  const response = prompt('Name your Kanban board', activeBoard.name ?? '');
  const name = response?.trim();
  awaitingInitialBoard = false;
  if (!name || name === activeBoard.name) {
    return;
  }

  const nextBoards = state.boards.map((board) => (
    board.id === activeBoard.id
      ? { ...board, name }
      : board
  ));

  await handleState({
    ...state,
    boards: nextBoards,
  });
}
