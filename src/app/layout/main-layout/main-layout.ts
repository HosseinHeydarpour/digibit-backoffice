import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '@layout/sidebar/sidebar';
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
 *   is the only entry point; when B04 wires `menuToggle`, the drawer renders
 *   inside this shell so it overlays the content, not the sidebar column.
 */
@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, Sidebar, Topbar],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {}
