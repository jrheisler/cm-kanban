import { html, cardView, columnView } from './templates.js';
import { createId } from './state.js';

const boardRoot = document.getElementById('board');
const searchInput = document.getElementById('search');
const addColumnButton = document.getElementById('addColumn');

let activeState = null;
let activeHandlers = null;
let listenersBound = false;
let dragContext = null;
let fixingActiveBoard = false;

export function renderBoard(state, handlers) {
  activeState = state;
  activeHandlers = handlers;

  if (!boardRoot) {
    return;
  }

  bindEventListeners();

  const board = resolveActiveBoard(state);
  if (!board) {
    renderEmptyState('Create a board from the options page to get started.');
    return;
  }

  const query = (searchInput?.value ?? '').trim().toLowerCase();
  const columns = Array.isArray(board.columns) ? board.columns : [];
  const columnsMarkup = columns.map((column) => renderColumn(column, query));

  if (columnsMarkup.length === 0) {
    boardRoot.innerHTML = html`
      <div class="empty-board" role="status">
        This board has no columns yet. Use the “+ Column” button to add your first list.
      </div>
    `;
  } else {
    boardRoot.innerHTML = html`${columnsMarkup}`;
  }

  boardRoot.dataset.activeBoardId = board.id;
}

function bindEventListeners() {
  if (listenersBound || !boardRoot) {
    return;
  }
  listenersBound = true;

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      if (activeState) {
        renderBoard(activeState, activeHandlers);
      }
    });
  }

  if (addColumnButton) {
    addColumnButton.addEventListener('click', async () => {
      if (!activeState) {
        return;
      }
      const name = prompt('Column name');
      if (!name || !name.trim()) {
        return;
      }
      const trimmed = name.trim();
      await updateBoard((board) => ({
        ...board,
        columns: [
          ...board.columns,
          { id: createId('column'), name: trimmed, cards: [] },
        ],
      }));
    });
  }

  boardRoot.addEventListener('click', handleBoardClick);
  boardRoot.addEventListener('dragstart', handleDragStart);
  boardRoot.addEventListener('dragend', handleDragEnd);
  boardRoot.addEventListener('dragenter', handleDragEnter);
  boardRoot.addEventListener('dragover', handleDragOver);
  boardRoot.addEventListener('dragleave', handleDragLeave);
  boardRoot.addEventListener('drop', handleDrop);
}

function resolveActiveBoard(state) {
  if (!state || !Array.isArray(state.boards) || state.boards.length === 0) {
    delete boardRoot.dataset.activeBoardId;
    return null;
  }

  const board = state.boards.find((item) => item.id === state.activeBoardId);
  if (board) {
    return board;
  }

  if (!fixingActiveBoard && activeHandlers?.onState) {
    fixingActiveBoard = true;
    const fallbackState = { ...state, activeBoardId: state.boards[0].id };
    Promise.resolve(activeHandlers.onState(fallbackState)).finally(() => {
      fixingActiveBoard = false;
    });
  }

  delete boardRoot.dataset.activeBoardId;
  return null;
}

function renderEmptyState(message) {
  if (!boardRoot) {
    return;
  }
  boardRoot.innerHTML = html`
    <div class="empty-state" role="status">
      ${message}
    </div>
  `;
  delete boardRoot.dataset.activeBoardId;
}

function renderColumn(column, query) {
  const cards = Array.isArray(column.cards) ? column.cards : [];
  const visibleCards = query
    ? cards.filter((card) => matchesQuery(card, query))
    : cards;

  const cardsMarkup = visibleCards.length
    ? visibleCards.map((card) => cardView(card, { query }))
    : html`<div class="empty-column" role="note">${query ? 'No cards match this search.' : 'No cards yet.'}</div>`;

  return columnView(column, {
    cardsMarkup,
    visibleCount: visibleCards.length,
    totalCount: cards.length,
    queryActive: Boolean(query),
  });
}

function matchesQuery(card, query) {
  const title = (card.title ?? '').toLowerCase();
  const description = (card.description ?? '').toLowerCase();
  return title.includes(query) || description.includes(query);
}

async function updateBoard(mutator) {
  if (!activeState || !activeHandlers?.onState) {
    return;
  }

  const boardIndex = activeState.boards.findIndex((board) => board.id === activeState.activeBoardId);
  if (boardIndex === -1) {
    return;
  }

  const currentBoard = activeState.boards[boardIndex];
  const nextBoard = await mutator(currentBoard);
  if (!nextBoard || nextBoard === currentBoard) {
    return;
  }

  const nextBoards = activeState.boards.map((board, index) => (index === boardIndex ? nextBoard : board));
  const nextState = { ...activeState, boards: nextBoards };
  activeState = nextState;
  await activeHandlers.onState(nextState);
}

