// src/app/layout/sidebar-drawer/sidebar-drawer.state.spec.ts
import { TestBed } from '@angular/core/testing';

import { SidebarDrawerState } from './sidebar-drawer.state';

describe('SidebarDrawerState', () => {
  let state: SidebarDrawerState;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    state = TestBed.inject(SidebarDrawerState);
  });

  it('starts closed (tc 1)', () => {
    expect(state.isOpen()).toBe(false);
  });

  it('opens on open() (tc 1)', () => {
    state.open();
    expect(state.isOpen()).toBe(true);
  });

  it('closes on close() (tc 2)', () => {
    state.open();
    state.close();
    expect(state.isOpen()).toBe(false);
  });

  it('toggles back and forth (tc 1)', () => {
    state.toggle();
    expect(state.isOpen()).toBe(true);

    state.toggle();
    expect(state.isOpen()).toBe(false);
  });

  it('is idempotent when opened twice', () => {
    // A double tap on the hamburger must not restart the transition.
    state.open();
    state.open();
    expect(state.isOpen()).toBe(true);

    state.close();
    state.close();
    expect(state.isOpen()).toBe(false);
  });

  it('exposes isOpen as read-only', () => {
    // The signal is `asReadonly()`, so it has no set/update of its own.
    expect('set' in state.isOpen).toBe(false);
    expect('update' in state.isOpen).toBe(false);
  });

  it('is a singleton, so topbar and drawer share one state', () => {
    expect(TestBed.inject(SidebarDrawerState)).toBe(state);
  });
});
