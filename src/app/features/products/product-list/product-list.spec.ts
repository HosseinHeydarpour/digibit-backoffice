import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PERMISSIONS } from '@core/auth/permissions.token';
import type { Page } from '@shared/models';
import { ConfirmationService, MessageService } from 'primeng/api';
import { NEVER, Observable, of, throwError } from 'rxjs';

import type {
  ProductBrandOption,
  ProductCategoryOption,
  ProductListItem,
} from '../models/product.model';
import { ProductsService } from '../services/products.service';

import { ProductList } from './product-list';

const PRODUCTS: readonly ProductListItem[] = [
  {
    id: 'p-1001',
    name: 'کیبورد مکانیکی ریزر BlackWidow',
    categoryName: 'لوازم جانبی',
    brandName: 'ریزر',
    price: 1_850_000,
    stock: 0,
    lowStockThreshold: 5,
    variantsCount: 0,
    status: 'published',
    createdAt: 1729142400000,
  },
  {
    id: 'p-1002',
    name: 'ماوس گیمینگ لاجیتک G502',
    categoryName: 'لوازم جانبی',
    brandName: 'لاجیتک',
    price: 920_000,
    stock: 3,
    lowStockThreshold: 5,
    variantsCount: 0,
    status: 'published',
    createdAt: 1729056000000,
  },
  {
    id: 'p-1003',
    name: 'هدفون بی‌سیم سونی WH-1000XM5',
    categoryName: 'صوتی',
    brandName: 'سونی',
    price: 2_100_000,
    stock: 12,
    lowStockThreshold: 5,
    variantsCount: 0,
    status: 'draft',
    createdAt: 1728969600000,
  },
  {
    id: 'p-1004',
    name: 'مانیتور ۲۴ اینچ ال‌جی UltraGear',
    categoryName: 'نمایشگر',
    brandName: 'ال‌جی',
    price: 8_400_000,
    stock: 25,
    lowStockThreshold: 5,
    variantsCount: 0,
    status: 'inactive',
    createdAt: 1728883200000,
  },
];

/**
 * Recording stub for the page's only data source.
 *
 * A class, not `vi.fn()`: the project's specs record what happened on a plain
 * object, so `listCalls` is the observable proof that the retry button really
 * re-subscribed instead of only clearing the error message.
 *
 * The three dials cover every outcome a list fetch has: rows (tc 1–6, 10), an
 * empty array (tc 8), `NEVER` (tc 9) and a rejection (the error path).
 */
class ProductsServiceStub {
  listCalls = 0;

  rows: readonly ProductListItem[] = PRODUCTS;

  failWith: string | null = null;

  /** `true` → the request never answers, i.e. the in-flight state. */
  hang = false;

  list(): Observable<Page<ProductListItem>> {
    this.listCalls += 1;
    if (this.hang) {
      return NEVER;
    }
    return this.failWith === null
      ? of({ items: [...this.rows], total: this.rows.length, page: 1, pageSize: 20 })
      : throwError(() => new Error(this.failWith ?? 'request failed'));
  }

  /** BO-F03's filter bar asks for these at construction; the F02 cases need none. */
  categories(): Observable<readonly ProductCategoryOption[]> {
    return of([]);
  }

  brands(): Observable<readonly ProductBrandOption[]> {
    return of([]);
  }
}

