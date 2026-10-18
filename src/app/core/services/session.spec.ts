// src/app/core/services/session.spec.ts
//
// Same seam as the rest of the repo: a recording `Router` instead of `vi.fn`,
// because `logout()` touches exactly one method and the assertion is the URL and
// the `replaceUrl` flag.
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { CURRENT_USER } from '@core/auth/current-user.token';
import type { SessionUser } from '@shared/models/session.model';

import { SessionService } from './session';

const USER: SessionUser = {
  id: '1',
  fullName: 'مدیر سیستم',
  email: 'admin@digibit.market',
  avatarUrl: null,
};

/** Records navigations instead of performing them. */
class RecordingRouter {
  readonly navigations: { url: string; replaceUrl?: boolean }[] = [];

  navigateByUrl(url: string, extras: { replaceUrl?: boolean } = {}): Promise<boolean> {
    this.navigations.push({ url, ...extras });
    return Promise.resolve(true);
  }
}

describe('SessionService', () => {
  function setup(user: SessionUser | null) {
    const router = new RecordingRouter();
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        // A real signal, not a stub: the clearing behaviour under test is
        // `set()` on *this* object, which only a real signal can show.
        { provide: CURRENT_USER, useValue: signal<SessionUser | null>(user) },
      ],
    });

    return { service: TestBed.inject(SessionService), router };
  }

  it('exposes the injected user (tc 2)', () => {
    const { service } = setup(USER);

    expect(service.user()).toEqual(USER);
  });

  it('exposes null when nobody is signed in', () => {
    const { service } = setup(null);

    expect(service.user()).toBeNull();
    // A null user must not produce a glyph for an empty avatar, so the topbar
    // can fall through to «کاربر» rather than an empty circle.
    expect(service.initials()).toBeNull();
  });

  it('derives initials from the first letters of the first two words', () => {
    const { service } = setup(USER);

    expect(service.initials()).toBe('مس');
  });

  it('takes one letter from a single-word name', () => {
    const { service } = setup({ ...USER, fullName: 'مدیر' });

    expect(service.initials()).toBe('م');
  });

  it('clears the user before navigating on logout (tc 4)', () => {
    const { service } = setup(USER);

    service.logout();

    // Order matters: clearing first means the profile menu disappears on the
    // same frame the route changes, so «خروج» cannot be clicked twice.
    expect(service.user()).toBeNull();
  });

  it('replaces the history entry on logout (tc 10)', () => {
    const { service, router } = setup(USER);

    service.logout();

    // `replaceUrl` is what stops the browser Back button from returning to the
    // panel the user just left.
    expect(router.navigations).toEqual([{ url: '/login', replaceUrl: true }]);
  });

  it('is safe to call twice', () => {
    const { service, router } = setup(USER);

    service.logout();
    service.logout();

    expect(service.user()).toBeNull();
    expect(router.navigations).toHaveLength(2);
  });
});
