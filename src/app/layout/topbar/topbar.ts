// src/app/layout/topbar/topbar.ts
import { Component, inject, output } from '@angular/core';
import { PageTitleService } from '@core/services/page-title';
import { ThemeService } from '@core/services/theme';

@Component({
  selector: 'app-topbar',
  imports: [],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class Topbar {
  private readonly pageTitle = inject(PageTitleService);

  /** Mirrors `PageTitleService.title`; the template reads it as `title()`. */
  protected readonly title = this.pageTitle.title;

  /** The header's theme switch, exposed so the button calls `theme.toggle()`. */
  protected readonly theme = inject(ThemeService);

  /**
   * B04 listens to this to open the mobile drawer. Emitting rather than owning
   * the drawer state keeps the topbar from depending on the sidebar.
   *
   * Scenarios:
   * - Below the `lg` breakpoint the hamburger is visible; the user taps it and
   *   the parent (`MainLayout`) receives the event, flips its drawer signal to
   *   open, and the offcanvas sidebar slides in.
   * - At or above `lg` the hamburger is `lg:hidden`, so no user interaction can
   *   emit this — the sidebar is permanent instead and the output stays silent.
   * - Nothing is listening (e.g. the topbar is rendered in isolation in a
   *   test). `output()` has no subscribers, so the emit is a no-op and does not
   *   throw, which is why the component can be tested without a parent.
   */
  readonly menuToggle = output<void>();
}
