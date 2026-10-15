// src/app/layout/sidebar-drawer/sidebar-drawer.state.ts
import { Injectable, signal } from '@angular/core';

/**
 * Open/closed state for the mobile offcanvas sidebar (BO-B04).
 *
 * Why a service rather than a signal on `MainLayout`: the hamburger lives in
 * `Topbar` and the drawer lives next to it, but neither should own the other.
 * `Topbar` already exposes a `menuToggle` output for exactly this reason — the
 * parent wires that output to `open()` here, so the topbar never imports the
 * drawer and the drawer never imports the topbar.
 *
 * A service also survives the case where `Topbar` and the drawer are not
 * siblings, which will happen as soon as BO-B06 adds the user dropdown.
 *
 * Scenarios:
 * - Mobile width (<992px), user taps the hamburger. `Topbar.menuToggle` fires,
 *   `MainLayout` calls `open()`, and the drawer's signal flips so the bound
 *   classes start the slide-in transition.
 * - Desktop width (>=992px). The hamburger is `lg:hidden` so it cannot be
 *   tapped, `isOpen` stays false, and the drawer's `visible`/`invisible` pair
 *   keeps it out of the accessibility tree entirely.
 * - The user navigates via a drawer link. The drawer calls `close()` so the
 *   panel slides away behind the newly rendered page instead of covering it.
 */
@Injectable({ providedIn: 'root' })
export class SidebarDrawerState {
  private readonly isOpenSignal = signal(false);

  /** Read-only view; only `open()`/`close()` may change it. */
  readonly isOpen = this.isOpenSignal.asReadonly();

  /**
   * Scenarios:
   * - Called from the hamburger's output binding, flipping the drawer on.
   * - Called twice in a row (double tap). The signal is already `true`, so the
   *   second call is a no-op and the transition does not restart mid-animation.
   */
  open(): void {
    this.isOpenSignal.set(true);
  }

  /**
   * Scenarios:
   * - Overlay click (BO-B04 tc 2).
   * - Escape key (tc 4).
   * - Selecting a menu item (tc 5).
   * - Already closed (e.g. Escape after the overlay already closed it) — the
   *   signal is already `false`, so nothing re-renders.
   */
  close(): void {
    this.isOpenSignal.set(false);
  }

  /**
   * Scenarios:
   * - The hamburger is tapped while the drawer is already open, e.g. a stray
   *   second tap during the slide-in. Toggling closes it rather than leaving
   *   the user stuck.
   * - A keyboard user presses Escape with focus on the hamburger. Same path.
   */
  toggle(): void {
    this.isOpenSignal.update((isOpen) => !isOpen);
  }
}
