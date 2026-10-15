import { InjectionToken, signal } from '@angular/core';
import type { Signal } from '@angular/core';

/**
 * The signed-in user's permission list, as a signal so the sidebar recomputes
 * the moment it changes (e.g. on re-login).
 *
 * This token exists to keep BO-B03 unblocked: the sidebar only needs *some*
 * list of permission strings, and `BO-D08` decides where they actually come
 * from (`/auth/me`). Swapping the provider later is a one-line change in
 * `app.config.ts` — the sidebar and `filterMenu()` never learn the difference.
 *
 * The default is **empty, not "grant everything"**. A missing provider must
 * never widen access; failing closed is the only safe direction. The visible
 * consequence is an empty sidebar, which is why `app.config.ts` overrides this
 * in mock mode so local development is not mysteriously blank.
 *
 * Typed loosely as `string` rather than the `Permission` union on purpose: the
 * value arrives from the server at runtime, so it cannot be constrained by a
 * compile-time union. `filterMenu()` ignores anything it does not recognise.
 */
export const PERMISSIONS = new InjectionToken<Signal<readonly string[]>>('PERMISSIONS', {
  providedIn: 'root',
  factory: () => signal<readonly string[]>([]),
});
