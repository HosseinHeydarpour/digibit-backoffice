// src/app/features/dashboard/low-stock/low-stock.spec.ts
//
// BO-E05 — the low-stock card, tested at the level each test case can actually
// be tested at:
//
//   tc1, tc2, tc3, tc5, tc7, tc9, tc10  → DOM (what the user sees)
//   tc4                                 → the emitted id + "one click, one navigation"
//   tc6                                 → `filteredItems()` without a DOM at all
//   tc8 (mobile)                        → NOT here: jsdom has no layout, so
//                                         "readable on a phone" is a browser
//                                         check. The markup it relies on
//                                         (`min-w-0` + `truncate`, a 44px
//                                         button on `max-sm`) is asserted by
//                                         class in tc8c instead.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import type { DashboardLowStockItem } from '../models/dashboard.model';

import { LowStock } from './low-stock';

// ─── fixture helpers ─────────────────────────────────────────────────────────

const item = (overrides: Partial<DashboardLowStockItem> = {}): DashboardLowStockItem => ({
  id: 'p1',
  name: 'کیبورد مکانیکی',
  stock: 3,
  price: 1_850_000,
  imageUrl: null,
  ...overrides,
});

/** Three items: stock 3, stock 0, stock 12 — only the first two are ≤ threshold=5. */
const ITEMS: readonly DashboardLowStockItem[] = [
  item({ id: 'p1', name: 'کیبورد', stock: 3 }),
  item({ id: 'p2', name: 'ماوس', stock: 0 }),
  item({ id: 'p3', name: 'هدفون', stock: 12 }),
];

