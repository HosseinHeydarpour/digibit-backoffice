import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { MENU } from './menu';
import { Sidebar } from './sidebar';

const ACTIVE_CLASS = 'bg-primary/10';

/**
 * Real (empty) routes so RouterLinkActive has something to match.
 * Derived from MENU so this spec can never drift from the data.
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

describe('Sidebar', () => {
  let fixture: ComponentFixture<Sidebar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [provideRouter(ROUTES_FOR_TEST)],
    }).compileComponents();

    fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
  });

  it('renders all 12 menu items with Persian labels', () => {
    const links = fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>;
    expect(links.length).toBe(12);

    const labels = Array.from(links).map((a) => a.textContent?.trim());
    for (const item of MENU.flatMap((g) => g.items)) {
      expect(labels).toContain(item.label);
    }
  });

  it('renders every group heading', () => {
    const text: string = fixture.nativeElement.textContent;
    for (const group of MENU) {
      expect(text).toContain(group.label);
    }
  });

  it('renders an icon for every item', () => {
    const icons = fixture.nativeElement.querySelectorAll('a i.pi');
    expect(icons.length).toBe(12);
  });

  it('exposes MENU as a flat list of 12 unique routes', () => {
    const links = MENU.flatMap((g) => g.items.map((i) => i.routerLink));
    expect(links.length).toBe(12);
    expect(new Set(links).size).toBe(12);
  });

  it('highlights the item matching the active route', async () => {
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
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/orders');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(activeLinks(fixture)[0].textContent).toContain('سفارشها');

    await router.navigateByUrl('/settings');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(activeLinks(fixture)[0].textContent).toContain('تنظیمات');
  });

  it('highlights nothing when no menu route is active', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/no-such-page');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(activeLinks(fixture).length).toBe(0);
  });
});
