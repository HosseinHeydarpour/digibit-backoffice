import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { CURRENT_USER } from '@core/auth/current-user.token';
import { PERMISSIONS } from '@core/auth/permissions.token';
import { clearTokens } from '@core/auth/token-storage';
import { ToastService } from '@core/services/toast';
import { environment } from '@env/environment';
import type { SessionUser } from '@shared/models/session.model';
import { firstValueFrom } from 'rxjs';

import { AuthService } from './auth';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  let user: WritableSignal<SessionUser | null>;
  let permissions: WritableSignal<readonly string[]>;
  let toast: { warning: ReturnType<typeof vi.fn>; success: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    clearTokens();
    user = signal<SessionUser | null>(null);
    permissions = signal<readonly string[]>([]);
    toast = { warning: vi.fn(), success: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CURRENT_USER, useValue: user },
        { provide: PERMISSIONS, useValue: permissions },
        { provide: ToastService, useValue: toast },
      ],
    });

    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    clearTokens();
  });

  it('logs in, stores the tokens and loads the identity', async () => {
    const promise = firstValueFrom(service.login('admin@digibit.local', 'Admin@12345'));

    http
      .expectOne(`${environment.API_BASE_URL}/auth/admin/login`)
      .flush({ accessToken: 'access-1', refreshToken: 'refresh-1' });

    http.expectOne(`${environment.API_BASE_URL}/auth/me`).flush({
      id: '1',
      fullName: 'مدیر سیستم',
      role: 'Admin',
      permissions: ['*'],
    });

    expect((await promise).fullName).toBe('مدیر سیستم');
    expect(user()).toMatchObject({ id: '1', fullName: 'مدیر سیستم' });
    expect(permissions()).toContain('products.view');
    expect(localStorage.getItem(environment.TOKEN_STORAGE_KEY)).toBe('access-1');
  });

  it('expands a manage grant into its view grant', async () => {
    const promise = firstValueFrom(service.loadMe());

    http
      .expectOne(`${environment.API_BASE_URL}/auth/me`)
      .flush({ id: '2', fullName: 'مدیر محصول', role: 'Admin', permissions: ['products.manage'] });

    await promise;
    expect(permissions()).toEqual(expect.arrayContaining(['products.manage', 'products.view']));
  });

  it('logout clears the session even when the request fails', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    localStorage.setItem(environment.TOKEN_STORAGE_KEY, 'access-1');
    user.set({ id: '1', fullName: 'مدیر', email: null, avatarUrl: null });

    service.logout();

    http
      .expectOne(`${environment.API_BASE_URL}/auth/logout`)
      .flush({ message: 'failed' }, { status: 500, statusText: 'err' });

    expect(user()).toBeNull();
    expect(permissions()).toEqual([]);
    expect(localStorage.getItem(environment.TOKEN_STORAGE_KEY)).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/login', { replaceUrl: true });
  });

  it('expires the session once, with a message and a returnUrl', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    localStorage.setItem(environment.TOKEN_STORAGE_KEY, 'access-1');
    user.set({ id: '1', fullName: 'مدیر', email: null, avatarUrl: null });

    service.expireSession();
    service.expireSession();

    expect(toast.warning).toHaveBeenCalledTimes(1);
    expect(user()).toBeNull();
    expect(permissions()).toEqual([]);
    expect(localStorage.getItem(environment.TOKEN_STORAGE_KEY)).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/' },
      replaceUrl: true,
    });
  });

  it('changes the password with the current and the new value', async () => {
    const promise = firstValueFrom(service.changePassword('OldPassword123', 'NewPassword123'));

    const request = http.expectOne(`${environment.API_BASE_URL}/auth/admin/change-password`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      currentPassword: 'OldPassword123',
      newPassword: 'NewPassword123',
    });
    request.flush({ message: 'ok' });

    await expect(promise).resolves.toBeUndefined();
  });
});
