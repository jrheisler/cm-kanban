import { loadState, saveState, initDefault } from './state.js';
import { renderBoard } from './board.js';

let state = await loadState();
if (!state) {
  state = await initDefault();
}

async function handleState(nextState) {
  state = nextState;
  await saveState(state);
  renderBoard(state, { onState: handleState });
}

renderBoard(state, { onState: handleState });
