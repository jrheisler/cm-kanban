const STORAGE_KEY = 'kanban.v1';
const ALLOWED_THEMES = new Set(['dark', 'light', 'system']);

const DEFAULT_BOARD = Object.freeze({
  id: 'board-default',
  name: 'Kanban',
  labels: [],
  columns: [
    {
      id: 'col-backlog',
      name: 'Backlog',
      cards: [
        {
          id: 'card-welcome',
          title: 'Welcome to cm-kanban',
          description: 'Use "+ Column" to add more lists and start capturing your ideas.',
        },
      ],
    },
    {
      id: 'col-progress',
      name: 'In Progress',
      cards: [
        {
          id: 'card-drag',
          title: 'Drag cards between columns',
          description: 'Grab a card, move it to a new status, and drop it where it belongs.',
        },
      ],
    },
    {
      id: 'col-done',
      name: 'Done',
      cards: [
        {
          id: 'card-search',
          title: 'Try the search bar',
          description: 'Filter cards instantly by typing a keyword at the top of the panel.',
        },
      ],
    },
  ],
});

const DEFAULT_STATE = Object.freeze({
  version: 1,
  boards: [DEFAULT_BOARD],
  activeBoardId: DEFAULT_BOARD.id,
  settings: {
    theme: 'dark',
  },
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createDefaultBoard() {
  return clone(DEFAULT_BOARD);
}

export function createDefaultState() {
  return clone(DEFAULT_STATE);
}

export function createId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  const random = Math.random().toString(36).slice(2, 10);
  const timestamp = Date.now().toString(36);
  return `${prefix}-${timestamp}${random}`;
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeCard(card, index, diagnostics, boardName, columnName, tracker) {
  if (!isPlainObject(card)) {
    tracker.changed = true;
    diagnostics.push(`Removed invalid card at position ${index + 1} in "${columnName}" on "${boardName}".`);
    return null;
  }

  const idSource = typeof card.id === 'string' ? card.id.trim() : '';
  const id = idSource || createId('card');
  if (id !== card.id) {
    tracker.changed = true;
  }

  const titleSource = typeof card.title === 'string' ? card.title.trim() : '';
  const title = titleSource || 'Untitled card';
  if (title !== card.title) {
    tracker.changed = true;
  }

  const description = typeof card.description === 'string' ? card.description : '';
  if (description !== card.description) {
    tracker.changed = true;
  }

  return { id, title, description };
}

function normalizeColumn(column, index, diagnostics, boardName, tracker) {
  if (!isPlainObject(column)) {
    tracker.changed = true;
    diagnostics.push(`Removed invalid column at position ${index + 1} on "${boardName}".`);
    return null;
  }

  const nameSource = typeof column.name === 'string' ? column.name.trim() : '';
  const name = nameSource || `Column ${index + 1}`;
  if (name !== column.name) {
    tracker.changed = true;
  }

  const idSource = typeof column.id === 'string' ? column.id.trim() : '';
  const id = idSource || createId('column');
  if (id !== column.id) {
    tracker.changed = true;
  }

  const normalized = {
    id,
    name,
    cards: [],
  };

  const cardsSource = Array.isArray(column.cards) ? column.cards : [];
  if (!Array.isArray(column.cards)) {
    tracker.changed = true;
    diagnostics.push(`Column "${name}" on "${boardName}" was missing cards; initialized an empty list.`);
  }

  for (let i = 0; i < cardsSource.length; i += 1) {
    const card = normalizeCard(cardsSource[i], i, diagnostics, boardName, name, tracker);
    if (card) {
      normalized.cards.push(card);
    }
  }

  if (normalized.cards.length !== cardsSource.length) {
    tracker.changed = true;
  }

  return normalized;
}

function normalizeBoard(board, index, diagnostics, tracker) {
  if (!isPlainObject(board)) {
    tracker.changed = true;
    diagnostics.push(`Removed invalid board at position ${index + 1}.`);
    return null;
  }

  const nameSource = typeof board.name === 'string' ? board.name.trim() : '';
  const fallbackName = index === 0 ? 'Kanban' : `Board ${index + 1}`;
  const name = nameSource || fallbackName;
  if (name !== board.name) {
    tracker.changed = true;
  }

  const idSource = typeof board.id === 'string' ? board.id.trim() : '';
  const id = idSource || createId('board');
  if (id !== board.id) {
    tracker.changed = true;
  }

  const labels = Array.isArray(board.labels) ? board.labels.filter((label) => typeof label === 'string') : [];
  if (!Array.isArray(board.labels) || labels.length !== board.labels.length) {
    tracker.changed = true;
  }

  const normalized = {
    id,
    name,
    labels,
    columns: [],
  };

  let columnsSource = Array.isArray(board.columns) ? board.columns : [];
  if (!Array.isArray(board.columns) || board.columns.length === 0) {
    tracker.changed = true;
    diagnostics.push(`Board "${name}" was missing columns; added defaults.`);
    columnsSource = createDefaultBoard().columns;
  }

  for (let i = 0; i < columnsSource.length; i += 1) {
    const column = normalizeColumn(columnsSource[i], i, diagnostics, name, tracker);
    if (column) {
      normalized.columns.push(column);
    }
  }

  if (normalized.columns.length === 0) {
    tracker.changed = true;
    diagnostics.push(`Board "${name}" had no valid columns; added defaults.`);
    normalized.columns = createDefaultBoard().columns;
  }

  return normalized;
}

export function normalizeState(rawState) {
  const diagnostics = [];
  const tracker = { changed: false };

  if (!isPlainObject(rawState)) {
    diagnostics.push('State was empty or invalid; replaced with defaults.');
    return { state: createDefaultState(), changed: true, diagnostics };
  }

  const normalized = {
    version: 1,
    boards: [],
    activeBoardId: '',
    settings: {
      theme: 'dark',
    },
  };

  if (rawState.version !== 1) {
    tracker.changed = true;
  }

  const boardsSource = Array.isArray(rawState.boards) ? rawState.boards : [];
  if (!Array.isArray(rawState.boards)) {
    tracker.changed = true;
    diagnostics.push('State was missing boards; added default board.');
  }

  for (let i = 0; i < boardsSource.length; i += 1) {
    const board = normalizeBoard(boardsSource[i], i, diagnostics, tracker);
    if (board) {
      normalized.boards.push(board);
    }
  }

  if (normalized.boards.length === 0) {
    tracker.changed = true;
    diagnostics.push('No usable boards found; added default board.');
    normalized.boards.push(createDefaultBoard());
  }

  const requestedBoardId = typeof rawState.activeBoardId === 'string' && rawState.activeBoardId.trim()
    ? rawState.activeBoardId.trim()
    : '';
  const hasRequestedBoard = normalized.boards.some((board) => board.id === requestedBoardId);
  normalized.activeBoardId = hasRequestedBoard ? requestedBoardId : normalized.boards[0].id;
  if (!hasRequestedBoard) {
    tracker.changed = true;
    diagnostics.push('Active board was missing or invalid; switched to the first available board.');
  }

  if (isPlainObject(rawState.settings) && typeof rawState.settings.theme === 'string') {
    const normalizedTheme = rawState.settings.theme.trim().toLowerCase();
    if (ALLOWED_THEMES.has(normalizedTheme)) {
      normalized.settings.theme = normalizedTheme;
      if (normalized.settings.theme !== rawState.settings.theme) {
        tracker.changed = true;
      }
    } else {
      tracker.changed = true;
      diagnostics.push('Theme value was invalid; reverted to "dark".');
    }
  } else if (rawState.settings !== undefined) {
    tracker.changed = true;
    diagnostics.push('Settings were malformed; reset to defaults.');
  }

  return {
    state: normalized,
    changed: tracker.changed,
    diagnostics,
  };
}

export async function loadState() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const rawState = stored[STORAGE_KEY];
  if (!rawState) {
    return null;
  }

  const { state, changed } = normalizeState(rawState);
  if (changed) {
    await saveState(state);
  }
  return state;
}

export async function saveState(state) {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

export async function initDefault() {
  const state = createDefaultState();
  await saveState(state);
  return state;
}

export { STORAGE_KEY };
