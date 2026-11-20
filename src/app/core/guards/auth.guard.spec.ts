import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Route } from '@angular/router';
import { provideRouter, UrlTree } from '@angular/router';
import { CURRENT_USER } from '@core/auth/current-user.token';

import { authGuard } from './auth.guard';

function run(signedIn: boolean): true | UrlTree {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: CURRENT_USER,
        useValue: signal(
          signedIn ? { id: '1', fullName: 'مدیر', email: null, avatarUrl: null } : null,
        ),
      },
    ],
  });

  return TestBed.runInInjectionContext(() =>
    authGuard({} as Route, [{ path: 'products' }] as never),
  ) as true | UrlTree;
}

describe('authGuard', () => {
  it('lets a signed-in user into the shell', () => {
    expect(run(true)).toBe(true);
  });

  it('sends an anonymous visitor to /login with the requested URL', () => {
    const result = run(false);

    expect(result).toBeInstanceOf(UrlTree);
    expect(result.toString()).toBe('/login?returnUrl=%2Fproducts');
  });
});
