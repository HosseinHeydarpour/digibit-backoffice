// src/app/layout/sidebar-drawer/sidebar-drawer.ts
import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { Sidebar } from '@layout/sidebar/sidebar';

import { SidebarDrawerState } from './sidebar-drawer.state';

/**
 * Mobile offcanvas sidebar (BO-B04).
 *
 * Replicates the Arino reference's animation exactly, but drives it from a
 * signal instead of the reference's global `toggleOffcanvas()`/`closeOffcanvas()`
 * functions. The reference toggles these Tailwind classes:
 *
 *   open  -> add `opacity-100` + `visible`, remove `invisible` + `-translate-x-full`
 *   close -> add `opacity-0` + `translate-x-full` (for a `...right` id)
 *
 * with `transition-transform` providing the slide. We bind the same classes to
 * the same element, so the motion is identical; only the trigger differs.
 *
 * The drawer markup is a **separate element from the static sidebar**, as in the
 * reference, and it is only ever visible below the `lg` breakpoint (BO-B04
 * tc 7: the desktop sidebar is the `hidden lg:flex` one in `main-layout.html`).
 */
@Component({
  selector: 'app-sidebar-drawer',
  imports: [Sidebar],
  templateUrl: './sidebar-drawer.html',
  styleUrl: './sidebar-drawer.scss',
})
export class SidebarDrawer {
  private readonly state = inject(SidebarDrawerState);

  /** The panel itself, needed for the focus trap and for Escape handling. */
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  protected readonly isOpen = this.state.isOpen;

  constructor() {
    effect((onCleanup) => {
      if (!this.isOpen()) return;

      // BO-B04 tc 9: lock background scroll while the drawer is open, otherwise
      // the page behind scrolls under the user's finger on touch devices.
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // BO-B04 tc 4: Escape closes.
      const onKeydown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          this.close();
          return;
        }
      };
      document.addEventListener('keydown', onKeydown);

      // BO-B04 tc 6: move focus into the panel so keyboard users are not left
      // tabbing through the page behind the overlay.
      this.focusPanel();

      onCleanup(() => {
        document.body.style.overflow = previousOverflow;
        document.removeEventListener('keydown', onKeydown);
      });
    });
  }

  protected close(): void {
    this.state.close();
  }

  /**
   * Focus the panel container so the next Tab lands inside it.
   *
   * Scenarios:
   * - Keyboard user opens the drawer with the hamburger; focus moves to the
   *   panel and Tab then walks the menu links rather than the hidden page.
   * - The drawer is opened but `viewChild` has not resolved yet (first tick).
   *   The optional chain skips focus rather than throwing.
   */
  private focusPanel(): void {
    this.panel()?.nativeElement.focus();
  }

  /**
   * Scenarios:
   * - A menu item inside the drawer was clicked. Close so the destination page
   *   is not covered by the panel (BO-B04 tc 5).
   * - A keyboard user activates a link with Enter. Same handler, same result.
   */
  protected onMenuActivate(): void {
    this.close();
  }
}
