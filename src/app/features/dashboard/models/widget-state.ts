// src/app/features/dashboard/models/widget-state.ts
//
// The four render states every dashboard widget cycles through (BO-E07).
//
// WHY A STANDALONE TYPE FILE AND NOT A CONSTANT
// ----------------------------------------------
// The model folder is type-only by design — `RECENT_ORDER_COLS` used to live in
// `dashboard.model.ts` and, because it was a runtime value, got hoisted into a
// shared async chunk that the eager test graph read before it initialised
// (BO-E04 tc 6). A `type` is erased at compile time, so naming it here costs
// nothing at runtime and cannot be shared into a chunk that has not evaluated.
//
// WHY THESE FOUR, IN THIS ORDER
// -----------------------------
// `error` is checked FIRST on purpose: a rejected request that also left the
// data `null` must read as a failure, never as "still loading" or "empty".
// `loading` next (covers both the in-flight flag and a `null` payload that has
// not answered yet), then `empty` (a real "nothing here" answer), then `data`.
export type WidgetState = 'loading' | 'error' | 'empty' | 'data';
