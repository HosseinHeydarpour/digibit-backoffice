import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, UrlTree } from '@angular/router';
import { CURRENT_USER } from '@core/auth/current-user.token';

import { guestGuard } from './guest.guard';

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

  return TestBed.runInInjectionContext(() => guestGuard({} as never, [])) as true | UrlTree;
}

describe('guestGuard (BO-D06 tc 3)', () => {
  it('lets a signed-out visitor see /login', () => {
    expect(run(false)).toBe(true);
  });

  it('sends an already signed-in user to the dashboard', () => {
    const result = run(true);

    expect(result).toBeInstanceOf(UrlTree);
    expect(result.toString()).toBe('/dashboard');
  });
});
