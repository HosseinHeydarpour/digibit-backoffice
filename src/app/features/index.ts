// src/app/features/index.ts
//
// The feature barrel is deliberately EMPTY, and that is a decision rather than an
// omission.
//
// A barrel that re-exports every feature page would make any import of this file
// pull all of them into the same bundle — the exact problem BO-E01's
// `loadChildren` routes exist to avoid. `app.routes.ts` imports each feature
// through its own dynamic `import()`, so nothing here is ever needed.
//
// When a feature IS shared (a service two pages call, a component reused across
// features), it moves to `shared/`, not into this file.

export {};
