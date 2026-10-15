import { Component, computed, inject } from '@angular/core';
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
}
