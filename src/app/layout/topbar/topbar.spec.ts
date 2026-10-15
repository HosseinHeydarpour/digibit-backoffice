// src/app/layout/topbar/topbar.spec.ts
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PageTitleService } from '@core/services/page-title';
import { ThemeService } from '@core/services/theme';

import { Topbar } from './topbar';

describe('Topbar', () => {
  let fixture: ComponentFixture<Topbar>;

  beforeEach(async () => {
    // Pin the starting theme so the toggle test cannot be affected by the host
    // system's `prefers-color-scheme` or by a value left in storage.
    localStorage.setItem('digibit.theme', 'light');

    await TestBed.configureTestingModule({
      imports: [Topbar],
      providers: [
        provideRouter([]),
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
   * Buttons are addressed by their accessible name, never by position. Since
   * B07 the header holds two icon-only buttons (hamburger + theme switch), so a
   * bare `querySelector('button')` resolves to whichever happens to be first —
   * a selector that passes today and silently tests the wrong control if the
   * markup is ever reordered.
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