async function handleBoardClick(event) {
  const addButton = event.target instanceof HTMLElement ? event.target.closest('.add-card') : null;
  if (!addButton) {
    return;
  }

  const columnId = addButton.dataset.colId;
  if (!columnId) {
    return;
  }

  const columnTitle = addButton.closest('.column')?.querySelector('.column-title')?.textContent ?? 'column';
  const title = prompt(`New card title for ${columnTitle}`);
  if (!title || !title.trim()) {
    return;
  }

  const trimmed = title.trim();
  await updateBoard((board) => {
    const nextColumns = board.columns.map((column) => {
      if (column.id !== columnId) {
        return column;
      }
      return {
        ...column,
        cards: [
          ...column.cards,
          { id: createId('card'), title: trimmed, description: '' },
        ],
      };
    });
    return { ...board, columns: nextColumns };
  });
}

function handleDragStart(event) {
  const cardElement = event.target instanceof HTMLElement ? event.target.closest('.card') : null;
  if (!cardElement) {
    return;
  }

  const columnElement = cardElement.closest('.column');
  if (!columnElement) {
    return;
  }

  dragContext = {
    cardId: cardElement.dataset.cardId,
    fromColumnId: columnElement.dataset.columnId,
  };

  if (event.dataTransfer && dragContext.cardId) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', dragContext.cardId);
  }

  cardElement.classList.add('dragging');
}

function handleDragEnd(event) {
  const cardElement = event.target instanceof HTMLElement ? event.target.closest('.card') : null;
  if (cardElement) {
    cardElement.classList.remove('dragging');
  }
  dragContext = null;
  clearDropIndicators();
}

function handleDragEnter(event) {
  if (!dragContext) {
    return;
  }
  const list = event.target instanceof HTMLElement ? event.target.closest('.card-list') : null;
  if (list) {
    list.classList.add('drop-target');
  }
}

function handleDragOver(event) {
  if (!dragContext) {
    return;
  }
  const list = event.target instanceof HTMLElement ? event.target.closest('.card-list') : null;
  if (!list) {
    return;
  }
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

function handleDragLeave(event) {
  const list = event.target instanceof HTMLElement ? event.target.closest('.card-list') : null;
  if (!list) {
    return;
  }
  const related = event.relatedTarget instanceof HTMLElement ? event.relatedTarget : null;
  if (!related || !list.contains(related)) {
    list.classList.remove('drop-target');
  }
}

function handleDrop(event) {
  if (!dragContext) {
    return;
  }

  const list = event.target instanceof HTMLElement ? event.target.closest('.card-list') : null;
  if (!list) {
    return;
  }
  event.preventDefault();

  const toColumnId = list.dataset.colId;
  const beforeCard = event.target instanceof HTMLElement ? event.target.closest('.card') : null;
  const beforeCardId = beforeCard?.dataset.cardId ?? null;

  const { cardId, fromColumnId } = dragContext;
  dragContext = null;
  clearDropIndicators();

  if (!cardId || !fromColumnId || !toColumnId) {
    return;
  }

  void updateBoard((board) => moveCard(board, cardId, fromColumnId, toColumnId, beforeCardId));
}

function moveCard(board, cardId, fromColumnId, toColumnId, beforeCardId) {
  let cardToMove = null;

  const columnsWithoutCard = board.columns.map((column) => {
    if (column.id !== fromColumnId) {
      return column;
    }
    const remaining = [];
    for (const card of column.cards) {
      if (card.id === cardId) {
        cardToMove = card;
      } else {
        remaining.push(card);
      }
    }
    if (cardToMove) {
      return { ...column, cards: remaining };
    }
    return column;
  });

  if (!cardToMove) {
    return board;
  }

  const targetColumnId = toColumnId || fromColumnId;
  const updatedColumns = columnsWithoutCard.map((column) => {
    if (column.id !== targetColumnId) {
      return column;
    }
    const nextCards = column.cards.slice();
    let insertIndex = nextCards.length;
    if (beforeCardId) {
      const index = nextCards.findIndex((card) => card.id === beforeCardId);
      if (index !== -1) {
        insertIndex = index;
      }
    }
    nextCards.splice(insertIndex, 0, cardToMove);
    return { ...column, cards: nextCards };
  });

  return { ...board, columns: updatedColumns };
}

function clearDropIndicators() {
  if (!boardRoot) {
    return;
  }
  boardRoot.querySelectorAll('.drop-target').forEach((element) => {
    element.classList.remove('drop-target');
  });
}
