// src/app/core/services/session.ts
//
// WHAT THIS IS
// ------------
// The single seam the UI uses to ask "who is signed in" and "log them out". The
// topbar's profile dropdown reads `user` and calls `logout()`; it never knows
// where the answer comes from.
//
// WHAT IS DELIBERATELY FAKE
// -------------------------
// `logout()` clears the token and navigates. It does **not** call the API and
// does **not** wipe the stored token — `BO-D09` owns both, and it cannot be
// built before `BO-D03`'s `AuthService`. Writing that half now would mean
// inventing a token API the auth tasks then have to unpick, so the service is
// the *seam* they replace, not a stub they extend.
//
// The part that is real today is `replaceUrl`. It means the browser's Back
// button leaves `/login` for wherever the user came from, instead of returning
// into the panel they just left (tc 10). The rest of tc 10 depends on
// `BO-D06`'s guard: without one, `/dashboard` is reachable again — but that is
// the guard's job, not this service's.

import { Injectable, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { CurrentUserSignal } from '@core/auth/current-user.token';
import { CURRENT_USER } from '@core/auth/current-user.token';
import { toInitials } from '@shared/models/session.model';

@Injectable({ providedIn: 'root' })
export class SessionService {
  /**
   * The token, not a local signal. Mutating this signal is what makes a test's
   * `useValue` signal the live source of truth — and what lets `BO-D03` replace
   * the provider without touching this class.
   */
  private readonly currentUser = inject(CURRENT_USER);

  private readonly router = inject(Router);

  /**
   * The signed-in user, or `null` when nobody is. Typed as the read-only half
   * of the token on purpose: a caller must not be able to clear the session by
   * calling `user.set(null)`, only by going through `logout()`.
   */
  readonly user: CurrentUserSignal = this.currentUser.asReadonly();

  /**
   * Avatar initials, or `null` when nobody is signed in.
   *
   * The topbar uses this only when `user()?.avatarUrl` is falsy, so an empty
   * string here would render an empty circle instead of falling through to a
   * glyph.
   */
  readonly initials = computed<string | null>(() => {
    const user = this.currentUser();
    return user ? toInitials(user.fullName) : null;
  });

  /**
   * Ends the session and leaves the panel.
   *
   * Order matters: the user signal is cleared **before** the navigation, so the
   * profile menu disappears on the same frame the route changes. Clearing it
   * after would leave the menu rendered for one more change-detection pass,
   * during which its "خروج" item could be clicked again.
   */
  logout(): void {
    this.currentUser.set(null);
    void this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
