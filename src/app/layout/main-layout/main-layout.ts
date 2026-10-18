import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '@layout/sidebar/sidebar';
import { SidebarDrawer } from '@layout/sidebar-drawer/sidebar-drawer';
import { SidebarDrawerState } from '@layout/sidebar-drawer/sidebar-drawer.state';
import { Topbar } from '@layout/topbar/topbar';

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
  imports: [RouterOutlet, Sidebar, SidebarDrawer, Topbar],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  private readonly drawer = inject(SidebarDrawerState);

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
}
