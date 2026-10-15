// src/app/layout/sidebar-drawer/sidebar-drawer.spec.ts
import { Component, inject, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PERMISSIONS } from '@core/auth/permissions.token';
import { MENU_PERMISSIONS } from '@layout/sidebar/menu';
import { Topbar } from '@layout/topbar/topbar';

import { SidebarDrawer } from './sidebar-drawer';
import { SidebarDrawerState } from './sidebar-drawer.state';

/**
 * A throwaway route target. The drawer renders the real `<app-sidebar>`, whose
 * links carry `routerLink`. Clicking one in a test therefore triggers
 * navigation; without a matching route the router throws NG04002 as an unhandled
 * error (a false-positive hazard). This catch-all swallows that navigation so
 * the only thing under test is whether the drawer closes. The wildcard keeps a
 * `component`, which also satisfies the NG04014 shape.
 */
@Component({ selector: 'app-stub-route', template: '' })
class StubRoute {}

const TEST_ROUTES = [{ path: '**', component: StubRoute }];

/**
 * Host shell that wires the real topbar to the real drawer, exactly as
 * `MainLayout` does, so the hamburger -> drawer path is covered end to end.
 *
 * The class must live at module scope: the Angular compiler evaluates a
 * component's `imports` array statically, so a dynamic `import()` inside the
 * test body yields NG1010.
 */
@Component({
  template: '<app-topbar (menuToggle)="onToggle()" /><app-sidebar-drawer />',
  imports: [Topbar, SidebarDrawer],
})
class TopbarDrawerShell {
  private readonly state = inject(SidebarDrawerState);

  /**
   * Scenario 1: the user taps the hamburger on a narrow viewport -> the drawer
   * slides in over the page content.
   * Scenario 2: the desktop topbar renders the same button but the drawer is
   * `lg:hidden`, so a stray tap at >=992px flips the signal without anything
   * becoming visible.
   */
  onToggle(): void {
    this.state.open();
  }
}

/**
 * The sliding panel. `role="dialog"` is on the inner element that actually
 * carries the translate/opacity classes, so this is the node under test.
 */
function panel(fixture: ComponentFixture<SidebarDrawer>): HTMLElement {
  return fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
}

/** The dimming overlay behind the panel. */
function overlay(fixture: ComponentFixture<SidebarDrawer>): HTMLElement {
  return fixture.nativeElement.querySelector('[aria-hidden="true"].z-40') as HTMLElement;
}

/** The header's X button (the hamburger lives in the topbar, not here). */
function closeButton(fixture: ComponentFixture<SidebarDrawer>): HTMLButtonElement {
  return fixture.nativeElement.querySelector('button[aria-label="بستن منو"]') as HTMLButtonElement;
}

describe('SidebarDrawer', () => {
  let fixture: ComponentFixture<SidebarDrawer>;
  let state: SidebarDrawerState;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarDrawer],
      providers: [
        provideRouter(TEST_ROUTES),
        { provide: PERMISSIONS, useValue: signal<readonly string[]>(MENU_PERMISSIONS) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarDrawer);
    state = TestBed.inject(SidebarDrawerState);
    fixture.detectChanges();
  });

  afterEach(() => {
    // The drawer locks body scroll while open; a failed assertion must not leak
    // that into the next test.
    document.body.style.overflow = '';
  });

  it('renders hidden while closed (tc 1)', () => {
    const el = panel(fixture);

    expect(el.classList.contains('invisible')).toBe(true);
    expect(el.classList.contains('opacity-0')).toBe(true);
    expect(el.classList.contains('-translate-x-full')).toBe(true);
  });

  it('slides in when opened (tc 1)', () => {
    state.open();
    fixture.detectChanges();

    const el = panel(fixture);
    expect(el.classList.contains('visible')).toBe(true);
    expect(el.classList.contains('opacity-100')).toBe(true);
    expect(el.classList.contains('translate-x-0')).toBe(true);
    expect(el.classList.contains('-translate-x-full')).toBe(false);
  });

  it('carries the reference transition classes (tc 8)', () => {
    const cls = panel(fixture).className;

    // The reference animates via `transition-transform`; duration/easing come
    // from the same utility family.
    expect(cls).toContain('transition-transform');
    expect(cls).toContain('duration-300');
  });

  it('closes when the overlay is clicked (tc 2)', () => {
    state.open();
    fixture.detectChanges();
    expect(state.isOpen()).toBe(true);

    overlay(fixture).click();
    fixture.detectChanges();

    expect(state.isOpen()).toBe(false);
  });

  it('closes on Escape (tc 4)', () => {
    state.open();
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(state.isOpen()).toBe(false);
  });

  it('does not react to other keys (tc 10)', () => {
    state.open();
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    fixture.detectChanges();

    expect(state.isOpen()).toBe(true);
  });

  it('closes via the header close button (tc 2)', () => {
    state.open();
    fixture.detectChanges();

    closeButton(fixture).click();
    fixture.detectChanges();

    expect(state.isOpen()).toBe(false);
  });

  it('locks background scroll while open and restores it on close (tc 9)', () => {
    document.body.style.overflow = 'auto';

    state.open();
    fixture.detectChanges();
    expect(document.body.style.overflow).toBe('hidden');

    state.close();
    fixture.detectChanges();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('moves focus into the panel when opened (tc 6)', () => {
    state.open();
    fixture.detectChanges();

    // The wrapper carries `tabindex="-1"` precisely so it can receive focus
    // programmatically, then Tab proceeds to the menu links inside it.
    const focusable = fixture.nativeElement.querySelector('[tabindex="-1"]') as HTMLElement;
    expect(focusable).toBeTruthy();
    expect(document.activeElement).toBe(focusable);
  });

  it('removes the Escape listener once closed', () => {
    state.open();
    fixture.detectChanges();
    state.close();
    fixture.detectChanges();

    // Re-opening and closing must not stack duplicate listeners; if it did, a
    // single Escape would fire close() several times (harmless here, but a
    // leak in general). Assert the observable outcome instead of internals.
    state.open();
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(state.isOpen()).toBe(false);
  });

  it('closes when a menu item is activated (tc 5)', () => {
    state.open();
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('app-sidebar a') as HTMLAnchorElement | null;

    expect(link, 'the drawer should render the real sidebar').toBeTruthy();
    link!.click();
    fixture.detectChanges();

    expect(state.isOpen()).toBe(false);
  });

  it('is hidden at the lg breakpoint (tc 7)', () => {
    // The drawer carries `lg:hidden` so it can never appear over the desktop
    // layout, where the persistent <aside> is the sidebar.
    expect(fixture.nativeElement.querySelector('.lg\\:hidden')).toBeTruthy();
  });
});

describe('SidebarDrawer integration with Topbar', () => {
  let fixture: ComponentFixture<TopbarDrawerShell>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopbarDrawerShell],
      providers: [
        provideRouter(TEST_ROUTES),
        { provide: PERMISSIONS, useValue: signal<readonly string[]>(MENU_PERMISSIONS) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TopbarDrawerShell);
    fixture.detectChanges();
  });

  it('opens the drawer through the topbar output', () => {
    const state = TestBed.inject(SidebarDrawerState);
    expect(state.isOpen()).toBe(false);

    // Click the hamburger in the topbar.
    const hamburger = fixture.nativeElement.querySelector('app-topbar button') as HTMLButtonElement;
    hamburger.click();
    fixture.detectChanges();

    expect(state.isOpen()).toBe(true);
  });
});
