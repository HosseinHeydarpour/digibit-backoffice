import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { PERMISSIONS } from '@core/auth/permissions.token';

import { MENU, MENU_PERMISSIONS } from './menu';
import type { Permission } from './menu.model';
import { Sidebar } from './sidebar';

const ACTIVE_CLASS = 'bg-primary/10';

/**
 * Real (empty) routes so RouterLinkActive has something to match.
 * Derived from the raw MENU, not the filtered view, so the spec cannot drift.
 * The wildcard keeps unmatched navigations from throwing NG04002.
 */
const ROUTES_FOR_TEST = [
  ...MENU.flatMap((group) =>
    group.items.map((item) => ({
      path: item.routerLink.replace(/^\//, ''),
      children: [],
    })),
  ),
  { path: '**', children: [] },
];

function activeLinks(fixture: ComponentFixture<Sidebar>): HTMLAnchorElement[] {
  const anchors = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];
  // classList.contains, not a CSS selector: Angular writes class="bg-primary/10 ..."
  // and the "/" makes it an invalid selector for querySelectorAll.
  return anchors.filter((a) => a.classList.contains(ACTIVE_CLASS));
}

function renderedLabels(fixture: ComponentFixture<Sidebar>): string[] {
  const links = Array.from(
    fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>,
  );
  return links.map((a) => a.textContent?.trim() ?? '');
}

/** Boot the sidebar with a mutable permission signal so re-login can be simulated. */
function createSidebar(initial: readonly Permission[] = MENU_PERMISSIONS): {
  fixture: ComponentFixture<Sidebar>;
  permissions: ReturnType<typeof signal<readonly string[]>>;
} {
  const permissions = signal<readonly string[]>(initial);

  TestBed.configureTestingModule({
    imports: [Sidebar],
    providers: [provideRouter(ROUTES_FOR_TEST), { provide: PERMISSIONS, useValue: permissions }],
  });

  const fixture = TestBed.createComponent(Sidebar);
  fixture.detectChanges();

  return { fixture, permissions };
}

describe('Sidebar', () => {
  it('renders all 12 menu items when every permission is granted', () => {
    const { fixture } = createSidebar();

    const links = renderedLabels(fixture);
    expect(links.length).toBe(12);

    for (const item of MENU.flatMap((g) => g.items)) {
      expect(links).toContain(item.label);
    }
  });

  it('renders every group heading when every permission is granted', () => {
    const { fixture } = createSidebar();
    const text: string = fixture.nativeElement.textContent;

    for (const group of MENU) {
      expect(text).toContain(group.label);
    }
  });

  it('renders an icon for every visible item', () => {
    const { fixture } = createSidebar();

    expect(fixture.nativeElement.querySelectorAll('a i.pi').length).toBe(12);
  });

  it('exposes MENU as a flat list of 12 unique routes', () => {
    const links = MENU.flatMap((g) => g.items.map((i) => i.routerLink));

    expect(links.length).toBe(12);
    expect(new Set(links).size).toBe(12);
  });

  it('hides items the user has no permission for (tc 1)', () => {
    const { fixture } = createSidebar(['products.view']);
    const labels = renderedLabels(fixture);

    expect(labels).toContain('محصولات');
    expect(labels).not.toContain('سفارش‌ها');
    expect(labels).not.toContain('تنظیمات');
  });

  it('keeps hidden items out of the DOM entirely, not just visually (tc 6)', () => {
    const { fixture } = createSidebar(['products.view']);

    // querySelector, not textContent: a CSS-hidden element would still match
    // the former only if it existed, so this proves absence rather than opacity.
    const links = Array.from(
      fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>,
    );
    const hrefs = links.map((a) => a.getAttribute('href') ?? '');
    expect(hrefs.some((h) => h.includes('/settings'))).toBe(false);

    // And the group heading must be gone too.
    expect(fixture.nativeElement.textContent).not.toContain('سیستم');
  });

  it('renders only the dashboard for a user with no permissions', () => {
    const { fixture } = createSidebar([]);
    const labels = renderedLabels(fixture);

    expect(labels).toEqual(['پیشخوان']);
  });

  it('rebuilds the menu when permissions change (tc 4)', () => {
    const { fixture, permissions } = createSidebar(['products.view']);
    expect(renderedLabels(fixture)).toHaveLength(4);

    // Simulates a re-login as a SuperAdmin.
    permissions.set(MENU_PERMISSIONS);
    fixture.detectChanges();

    expect(renderedLabels(fixture)).toHaveLength(12);
  });

  it('narrows the menu when permissions are revoked (tc 4)', () => {
    const { fixture, permissions } = createSidebar(MENU_PERMISSIONS);
    expect(renderedLabels(fixture)).toHaveLength(12);

    permissions.set([]);
    fixture.detectChanges();

    expect(renderedLabels(fixture)).toEqual(['پیشخوان']);
  });

  it('renders without error when no permissions provider value is set (tc 10)', () => {
    // The token's own default is an empty list; this asserts the sidebar copes
    // with it instead of throwing on an undefined permission.
    TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [provideRouter(ROUTES_FOR_TEST)],
    });
    const fixture = TestBed.createComponent(Sidebar);

    expect(() => fixture.detectChanges()).not.toThrow();
    expect(renderedLabels(fixture)).toEqual(['پیشخوان']);
  });

  it('highlights the item matching the active route', async () => {
    const { fixture } = createSidebar();
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/products');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const highlighted = activeLinks(fixture);
    expect(highlighted.length).toBe(1);
    expect(highlighted[0].textContent).toContain('محصولات');
  });

  it('moves the highlight when the route changes', async () => {
    const { fixture } = createSidebar();
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/orders');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(activeLinks(fixture)[0].textContent).toContain('سفارش‌ها');

    await router.navigateByUrl('/settings');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(activeLinks(fixture)[0].textContent).toContain('تنظیمات');
  });

  it('highlights nothing when no menu route is active', async () => {
    const { fixture } = createSidebar();
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/no-such-page');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(activeLinks(fixture).length).toBe(0);
  });

  it('applies the active class to the link matching the current route', async () => {
    const { fixture } = createSidebar();
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/products');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const active = fixture.nativeElement.querySelector('a.bg-primary\\/10');
    expect(active?.textContent).toContain('محصولات');
  });
});
