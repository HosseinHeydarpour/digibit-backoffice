import { InjectionToken, signal } from '@angular/core';
import type { Signal, WritableSignal } from '@angular/core';
import type { SessionUser } from '@shared/models/session.model';

/**
 * The signed-in user, as a signal so the topbar repaints the moment it changes
 * (login, logout, or a profile edit).
 *
 * WHY A TOKEN AND NOT A SERVICE
 * -----------------------------
 * Who knows who is signed in is not decided yet. `BO-D03` puts it in
 * `AuthService` (the `/auth/me` call), `BO-D04` in `AuthStore`. The topbar only
 * needs *some* signal that carries a `SessionUser`, so it depends on the shape,
 * not the source. Swapping the provider later is a one-line change in
 * `app.config.ts` — the same seam and the same reasoning as `PERMISSIONS`.
 *
 * WHY `WritableSignal` AND NOT `Signal`
 * -------------------------------------
 * `SessionService.logout()` has to clear the identity, and it must do so
 * without knowing who owns the user list — otherwise every future provider
 * would also have to expose a "clear me" method and the seam would stop being
 * one line. The write half lives in the token type; consumers still read
 * through `SessionService.user`, which is a plain `Signal` (`asReadonly()`), so
 * only `SessionService` and tests can mutate anything.
 *
 * The default is **`null`, not a stub user**. A missing provider must never
 * invent an identity: the topbar then renders no profile menu at all, which is
 * the correct thing for an anonymous shell. `app.config.ts` overrides this in
 * mock mode so local development shows a real dropdown.
 */
export const CURRENT_USER = new InjectionToken<WritableSignal<SessionUser | null>>('CURRENT_USER', {
  providedIn: 'root',
  factory: () => signal<SessionUser | null>(null),
});

/** What a consumer reads. The write half is the service's business, not theirs. */
export type CurrentUserSignal = Signal<SessionUser | null>;
