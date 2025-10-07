import { STORAGE_KEY, createDefaultState } from '../sidepanel/state.js';

const KANBAN_ADD_ID = 'kanban-add';

chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: KANBAN_ADD_ID,
    title: 'Add to Kanban',
    contexts: ['selection', 'page'],
  });

  if (chrome.sidePanel?.setPanelBehavior) {
    try {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    } catch (error) {
      console.error('Failed to configure side panel behavior.', error);
    }
  }
});

chrome.commands?.onCommand.addListener(async (command) => {
  if (command !== 'open_side_panel') {
    return;
  }

  const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const targetWindowId = activeTab?.windowId ?? chrome.windows?.WINDOW_ID_CURRENT;
  if (targetWindowId !== undefined) {
    await openSidePanel(targetWindowId);
  }

  await requestKanbanName(targetWindowId, { ensureVisible: false });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== KANBAN_ADD_ID) {
    return;
  }

  const state = await loadKanbanState();
  if (!state) {
    await requestKanbanName(tab?.windowId);
    return;
  }

  const board = state.boards.find((candidate) => candidate.id === state.activeBoardId) ?? state.boards[0];
  if (!board) {
    await requestKanbanName(tab?.windowId);
    return;
  }

  if (!Array.isArray(board.columns) || board.columns.length === 0) {
    console.warn('Active board is missing columns; cannot add card from context menu.');
    return;
  }

  const [firstColumn] = board.columns;
  if (!firstColumn) {
    console.warn('No available column found for the active board.');
    return;
  }

  if (!Array.isArray(firstColumn.cards)) {
    firstColumn.cards = [];
  }

  firstColumn.cards.push({
    id: crypto.randomUUID(),
    title: info.selectionText || info.linkUrl || tab?.title || 'New card',
    description: '',
  });

  await chrome.storage.local.set({ [STORAGE_KEY]: state });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'kanban/ensure-side-panel-open') {
    return undefined;
  }

  const windowId = sender?.tab?.windowId ?? sender?.windowId ?? chrome.windows?.WINDOW_ID_CURRENT;

  (async () => {
    if (windowId !== undefined) {
      await openSidePanel(windowId);
    }
    sendResponse();
  })().catch((error) => {
    console.warn('Failed to ensure side panel is open.', error);
    sendResponse();
  });

  return true;
});

async function loadKanbanState() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const state = stored[STORAGE_KEY];
  if (!state || !Array.isArray(state.boards) || state.boards.length === 0) {
    return null;
  }
  return state;
}

async function hasKanban() {
  const state = await loadKanbanState();
  return Boolean(state);
}

async function openSidePanel(windowId) {
  if (!chrome.sidePanel?.open) {
    return;
  }
  try {
    await chrome.sidePanel.open({ windowId });
  } catch (error) {
    console.error('Failed to open side panel.', error);
  }
}

async function requestKanbanName(windowId, { ensureVisible = true } = {}) {
  const targetWindowId = windowId ?? chrome.windows?.WINDOW_ID_CURRENT;
  const existingState = await loadKanbanState();

  if (existingState) {
    if (ensureVisible && targetWindowId !== undefined) {
      await openSidePanel(targetWindowId);
    }
    return;
  }

  let resolvedWindowId = targetWindowId;
  if (
    resolvedWindowId === undefined
    && ensureVisible
    && chrome.windows?.getCurrent
  ) {
    try {
      const currentWindow = await chrome.windows.getCurrent();
      if (typeof currentWindow?.id === 'number') {
        resolvedWindowId = currentWindow.id;
      }
    } catch (error) {
      console.warn('Unable to determine current window for side panel.', error);
    }
  }

  if (resolvedWindowId !== undefined) {
    await openSidePanel(resolvedWindowId);
  }

  let initializedViaPanel = false;
  if (chrome.runtime?.sendMessage) {
    try {
      await chrome.runtime.sendMessage({ type: 'kanban/request-name' });
      initializedViaPanel = true;
    } catch (error) {
      console.warn('Unable to request Kanban name from side panel.', error);
    }
  }

  if (!initializedViaPanel) {
    await chrome.storage.local.set({ [STORAGE_KEY]: createDefaultState() });
  }
}
