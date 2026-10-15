import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { MENU } from './menu';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  protected readonly menu = MENU;
}
