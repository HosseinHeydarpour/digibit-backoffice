import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastService } from '@core/services/toast';
import { Sidebar } from '@layout/sidebar/sidebar';
import { SidebarDrawer } from '@layout/sidebar-drawer/sidebar-drawer';
import { SidebarDrawerState } from '@layout/sidebar-drawer/sidebar-drawer.state';
import { Topbar } from '@layout/topbar/topbar';
import { EmptyState } from '@shared/components/empty-state/empty-state';

/**
 * The persistent shell around every authenticated page: sidebar + topbar are
 * rendered once here, and only the `<router-outlet>` swaps on navigation.
 *
 * Scenarios:
 * - The user navigates from `/products` to `/orders`. This component is *not*
 *   re-created — Angular reuses the matched route component — so the sidebar
 *   keeps its scroll position and the topbar does not flicker. Only the
 *   `<main>` contents change.
 * - At a desktop width the sidebar sits permanently in the `<aside>`; the
 *   topbar reserves the horizontal space beside it (`flex-1` on the column) so
 *   the two never overlap.
 * - Below the breakpoint the `<aside>` is `hidden` and the topbar's hamburger
 *   is the only entry point. It emits `menuToggle`, wired below; the topbar
 *   never learns that a drawer exists.
 * - The drawer is rendered *outside* the `overflow-hidden` shell so it can
 *   position itself against the viewport rather than being clipped by it.
 */
@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, Sidebar, SidebarDrawer, Topbar, EmptyState],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  private readonly drawer = inject(SidebarDrawerState);

  /**
   * TEMPORARY (BO-B13 sample). Wired to the action button of the empty-state
   * demo in `main-layout.html`, and deleted with it.
   *
   * It reports through the toast rather than doing nothing, for two reasons: a
   * button that silently does nothing looks broken, and it gives you a way to
   * see BO-B12 and BO-B13 working together from a single click.
   */
  private readonly toast = inject(ToastService);

  /**
   * Scenarios:
   * - Mobile: the hamburger is tapped, `Topbar.menuToggle` emits, the drawer
   *   opens and slides in.
   * - Desktop: the hamburger is `lg:hidden`, so this never fires from the UI.
   *   Calling it programmatically would still be harmless — the drawer carries
   *   `lg:hidden` of its own.
   */
  protected openDrawer(): void {
    this.drawer.open();
  }

  /** TEMPORARY (BO-B13 sample) — removed with the demo block in the template. */
  protected onSampleAction(): void {
    this.toast.success('این فقط یک نمونه است.', {
      detail: 'دکمهٔ حالت خالی به درستی کار می‌کند.',
    });
  }
}
