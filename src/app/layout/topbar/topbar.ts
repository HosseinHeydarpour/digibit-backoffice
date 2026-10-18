// src/app/layout/topbar/topbar.ts
import { Component, inject, output } from '@angular/core';
import { PageTitleService } from '@core/services/page-title';
import { SessionService } from '@core/services/session';
import { ThemeService } from '@core/services/theme';
import { environment } from '@env/environment';
import { MenuItem } from 'primeng/api';
import { Menu } from 'primeng/menu';

@Component({
  selector: 'app-topbar',
  imports: [Menu],
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
   * Who is signed in, and their avatar initials. `null` until a `CURRENT_USER`
   * provider exists, so the header renders without a profile menu rather than
   * guessing an identity.
   */
  protected readonly session = inject(SessionService);

  /**
   * The profile menu's items, built once.
   *
   * A plain array, not a `computed`: none of it depends on the user — the menu
   * only exists when there *is* one, and what is in it does not change per user
   * (the avatar and the name live on the trigger, not in the list). Making it a
   * signal would be churn the template cannot observe.
   *
   * `command` for خروج and `routerLink` for the two in-app links: PrimeNG's
   * `MenuItem` does the navigation itself, so the topbar does not need to import
   * `Router`.
   */
  protected readonly menuItems: MenuItem[] = [
    { label: 'پروفایل من', icon: 'pi pi-user', routerLink: ['/profile'] },
    { label: 'تنظیمات', icon: 'pi pi-cog', routerLink: ['/settings'] },
    { separator: true },
    {
      label: 'بازگشت به سایت',
      icon: 'pi pi-external-link',
      url: environment.SITE_URL,
      target: '_blank',
    },
    { separator: true },
    {
      label: 'خروج',
      icon: 'pi pi-power-off',
      command: () => this.session.logout(),
    },
  ];

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

  /** Opens and closes the profile menu. PrimeNG owns the open state. */
  protected toggleProfile(menu: Menu, event: Event): void {
    menu.toggle(event);
  }
}
