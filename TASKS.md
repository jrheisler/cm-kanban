# Repair tasks for cm-kanban

## Critical fixes

1. **Restore the side panel rendering utilities.**
   *Why*: `sidepanel/board.js` imports `html` and `cardView` from `./templates.js`, but that module is missing from the repository, so the ES module loader will throw when the side panel loads, leaving the panel blank.
   *What to do*: Reintroduce a `templates.js` module (or refactor the renderer) that exports the helpers the board depends on so the module graph can load and cards can render again. 【F:sidepanel/board.js†L1-L1】

2. **Guard against an invalid or unset active board.**
   *Why*: `renderBoard` immediately dereferences `b.columns` after looking up `s.activeBoardId`. When a user creates their first board but the active id is still empty or stale, `b` is `undefined`, which crashes the renderer and prevents the side panel from appearing.
   *What to do*: Add validation in `renderBoard` (and/or during state load) to fall back to an available board, initialize the required collections, and surface a friendly empty-state instead of throwing. 【F:sidepanel/board.js†L1-L1】【F:sidepanel/app.js†L1-L1】

3. **Validate stored board data on load.**
   *Why*: The state bootstrapping path in `sidepanel/app.js` simply loads whatever is in storage (or seeds defaults) without verifying that each board has columns, cards arrays, or that `activeBoardId` points to an existing board. Invalid persisted data (for example, from a partially-saved “new board” flow) will therefore crash the UI.
   *What to do*: Introduce a state validation/migration step during `loadState` that repairs missing structure (ensuring columns/cards arrays exist and syncing `activeBoardId`) before the UI renders. 【F:sidepanel/app.js†L1-L1】【F:sidepanel/state.js†L1-L1】

## Follow-up enhancements

4. **Complete the Kanban UI implementation.**
   *Why*: The current `renderBoard` only emits bare column containers and never renders cards or attaches interaction handlers, which contradicts the feature list promised in `README.md` (drag & drop, search, column management).
   *What to do*: Flesh out the renderer and event layer so cards render, can be moved between columns, and the side panel controls (`+ Column`, search input) actually work. 【F:sidepanel/board.js†L1-L1】【F:README.md†L1-L13】

5. **Implement the options page features.**
   *Why*: `options/options.js` only wires up export, leaving import and theme selection (called out in the README) unimplemented, which limits recovery from invalid data and forces users to manually clear storage when things break.
   *What to do*: Add the missing import workflow (with validation) and theme controls so users can recover from corrupted state and configure the board without editing storage directly. 【F:options/options.js†L1-L3】【F:README.md†L1-L13】