/** Let the `toSignal` pipeline drain, then render. */
async function settle(fixture: ComponentFixture<ProductList>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('ProductList (BO-F02)', () => {
  let fixture: ComponentFixture<ProductList>;
  let component: ProductList;
  let service: ProductsServiceStub;

  beforeEach(async () => {
    service = new ProductsServiceStub();

    await TestBed.configureTestingModule({
      imports: [ProductList],
      providers: [
        // The stub, not the real service: this spec is tc 7 («تست واحد با موک سرویس»).
        { provide: ProductsService, useValue: service },
        // `routerLink` on the edit link and the empty state's navigation.
        provideRouter([]),
        // `ToastService` is root-provided but injects `MessageService`, which is
        // NOT root-provided by itself (see app.config.ts).
        MessageService,
        // BO-F06: ConfirmService injects PrimeNG's ConfirmationService, and the
        // row actions only render for a signed-in user with the module grant.
        ConfirmationService,
        { provide: PERMISSIONS, useValue: signal<readonly string[]>(['products.view']) },
      ],
    }).compileComponents();
  });

  /**
   * Create the page AFTER the stub's dials are set and let the fetch drain.
   *
   * The component subscribes in a field initialiser, so a test that wanted an
   * error would have to dial `failWith` before `createComponent` — otherwise the
   * first request has already succeeded and the page is showing data.
   */
  async function mount(): Promise<void> {
    fixture = TestBed.createComponent(ProductList);
    component = fixture.componentInstance;
    await settle(fixture);
  }

  // ─── tc 1 · the table fills from the service ──────────────────────────────

  it('tc 1: renders one row per product the service returns', async () => {
    await mount();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(PRODUCTS.length);
    expect(rows[0].textContent).toContain('کیبورد مکانیکی ریزر BlackWidow');
  });

  // ─── tc 2 · Persian column titles ─────────────────────────────────────────

  it('tc 2: renders the eight columns with Persian titles', async () => {
    await mount();

    const headers = Array.from(
      fixture.nativeElement.querySelectorAll('thead th') as NodeListOf<HTMLElement>,
    ).map((th) => th.textContent.trim());

    expect(headers).toEqual([
      'نام محصول',
      'دسته',
      'برند',
      'قیمت',
      'موجودی',
      'وضعیت',
      'تاریخ ثبت',
      'عملیات',
    ]);
  });

  // ─── tc 3 · price pipe + Solar date ───────────────────────────────────────

  it('tc 3: formats price with the toman pipe and the date as Solar', async () => {
    await mount();

    const priceCell = fixture.nativeElement.querySelector('tbody tr td:nth-child(4)');
    expect(priceCell.textContent).toContain('۱٬۸۵۰٬۰۰۰');
    expect(priceCell.textContent).toContain('تومان');

    const dateCell = fixture.nativeElement.querySelector('tbody tr td:nth-child(7)');
    expect(dateCell.textContent.trim()).toMatch(/^۱۴۰۳\/[۰-۹]{2}\/[۰-۹]{2}$/);
  });

  // ─── tc 4 · coloured status badge ─────────────────────────────────────────

  it('tc 4: shows a coloured pill per status with its Persian label', async () => {
    await mount();

    expect(component.statusLabel('published')).toBe('منتشر شده');
    expect(component.statusLabel('draft')).toBe('پیش‌نویس');
    expect(component.statusLabel('inactive')).toBe('غیرفعال');

    expect(component.statusBadgeClass('published')).toContain('text-green-800');
    expect(component.statusBadgeClass('inactive')).toContain('text-red-800');

    const pills = fixture.nativeElement.querySelectorAll('tbody tr td:nth-child(6) span');
    expect(pills.length).toBe(4);
    expect(pills[0].textContent.trim()).toBe('منتشر شده');
    expect(pills[2].textContent.trim()).toBe('پیش‌نویس');
    expect(pills[2].className).toContain('bg-gray-100');
  });

  // ─── BO-F12 · stock level ─────────────────────────────────────────────────

  it('BO-F12 tc 5: warns when a row is at or below its own threshold', async () => {
    await mount();

    // PRODUCTS: 0 / 3 / 12 / 25 against a threshold of 5.
    expect(component.stockMeta(PRODUCTS[0]).label).toBe('ناموجود');
    expect(component.stockMeta(PRODUCTS[1]).label).toBe('کم‌موجودی');
    expect(component.stockMeta(PRODUCTS[2]).label).toBe('موجود');

    const cells = Array.from(
      fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLTableRowElement>,
    ).map((row) => row.querySelectorAll('td')[4].textContent ?? '');

    expect(cells[0]).toContain('ناموجود');
    expect(cells[1]).toContain('کم‌موجودی');
    expect(cells[2]).not.toContain('کم‌موجودی');
    expect(cells[2]).not.toContain('ناموجود');
  });

  // ─── tc 5 · the actions column ────────────────────────────────────────────

  it('tc 5: renders edit / status / delete actions, each labelled', async () => {
    await mount();

    const row = fixture.nativeElement.querySelector('tbody tr');

    // ویرایش is a REAL link: the edit route exists since BO-F01. (A property
    // binding `[routerLink]` leaves no attribute behind — the router writes the
    // `href`, which is what a user actually follows.)
    const editLink = row.querySelector('a[href]') as HTMLAnchorElement;
    expect(editLink.getAttribute('href')).toBe('/products/p-1001/edit');

    const statusButton = row.querySelector('button[aria-label="تغییر وضعیت"]') as HTMLButtonElement;
    const deleteButton = row.querySelector('button[aria-label="حذف"]') as HTMLButtonElement;
    expect(statusButton).toBeTruthy();
    expect(deleteButton).toBeTruthy();
  });

  it('tc 5: the status/delete confirmation flows are covered by the BO-F06 spec', async () => {
    await mount();

    const row = fixture.nativeElement.querySelector('tbody tr');
    expect(row.querySelector('button[aria-label="تغییر وضعیت"]')).toBeTruthy();
    expect(row.querySelector('button[aria-label="حذف"]')).toBeTruthy();
  });

  // ─── tc 6 · mobile column hiding ──────────────────────────────────────────

  it('tc 6: drops category/brand/createdAt on small screens', async () => {
    await mount();

    const ths = fixture.nativeElement.querySelectorAll('thead th');
    // دسته — hidden below sm · برند — hidden below lg · تاریخ — hidden below md.
    expect(ths[1].className).toContain('hidden');
    expect(ths[1].className).toContain('sm:table-cell');
    expect(ths[2].className).toContain('hidden');
    expect(ths[2].className).toContain('lg:table-cell');
    expect(ths[6].className).toContain('hidden');
    expect(ths[6].className).toContain('md:table-cell');

    const tds = fixture.nativeElement.querySelectorAll('tbody tr td');
    expect(tds[1].className).toContain('hidden');
    expect(tds[1].className).toContain('sm:table-cell');
    expect(tds[2].className).toContain('lg:table-cell');
    expect(tds[6].className).toContain('md:table-cell');
  });

  // ─── tc 7 · mocked-service unit test (the suite itself) ───────────────────

  it('tc 7: fetches through the service exactly once on first paint', async () => {
    await mount();

    expect(service.listCalls).toBe(1);
    expect(component.items()?.length).toBe(PRODUCTS.length);
  });

  it('the search box is a real PrimeNG field, so the icon has its own padding', async () => {
    await mount();

    // `pInputText` is a DIRECTIVE: without `InputText` in this component's
    // imports the attribute stays inert, the input loses its chrome and the
    // glyph sits on the placeholder (the bug this test pins).
    const input = fixture.nativeElement.querySelector('#product-search') as HTMLInputElement;
    expect(input.className).toContain('p-inputtext');
  });

  // ─── tc 8 · empty state ───────────────────────────────────────────────────

  it('tc 8: shows the empty state (not an empty table) when the shop has no products', async () => {
    service.rows = [];
    await mount();

    expect(fixture.nativeElement.querySelector('tbody tr')).toBeNull();

    const status = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement;
    expect(status).toBeTruthy();
    expect(status.textContent).toContain('هنوز محصولی ثبت نشده');
    expect(status.textContent).toContain('اولین کالای فروشگاه را اضافه کنید.');
  });

  // ─── tc 9 · loading skeleton ──────────────────────────────────────────────

  it('tc 9: shows a skeleton while the request is in flight', async () => {
    service.hang = true;
    await mount();

    expect(component.state()).toBe('loading');
    const skeletonRows = fixture.nativeElement.querySelectorAll('tbody tr.animate-pulse');
    expect(skeletonRows.length).toBe(4);
  });

  // ─── tc 10 · the result count ─────────────────────────────────────────────

  it('tc 10: prints the result count under the table', async () => {
    await mount();

    const footer = fixture.nativeElement.querySelector('.border-t') as HTMLElement;
    expect(footer.textContent).toContain('۴');
    expect(footer.textContent).toContain('محصول');
  });

  // ─── BO-E07's error path, on a page that owns its fetch ───────────────────

  it('error: shows the error block instead of the table when the fetch rejects', async () => {
    service.failWith = 'network down';
    await mount();

    expect(component.state()).toBe('error');
    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    expect(alert).toBeTruthy();
    expect(alert.textContent).toContain('دریافت محصولات ناموفق بود');
    expect(fixture.nativeElement.querySelector('tbody tr')).toBeNull();
  });

  it('error: «تلاش دوباره» re-runs the request and can recover', async () => {
    service.failWith = 'network down';
    await mount();
    expect(service.listCalls).toBe(1);

    service.failWith = null;
    (fixture.nativeElement.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    await settle(fixture);

    expect(service.listCalls).toBe(2);
    expect(component.state()).toBe('data');
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(PRODUCTS.length);
  });

  // ─── the one switch that drives the template ──────────────────────────────

  it('state() resolves error > loading > empty > data', async () => {
    service.failWith = 'boom';
    await mount();
    expect(component.state()).toBe('error');

    service.failWith = null;
    service.hang = true;
    component.retry();
    await settle(fixture);
    // A `null` payload that has not answered reads as "loading", never as the
    // empty state — otherwise the shop looks empty while a request is in flight.
    expect(component.state()).toBe('loading');

    service.hang = false;
    service.rows = [];
    component.retry();
    await settle(fixture);
    expect(component.state()).toBe('empty');
  });
});
