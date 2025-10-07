import { loadState, saveState, initDefault } from './state.js';
import { renderBoard } from './board.js';

let state = await loadState();

if (!state) {
  state = await initDefault();
}

async function handleStateChange(nextState) {
  state = nextState;
  await saveState(state);
  renderBoard(state, { onState: handleStateChange });
}

renderBoard(state, { onState: handleStateChange });
