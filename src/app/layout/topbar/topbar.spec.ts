// src/app/layout/topbar/topbar.spec.ts
import { signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CURRENT_USER } from '@core/auth/current-user.token';
import { PageTitleService } from '@core/services/page-title';
import { ThemeService } from '@core/services/theme';
import type { SessionUser } from '@shared/models/session.model';

import { Topbar } from './topbar';

/**
 * The router matches these but mounts nothing: both are component-less on
 * purpose. A real component would drag its own dependencies into a topbar spec,
 * and an *empty* table would make `SessionService.logout()` reject with
 * NG04002 — an unhandled rejection the run reports as an error even though the
 * assertion is about the cleared signal, not about routing. `children: []` is
 * what satisfies `validateNode`, which refuses a leaf with no component.
 */
const TEST_ROUTES = [
  { path: 'login', children: [] },
  { path: 'profile', children: [] },
];

describe('Topbar', () => {
  let fixture: ComponentFixture<Topbar>;

  /**
   * A real signal, not a stub. The logout test asserts that «خروج» clears it,
   * which only a real signal can show, and the "nobody signed in" test sets it
   * to `null` without reconfiguring the TestBed.
   */
  let currentUser: Signal<SessionUser | null>;

  beforeEach(async () => {
    // Pin the starting theme so the toggle test cannot be affected by the host
    // system's `prefers-color-scheme` or by a value left in storage.
    localStorage.setItem('digibit.theme', 'light');

    currentUser = signal<SessionUser | null>(null);

    await TestBed.configureTestingModule({
      imports: [Topbar],
      providers: [
        provideRouter(TEST_ROUTES),
        { provide: CURRENT_USER, useValue: currentUser },
        {
          provide: PageTitleService,
          useValue: { title: signal('محصولات') },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Topbar);
    fixture.detectChanges();
  });

  /**
   * PrimeNG appends the popup menu to `<body>`, which outlives the component.
   * Removing it here is what keeps the "menu is open" assertions of one test
   * from leaking into the next one.
   */
  afterEach(() => {
    document.querySelectorAll('.p-menu').forEach((el) => el.remove());
  });

  /**
   * Buttons are addressed by their accessible name, never by position. The
   * header holds several icon-only buttons, so a bare `querySelector('button')`
   * resolves to whichever happens to be first — a selector that passes today and
   * silently tests the wrong control if the markup is ever reordered.
   */
  function hamburger(): HTMLButtonElement {
    return fixture.nativeElement.querySelector(
      'button[aria-label="باز کردن منو"]',
    ) as HTMLButtonElement;
  }

  function themeButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector(
      'button[aria-label="تغییر به حالت تاریک"], button[aria-label="تغییر به حالت روشن"]',
    ) as HTMLButtonElement;
  }

  it('renders the current page title from the service (tc 1, tc 4)', () => {
    const heading = fixture.nativeElement.querySelector('h1') as HTMLElement;
    expect(heading.textContent?.trim()).toBe('محصولات');
  });

  it('shows the hamburger only below the lg breakpoint (tc 3)', () => {
    // classList.contains, never querySelector('.lg\\:hidden') — the escaped
    // colon in a Tailwind variant is fragile, and the "/" in opacity
    // modifiers is outright invalid in a selector.
    expect(hamburger().classList.contains('lg:hidden')).toBe(true);
  });

  it('emits menuToggle when the hamburger is clicked', () => {
    let emitted = 0;
    fixture.componentInstance.menuToggle.subscribe(() => (emitted += 1));

    hamburger().click();

    expect(emitted).toBe(1);
  });

  it('gives every icon-only button an accessible name (tc 4)', () => {
    // `nativeElement` is `any`, so the NodeList is cast explicitly rather than
    // letting `forEach` infer an implicit-`any` parameter.
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    );
    // Anonymous: hamburger + theme switch. The profile trigger is asserted
    // separately, because it only exists when somebody is signed in.
    expect(buttons.length).toBe(2);

    buttons.forEach((button) => {
      expect(button.getAttribute('aria-label')).toBeTruthy();
    });
  });

  it('toggles the theme when the switch is clicked (tc 1)', () => {
    const theme = TestBed.inject(ThemeService);
    expect(theme.isDark()).toBe(false);
    expect(document.documentElement.classList.contains('app-dark')).toBe(false);

    themeButton().click();
    fixture.detectChanges();

    expect(theme.isDark()).toBe(true);
    expect(document.documentElement.classList.contains('app-dark')).toBe(true);

    // The accessible name must follow the mode, so the button announces the
    // action it performs rather than the state it is already in.
    expect(themeButton().getAttribute('aria-label')).toBe('تغییر به حالت روشن');
  });

  it('wires the icon swap to the app-dark class (tc 4)', () => {
    // jsdom does no CSS layout, so the rendered swap cannot be asserted — pin
    // the class contract that produces it. Both SVGs read the single `app-dark`
    // class through Tailwind's `dark:` variant, so whichever is right in light
    // mode is automatically right in dark.
    const svgs = Array.from(themeButton().querySelectorAll('svg') as NodeListOf<SVGElement>);
    expect(svgs.length).toBe(2);

    const sun = svgs.find((svg) => svg.classList.contains('dark:block'));
    const moon = svgs.find((svg) => svg.classList.contains('dark:hidden'));

    // Sun: `hidden` in light mode, `dark:block` reveals it.
    expect(sun?.classList.contains('hidden')).toBe(true);
    // Moon: visible in light mode, `dark:hidden` removes it.
    expect(moon?.classList.contains('hidden')).toBe(false);
  });

  it('does not use PrimeIcons for the icon swap (regression guard)', () => {
    // PrimeIcons must not be used here. `.pi{display:inline-block}` is unlayered
    // CSS, and unlayered rules beat Tailwind's `@layer utilities` no matter how
    // specific the selector is — so `.hidden` / `dark:hidden` never applied and
    // BOTH icons rendered at once. If someone "simplifies" these back to
    // `<i class="pi">`, this fails and points at the reason.
    expect(themeButton().querySelector('.pi')).toBeNull();
  });
});

describe('Topbar profile menu (BO-B06)', () => {
  let fixture: ComponentFixture<Topbar>;
  let currentUser: ReturnType<typeof signal<SessionUser | null>>;

  beforeEach(async () => {
    localStorage.setItem('digibit.theme', 'light');
    currentUser = signal<SessionUser | null>({
      id: '1',
      fullName: 'مدیر سیستم',
      email: 'admin@digibit.market',
      avatarUrl: null,
    });

    await TestBed.configureTestingModule({
      imports: [Topbar],
      providers: [
        provideRouter(TEST_ROUTES),
        { provide: CURRENT_USER, useValue: currentUser },
        { provide: PageTitleService, useValue: { title: signal('محصولات') } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Topbar);
    fixture.detectChanges();
  });

  afterEach(() => {
    document.querySelectorAll('.p-menu').forEach((el) => el.remove());
  });

  function profileTrigger(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button[aria-haspopup="true"]') as HTMLButtonElement;
  }

  function menuLabels(): string[] {
    return Array.from(document.querySelectorAll('.p-menu-item-label')).map(
      (el) => el.textContent?.trim() ?? '',
    );
  }

  /**
   * Two animation frames — the wait PrimeNG's overlay lifecycle needs.
   *
   * `onOverlayBeforeEnter` (appends the container to `<body>` and binds the
   * document listener) and `onOverlayAfterLeave` (removes the container) are
   * both motion callbacks, so neither happens inside the click that triggers
   * them. Asserting immediately after a click would test a half-mounted
   * overlay — the menu appears closed because it has not opened yet.
   */
  function nextFrame(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof requestAnimationFrame !== 'function') {
        setTimeout(resolve, 32);
        return;
      }
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  }

  it("shows the signed-in user's full name (tc 2)", () => {
    const trigger = profileTrigger();
    expect(trigger.textContent).toContain('مدیر سیستم');
  });

  it('keeps the visible name inside the accessible name (Label in Name)', () => {
    // WCAG 2.5.3: a speech user must hear the account name, or they cannot tell
    // which account they are signing out of.
    const label = profileTrigger().getAttribute('aria-label') ?? '';
    expect(label).toContain('مدیر سیستم');
    expect(label).toContain('منوی کاربر');
  });

  it('falls back to initials when the user has no avatar (tc 9)', () => {
    expect(profileTrigger().querySelector('img')).toBeNull();
    expect(profileTrigger().textContent).toContain('مس');
  });

  it('renders the avatar image when the user has one (tc 9)', () => {
    const withAvatar = { ...currentUser()!, avatarUrl: '/mock/avatar.png' };
    currentUser.set(withAvatar);
    fixture.detectChanges();

    const img = profileTrigger().querySelector('img') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('/mock/avatar.png');
    expect(img.getAttribute('alt')).toBe('مدیر سیستم');
  });

  it('renders no profile trigger when nobody is signed in', () => {
    currentUser.set(null);
    fixture.detectChanges();

    expect(profileTrigger()).toBeNull();
    // And the menu host element is still in the template — hiding the trigger
    // must not throw while rendering.
    expect(fixture.nativeElement.querySelector('p-menu')).toBeTruthy();
  });

  it('opens the menu with the four expected items (tc 1, tc 3, tc 6)', () => {
    profileTrigger().click();
    fixture.detectChanges();

    // The overlay is appended to <body> by `[appendTo]="'body'"`, so it is NOT
    // inside `fixture.nativeElement` — a query scoped to the component would
    // find nothing and this test would pass for the wrong reason.
    expect(menuLabels()).toEqual(['پروفایل من', 'تنظیمات', 'بازگشت به سایت', 'خروج']);
  });

  it('links پروفایل من to the profile route (tc 3)', () => {
    profileTrigger().click();
    fixture.detectChanges();

    const link = document.querySelector('.p-menu-item-link[href="/profile"]');
    expect(link).toBeTruthy();
  });

  it('opens بازگشت به سایت in a new tab (tc 6)', () => {
    profileTrigger().click();
    fixture.detectChanges();

    const link = Array.from(document.querySelectorAll('.p-menu-item-link')).find((el) =>
      el.textContent?.includes('بازگشت به سایت'),
    );
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('href')).toBe('http://localhost:4200');
  });

  it('closes the menu on an outside click (tc 7)', async () => {
    // PrimeNG's own document listener hides a popup whose target and overlay
    // both miss the click. Asserting it here keeps the topbar from growing a
    // second, competing handler.
    profileTrigger().click();
    fixture.detectChanges();

    // The overlay is mounted by a motion callback, not synchronously with the
    // click: `onOverlayBeforeEnter` is what appends the container to <body> and
    // binds the document listener. Waiting for that frame is what makes the
    // outside click below reachable at all.
    await nextFrame();
    fixture.detectChanges();
    expect(menuLabels().length).toBeGreaterThan(0);

    document.body.click();
    fixture.detectChanges();

    // `hide()` only clears `visible`; the container is removed by the leave
    // animation's `onOverlayAfterLeave`, hence the second frame.
    await nextFrame();
    fixture.detectChanges();

    expect(menuLabels()).toEqual([]);
  });

  it('clears the session when خروج is chosen (tc 4)', () => {
    // The navigation half is SessionService's own spec; what the topbar is
    // responsible for is that the item fires `SessionService.logout()`.
    profileTrigger().click();
    fixture.detectChanges();

    const item = Array.from(document.querySelectorAll('.p-menu-item')).find((el) =>
      el.textContent?.includes('خروج'),
    ) as HTMLElement;
    item.querySelector('a')?.click();
    fixture.detectChanges();

    expect(currentUser()).toBeNull();
    // ...and the trigger disappears with it, so «خروج» cannot be clicked twice.
    expect(profileTrigger()).toBeNull();
  });
});
