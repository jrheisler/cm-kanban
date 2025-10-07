const boardEl = document.getElementById('board');
const searchInput = document.getElementById('search');
const addColumnButton = document.getElementById('addColumn');

let currentState = null;
let onStateChange = null;
let searchTermRaw = '';
let draggingCardId = null;

if (searchInput && !searchInput.dataset.bound) {
  searchInput.dataset.bound = 'true';
  searchInput.addEventListener('input', handleSearchInput);
}

if (addColumnButton && !addColumnButton.dataset.bound) {
  addColumnButton.dataset.bound = 'true';
  addColumnButton.addEventListener('click', handleAddColumn);
}

export function renderBoard(state, { onState }) {
  currentState = state;
  onStateChange = onState;

  if (!boardEl) {
    return;
  }

  const activeBoard = state.boards.find((board) => board.id === state.activeBoardId);

  if (!activeBoard) {
    boardEl.innerHTML = "<p class='empty'>Create a board from the options page.</p>";
    return;
  }

  if (searchInput && searchInput.value !== searchTermRaw) {
    searchInput.value = searchTermRaw;
  }

  const cardsByColumn = groupCardsByColumn(activeBoard.cards, searchTermRaw);

  boardEl.innerHTML = activeBoard.columns
    .map((column) => renderColumn(column, cardsByColumn.get(column.id) ?? []))
    .join('');

  bindColumnInteractions();
}

function handleSearchInput(event) {
  searchTermRaw = event.target.value;

  if (currentState && onStateChange) {
    renderBoard(currentState, { onState: onStateChange });
  }
}

function handleAddColumn() {
  if (!currentState || !onStateChange) {
    return;
  }

  const name = prompt('Column name?', '');

  if (name === null) {
    return;
  }

  const nextState = cloneState(currentState);
  const board = nextState.boards.find((item) => item.id === nextState.activeBoardId);

  if (!board) {
    return;
  }

  board.columns.push({ id: crypto.randomUUID(), name: name.trim() || 'New Column' });
  onStateChange(nextState);
}

function bindColumnInteractions() {
  if (!boardEl) {
    return;
  }

  boardEl.querySelectorAll('.add-card').forEach((button) => {
    if (button.dataset.bound) {
      return;
    }

    button.dataset.bound = 'true';
    button.addEventListener('click', () => handleAddCard(button.dataset.colId));
  });

  boardEl.querySelectorAll('.card').forEach((card) => {
    if (card.dataset.bound) {
      return;
    }

    card.dataset.bound = 'true';
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
  });

  boardEl.querySelectorAll('.card-delete').forEach((button) => {
    if (button.dataset.bound) {
      return;
    }

    button.dataset.bound = 'true';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      handleDeleteCard(button.dataset.cardId);
    });
  });

  boardEl.querySelectorAll('.card-list').forEach((list) => {
    if (list.dataset.bound) {
      return;
    }

    list.dataset.bound = 'true';
    list.addEventListener('dragover', handleDragOver);
    list.addEventListener('drop', handleDrop);
  });
}

function handleAddCard(columnId) {
  if (!currentState || !onStateChange || !columnId) {
    return;
  }

  const title = prompt('Card title?', '');

  if (title === null) {
    return;
  }

  const nextState = cloneState(currentState);
  const board = nextState.boards.find((item) => item.id === nextState.activeBoardId);

  if (!board) {
    return;
  }

  board.cards.push({
    id: crypto.randomUUID(),
    title: title.trim() || 'New card',
    columnId,
  });

  onStateChange(nextState);
}

function handleDeleteCard(cardId) {
  if (!currentState || !onStateChange || !cardId) {
    return;
  }

  const confirmed = confirm('Delete this card?');

  if (!confirmed) {
    return;
  }

  const nextState = cloneState(currentState);
  const board = nextState.boards.find((item) => item.id === nextState.activeBoardId);

  if (!board) {
    return;
  }

  const index = board.cards.findIndex((card) => card.id === cardId);

  if (index === -1) {
    return;
  }

  board.cards.splice(index, 1);
  onStateChange(nextState);
}

function handleDragStart(event) {
  draggingCardId = event.currentTarget.dataset.cardId || null;

  if (!draggingCardId) {
    return;
  }

  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', draggingCardId);
}

function handleDragEnd() {
  draggingCardId = null;
}

function handleDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
}

function handleDrop(event) {
  event.preventDefault();

  const columnId = event.currentTarget.dataset.colId;

  if (!columnId || !draggingCardId || !currentState || !onStateChange) {
    return;
  }

  const nextState = cloneState(currentState);
  const board = nextState.boards.find((item) => item.id === nextState.activeBoardId);

  if (!board) {
    draggingCardId = null;
    return;
  }

  const index = board.cards.findIndex((card) => card.id === draggingCardId);

  if (index === -1) {
    draggingCardId = null;
    return;
  }

  const [card] = board.cards.splice(index, 1);
  card.columnId = columnId;
  board.cards.push(card);

  draggingCardId = null;
  onStateChange(nextState);
}

function renderColumn(column, cards) {
  const cardMarkup = cards.length
    ? cards.map(renderCard).join('')
    : "<p class='empty'>No cards</p>";

  return `
    <section class="column">
      <div class="col-head">${escapeHtml(column.name)}</div>
      <div class="card-list" data-col-id="${column.id}">
        ${cardMarkup}
      </div>
      <button class="add-card" data-col-id="${column.id}">+ Add</button>
    </section>
  `;
}

function renderCard(card) {
  return `
    <article class="card" draggable="true" data-card-id="${card.id}">
      <button
        class="card-delete"
        type="button"
        data-card-id="${card.id}"
        aria-label="Delete card"
        title="Delete card"
      >
        ×
      </button>
      <div class="card-title">${escapeHtml(card.title)}</div>
    </article>
  `;
}

function groupCardsByColumn(cards, term) {
  const matcher = term ? term.trim().toLowerCase() : '';
  const grouped = new Map();

  cards.forEach((card) => {
    if (matcher && !card.title.toLowerCase().includes(matcher)) {
      return;
    }

    if (!grouped.has(card.columnId)) {
      grouped.set(card.columnId, []);
    }

    grouped.get(card.columnId).push(card);
  });

  return grouped;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) =>
    ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    })[char],
  );
}

function cloneState(state) {
  if (typeof structuredClone === 'function') {
    return structuredClone(state);
  }

  return JSON.parse(JSON.stringify(state));
}
