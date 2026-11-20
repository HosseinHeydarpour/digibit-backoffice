import type { WritableSignal } from '@angular/core';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CURRENT_USER } from '@core/auth/current-user.token';
import { expandPermissions } from '@core/auth/permission-catalog';
import { PERMISSIONS } from '@core/auth/permissions.token';
import {
  clearTokens,
  readAccessToken,
  readRefreshToken,
  writeTokens,
} from '@core/auth/token-storage';
import { ApiService } from '@core/services/api';
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

/**
 * The single owner of the session: login, the signed-in identity, the grant
 * list and logout.
 *
 * `CURRENT_USER` and `PERMISSIONS` stay the injection seams they always were;
 * this service is the writer both of them were waiting for. Nothing else in the
 * app reads a token, which is what keeps the storage key in one file.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly currentUser: WritableSignal<SessionUser | null> = inject(CURRENT_USER);
  private readonly permissions: WritableSignal<readonly string[]> = inject(PERMISSIONS);

  private refreshing: Observable<TokenPair> | null = null;

  /** `POST /auth/admin/login` → tokens stored → `/auth/me` loaded. */
  login(email: string, password: string): Observable<SessionUser> {
    return this.api.post<TokenPair>('/auth/admin/login', { email, password }).pipe(
      tap((pair) => writeTokens(pair.accessToken, pair.refreshToken)),
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

        this.permissions.set(expandPermissions(me.permissions ?? []));
        this.currentUser.set(user);

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

  /**
   * `POST /auth/logout`, then the local state is cleared whatever the server
   * answered: a failed request must not leave the user signed in on screen.
   */
  logout(): void {
    const done = (): void => {
      clearTokens();
      this.currentUser.set(null);
      this.permissions.set([]);
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
            clearTokens();
            this.currentUser.set(null);
            this.permissions.set([]);
          }

          resolve();
        });
    });
  }
}