describe('LowStock (BO-E05)', () => {
  let fixture: ComponentFixture<LowStock>;
  let component: LowStock;
  let el: HTMLElement;

  async function setup(
    inputs: {
      items?: readonly DashboardLowStockItem[] | null;
      threshold?: number;
      loading?: boolean;
    } = {},
  ): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [LowStock],
      // The «مشاهده همه» link is a real `routerLink`.
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LowStock);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;

    // `items: null` is a real input value ("no response yet"), so it cannot be
    // folded into the `undefined` default the way the other inputs can.
    fixture.componentRef.setInput('items', inputs.items === undefined ? ITEMS : inputs.items);

    if (inputs.threshold !== undefined) {
      fixture.componentRef.setInput('threshold', inputs.threshold);
    }
    if (inputs.loading !== undefined) {
      fixture.componentRef.setInput('loading', inputs.loading);
    }

    fixture.detectChanges();
  }

  // ─── tc1: only items at or below the threshold are shown ───────────────────

  it('tc1: hides items whose stock exceeds the threshold', async () => {
    await setup();

    expect(el.textContent).toContain('کیبورد');
    expect(el.textContent).toContain('ماوس');
    expect(el.textContent).not.toContain('هدفون');
  });

  // ─── tc2: the threshold input controls the cut-off ─────────────────────────

  it('tc2: applies a custom threshold — the stock-3 item is hidden when threshold=2', async () => {
    await setup({ threshold: 2 });

    expect(el.textContent).not.toContain('کیبورد'); // stock 3 > 2
    expect(el.textContent).toContain('ماوس'); // stock 0 ≤ 2
  });

  it('tc2b: defaults to the shared threshold (5), so 5 is included and 6 is not', async () => {
    await setup({
      items: [item({ id: 'a', name: 'پنج', stock: 5 }), item({ id: 'b', name: 'شش', stock: 6 })],
    });

    expect(el.textContent).toContain('پنج');
    expect(el.textContent).not.toContain('شش');
  });

  // ─── tc3: badge colours — red for 0, yellow for low stock ──────────────────

  it('tc3a: shows ناموجود for a stock-0 item', async () => {
    await setup({ items: [item({ stock: 0 })] });

    expect(el.textContent).toContain('ناموجود');
  });

  it('tc3b: red badge class when stock is 0', async () => {
    await setup({ items: [item({ stock: 0 })] });

    expect(component.stockBadgeClass(0)).toContain('red');
  });

  it('tc3c: yellow badge class for non-zero low stock', async () => {
    await setup({ items: [item({ stock: 3 })] });

    expect(component.stockBadgeClass(3)).toContain('yellow');
  });

  it('tc3d: the badge class reaches the DOM, not just the method', async () => {
    await setup({ items: [item({ stock: 0 })] });

    // Scoped to the row list: the header's count badge is red too, so an
    // unscoped `.bg-red-100` would pass even if the row badge lost its class.
    expect(el.querySelector('.divide-y span.whitespace-nowrap.bg-red-100')).toBeTruthy();
  });

  // ─── tc4: edit emits the product id, and only that ─────────────────────────

  it('tc4: the edit button emits editClick with the item id', async () => {
    await setup({ items: [item({ id: 'abc-123' })] });

    const emitted: string[] = [];
    component.editClick.subscribe((id: string) => emitted.push(id));

    (el.querySelector('button[title="ویرایش محصول"]') as HTMLButtonElement).click();

    expect(emitted).toEqual(['abc-123']);
  });

  it('tc4b: the edit control is a button, not a link — one click must not navigate twice', async () => {
    // It used to be `<a [routerLink]="['/products', id]" (click)="onEdit(...)">`,
    // which navigated through the link AND again through the page's handler.
    // The widget emits; the page routes.
    await setup({ items: [item({ id: 'abc-123' })] });

    expect(el.querySelector('a[title="ویرایش محصول"]')).toBeNull();
    expect(el.querySelector('button[title="ویرایش محصول"]')).toBeTruthy();
  });

  // ─── tc5: count badge in the header ────────────────────────────────────────

  it('tc5: the count badge shows how many items are at or below the threshold', async () => {
    await setup();

    // Two of the three ITEMS qualify; `persianDigits` turns 2 into ۲. Scoped to
    // the header: the stock-0 row badge carries the same red classes.
    const badge = el.querySelector('.border-b span.rounded-full');

    expect(badge?.textContent?.trim()).toBe('۲');
  });

  it('tc5b: the count badge is hidden when nothing qualifies', async () => {
    await setup({ items: [] });

    expect(el.querySelector('.border-b span.rounded-full')).toBeNull();
  });

  // ─── tc6: filteredItems, no DOM ────────────────────────────────────────────

  it('tc6: filteredItems filters and sorts by stock ascending', async () => {
    await setup({ threshold: 4 });

    const ids = component.filteredItems().map((i: DashboardLowStockItem) => i.id);

    // p2 (0) before p1 (3); p3 (12) excluded.
    expect(ids).toEqual(['p2', 'p1']);
  });

  it('tc6b: filteredItems does not reorder the array it was given', async () => {
    const input: readonly DashboardLowStockItem[] = [
      item({ id: 'high', stock: 4 }),
      item({ id: 'low', stock: 0 }),
    ];
    await setup({ items: input });

    component.filteredItems();

    // `sort` mutates; the copy is what makes that safe for a `readonly` input.
    expect(input.map((i) => i.id)).toEqual(['high', 'low']);
  });

  // ─── tc7: the empty state is good news ─────────────────────────────────────

  it('tc7a: shows the healthy-warehouse message for an empty array', async () => {
    await setup({ items: [] });

    expect(el.textContent).toContain('موجودی انبار در وضعیت سالم است');
  });

  it('tc7b: shows the healthy message when every item is above the threshold', async () => {
    await setup({ items: [item({ stock: 50 })] });

    expect(el.textContent).toContain('موجودی انبار در وضعیت سالم است');
  });

  it('tc7c: `null` means "no answer yet" — a skeleton, never the healthy message', async () => {
    // The bug this pins: `null` used to fall through to `filteredItems().length
    // === 0` and print «موجودی انبار در وضعیت سالم است» at a user whose request
    // had not come back. A false all-clear is worse than a placeholder.
    await setup({ items: null });

    expect(el.querySelectorAll('.animate-pulse').length).toBe(4);
    expect(el.textContent).not.toContain('موجودی انبار در وضعیت سالم است');
  });

  // ─── tc8: skeleton while loading ───────────────────────────────────────────

  it('tc8a: renders four skeleton rows while loading=true', async () => {
    await setup({ loading: true });

    expect(el.querySelectorAll('.animate-pulse').length).toBe(4);
  });

  it('tc8b: hides the count badge while loading', async () => {
    await setup({ loading: true });

    expect(el.querySelector('.border-b span.rounded-full')).toBeNull();
  });

  it('tc8c: keeps the row on one line and gives the pencil a 44px touch target', async () => {
    await setup();

    // jsdom cannot measure layout, so this pins the two classes the mobile
    // check depends on: the name truncates instead of pushing the badge out,
    // and the button grows to 44px below `sm`.
    expect(el.querySelector('.truncate.text-sm.font-medium')).toBeTruthy();
    expect(el.querySelector('button[title="ویرایش محصول"]')?.className).toContain('max-sm:size-11');
  });

  // ─── tc9: lowest stock first ───────────────────────────────────────────────

  it('tc9: lists the stock-0 item before the stock-3 item', async () => {
    await setup();

    const names = Array.from(el.querySelectorAll('.truncate.text-sm.font-medium')).map(
      (n) => n.textContent?.trim() ?? '',
    );

    expect(names.indexOf('ماوس')).toBeLessThan(names.indexOf('کیبورد'));
  });

  // ─── tc10: thumbnail, or a glyph when there is none ────────────────────────

  it('tc10a: renders an img when imageUrl is provided', async () => {
    await setup({ items: [item({ imageUrl: 'https://cdn.test/product.jpg' })] });

    const img = el.querySelector('img') as HTMLImageElement | null;

    expect(img).toBeTruthy();
    expect(img?.src).toContain('product.jpg');
  });

  it('tc10b: renders the pi-box glyph when imageUrl is null', async () => {
    await setup({ items: [item({ imageUrl: null })] });

    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('.pi-box')).toBeTruthy();
  });
});
