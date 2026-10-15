import { Component, computed, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PERMISSIONS } from '@core/auth/permissions.token';

import { MENU } from './menu';
import { filterMenu } from './menu-filter';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  private readonly permissions = inject(PERMISSIONS);

  /**
   * Recomputed whenever the permission signal changes, which is what makes the
   * menu rebuild after a re-login (BO-B03 test case 4).
   */
  protected readonly menu = computed(() => filterMenu(MENU, this.permissions()));

  /**
   * Fired when the user picks a menu item.
   *
   * The sidebar does not navigate itself — `<a routerLink>` already does that —
   * so this only *announces* the click. The mobile drawer listens and closes,
   * because otherwise the panel would stay on top of the page it just opened
   * (BO-B04 tc 5). The desktop sidebar ignores it, since it is never an overlay.
   *
   * Scenarios:
   * - Click «محصولات» inside the mobile drawer: routes to /products and the
   *   drawer slides away. Without this the user sees the new page behind a
   *   panel that refuses to leave.
   * - Click «محصولات» in the persistent desktop sidebar: the output fires but
   *   nothing is bound to it in that context, so the emit is a harmless no-op.
   * - Click the item for the page already open: the route is unchanged but the
   *   drawer still closes, which is the expected "dismiss the menu" behaviour.
   */
  readonly itemActivated = output<void>();
}
