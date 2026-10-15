// src/app/core/services/theme.spec.ts
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThemeService } from './theme';

/** Throwaway component; its change detection flushes root-level effects. */
@Component({ template: '' })
class Harness {}

function flush(): void {
  const fixture: ComponentFixture<Harness> = TestBed.createComponent(Harness);
  fixture.detectChanges();
  fixture.destroy();
}

function stored(): string | null {
  try {
    return localStorage.getItem('digibit.theme');
  } catch {
    return null;
  }
}

function installMatchMedia(prefersDark: boolean): void {
  // `() => undefined` rather than `() => {}`: an empty body trips
  // `@typescript-eslint/no-empty-function`.
  (window as unknown as { matchMedia: typeof window.matchMedia }).matchMedia = (() => ({
    matches: prefersDark,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

describe('ThemeService', () => {
  /** The environment's real `matchMedia`, restored after every test. */
  let originalMatchMedia: typeof window.matchMedia | undefined;

  beforeEach(() => {
    localStorage.clear();

    // Always start from a known "system prefers light" state rather than
    // trusting jsdom's `matchMedia` (absent in some versions, and returning
    // `matches:false` in others). `installMatchMedia` mutates the global, so it
    // must be pinned *and* restored — without the restore, a test that asks for
    // a dark system leaks that preference into every test after it.
    originalMatchMedia = window.matchMedia;
    installMatchMedia(false);
  });

  afterEach(() => {
    if (originalMatchMedia) {
      window.matchMedia = originalMatchMedia;
    } else {
      delete (window as unknown as { matchMedia?: typeof window.matchMedia }).matchMedia;
    }
  });

  it('defaults to light with no saved value and no system preference (tc 9)', () => {
    const service = TestBed.inject(ThemeService);
    expect(service.mode()).toBe('light');
    expect(service.isDark()).toBe(false);
  });

  it('reads a saved dark preference on construction (tc 2)', () => {
    localStorage.setItem('digibit.theme', 'dark');
    const service = TestBed.inject(ThemeService);
    expect(service.mode()).toBe('dark');
    expect(service.isDark()).toBe(true);
  });

  it('reads a saved light preference on construction', () => {
    localStorage.setItem('digibit.theme', 'light');
    const service = TestBed.inject(ThemeService);
    expect(service.mode()).toBe('light');
  });

  it('follows a dark system preference when nothing is saved (tc 3)', () => {
    installMatchMedia(true);
    const service = TestBed.inject(ThemeService);
    expect(service.mode()).toBe('dark');
  });

  it('applies app-dark on the first flush without writing storage (tc 3, tc 10)', () => {
    // A dark system preference must be *applied* but not *recorded*: until the
    // user actually chooses, `digibit.theme` stays absent so the app keeps
    // following the system. Writing here is what made "follow system" one-shot.
    installMatchMedia(true);
    const service = TestBed.inject(ThemeService);
    flush();

    expect(service.isDark()).toBe(true);
    expect(document.documentElement.classList.contains('app-dark')).toBe(true);
    expect(stored()).toBeNull();
  });

  it('toggle() flips the mode, applies the class and persists (tc 1)', () => {
    const service = TestBed.inject(ThemeService);
    expect(service.mode()).toBe('light');
    service.toggle();
    flush();
    expect(service.mode()).toBe('dark');
    expect(document.documentElement.classList.contains('app-dark')).toBe(true);
    expect(stored()).toBe('dark');

    service.toggle();
    flush();
    expect(service.mode()).toBe('light');
    expect(document.documentElement.classList.contains('app-dark')).toBe(false);
    expect(stored()).toBe('light');
  });

  it('set() applies an explicit mode and records it', () => {
    const service = TestBed.inject(ThemeService);
    service.set('dark');
    flush();
    expect(document.documentElement.classList.contains('app-dark')).toBe(true);
    expect(stored()).toBe('dark');

    service.set('light');
    flush();
    expect(document.documentElement.classList.contains('app-dark')).toBe(false);
    expect(stored()).toBe('light');
  });

  it('clearing storage returns the theme to the system default (tc 10)', () => {
    localStorage.setItem('digibit.theme', 'dark');
    expect(TestBed.inject(ThemeService).isDark()).toBe(true);

    // A cleared preference only takes effect on the next app load, which means
    // a fresh instance. `providedIn:'root'` memoises it, so the injector is
    // reset to model that reload rather than re-injecting the same object.
    localStorage.removeItem('digibit.theme');
    installMatchMedia(false);
    TestBed.resetTestingModule();

    expect(TestBed.inject(ThemeService).isDark()).toBe(false);
  });

  it('falls back to light when storage throws', () => {
    // No `spyOn` in this setup (only `vitest/globals` types are wired in), so the
    // failure is injected by shadowing `getItem` with a throwing function and
    // restoring it afterwards — the test must not leak a broken localStorage.
    const original = localStorage.getItem;
    localStorage.getItem = (() => {
      throw new Error('blocked');
    }) as typeof localStorage.getItem;

    try {
      const service = TestBed.inject(ThemeService);
      expect(service.mode()).toBe('light');
    } finally {
      localStorage.getItem = original;
    }
  });
});
