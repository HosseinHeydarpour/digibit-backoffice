import type { WritableSignal } from '@angular/core';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CURRENT_USER } from '@core/auth/current-user.token';
import { PermissionsService } from '@core/auth/permissions.service';
import {
  clearTokens,
  readAccessToken,
  readRefreshToken,
  writeTokens,
} from '@core/auth/token-storage';
import { ApiService } from '@core/services/api';
import { ToastService } from '@core/services/toast';
import type { SessionUser } from '@shared/models/session.model';
import {
  Observable,
  catchError,
  finalize,
  map,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';

interface TokenPair {
  readonly accessToken: string;
  readonly refreshToken: string;
}

interface MeResponse {
  readonly id: string;
  readonly fullName: string;
  readonly role: string;
  readonly permissions: readonly string[];
}

export interface PasswordResetRequest {
  readonly message: string;
  readonly debugToken?: string | null;
}

/**
 * The single owner of the session: login, the signed-in identity, the grant
 * list and logout.
 *
 * `CURRENT_USER` and `PERMISSIONS` stay the injection seams they always were;
 * `PermissionsService` is the reader both the guard and the directive use.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly currentUser: WritableSignal<SessionUser | null> = inject(CURRENT_USER);
  private readonly permissions = inject(PermissionsService);
  private readonly toast = inject(ToastService);

  private refreshing: Observable<TokenPair> | null = null;

  /** One expiry notice per session, not one per queued request. */
  private expiryNotified = false;

  /** `POST /auth/admin/login` → tokens stored → `/auth/me` loaded. */
  login(email: string, password: string): Observable<SessionUser> {
    return this.api.post<TokenPair>('/auth/admin/login', { email, password }).pipe(
      tap((pair) => {
        writeTokens(pair.accessToken, pair.refreshToken);
        this.expiryNotified = false;
      }),
      switchMap(() => this.loadMe()),
    );
  }

  /** `GET /auth/me` → the identity and the grants the UI filters on. */
  loadMe(): Observable<SessionUser> {
    return this.api.get<MeResponse>('/auth/me').pipe(
      map((me) => {
        const user: SessionUser = {
          id: me.id,
          fullName: me.fullName,
          email: null,
          avatarUrl: null,
        };

        this.permissions.set(me.permissions ?? []);
        this.currentUser.set(user);
        this.expiryNotified = false;

        return user;
      }),
    );
  }

  /** `POST /auth/refresh`; concurrent callers share one request. */
  refresh(): Observable<TokenPair> {
    if (this.refreshing) {
      return this.refreshing;
    }

    const refreshToken = readRefreshToken();

    if (!refreshToken) {
      return throwError(() => new Error('NO_REFRESH_TOKEN'));
    }

    this.refreshing = this.api.post<TokenPair>('/auth/refresh', { refreshToken }).pipe(
      tap((pair) => writeTokens(pair.accessToken, pair.refreshToken)),
      finalize(() => {
        this.refreshing = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    return this.refreshing;
  }

  /** `POST /auth/admin/change-password`; the server revokes other sessions. */
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.api
      .post<unknown>('/auth/admin/change-password', { currentPassword, newPassword })
      .pipe(map(() => undefined));
  }

  /**
   * `POST /auth/admin/forgot` (BO-D11).
   *
   * The message is deliberately identical whether or not the address exists.
   * In development the API also returns `debugToken`; the page may offer a
   * reset link from it, because there is no mailbox in that environment.
   */
  requestPasswordReset(email: string): Observable<PasswordResetRequest> {
    return this.api.post<PasswordResetRequest>('/auth/admin/forgot', { email });
  }

  /** `POST /auth/admin/reset` with the token the email carried. */
  resetPassword(email: string, token: string, newPassword: string): Observable<void> {
    return this.api
      .post<unknown>('/auth/admin/reset', { email, token, newPassword })
      .pipe(map(() => undefined));
  }

  /**
   * `POST /auth/logout`, then the local state is cleared whatever the server
   * answered: a failed request must not leave the user signed in on screen.
   */
  logout(): void {
    const done = (): void => {
      this.clearSession();
      void this.router.navigateByUrl('/login', { replaceUrl: true });
    };

    if (!readAccessToken() && !readRefreshToken()) {
      done();
      return;
    }

    this.api
      .post<unknown>('/auth/logout', {})
      .pipe(catchError(() => of(null)))
      .subscribe(done);
  }

  /**
   * The refresh token was rejected: say so once, clear everything and leave.
   *
   * The interceptor calls this instead of navigating itself, so ten parallel
   * requests produce one message and one navigation.
   */
  expireSession(): void {
    this.clearSession();

    if (!this.expiryNotified) {
      this.expiryNotified = true;
      this.toast.warning('نشست شما منقضی شد. دوباره وارد شوید.');
    }

    void this.router.navigate(['/login'], {
      queryParams: { returnUrl: this.router.url },
      replaceUrl: true,
    });
  }

  /** Boot: restore the identity when a token survived the reload. */
  restore(): Promise<void> {
    if (!readAccessToken() && !readRefreshToken()) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.loadMe()
        .pipe(catchError(() => of(null)))
        .subscribe((user) => {
          if (!user) {
            this.clearSession();
          }

          resolve();
        });
    });
  }

  private clearSession(): void {
    clearTokens();
    this.currentUser.set(null);
    this.permissions.clear();
  }
}
