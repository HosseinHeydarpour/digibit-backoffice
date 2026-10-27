import { signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PERMISSIONS } from '@core/auth/permissions.token';
import { ConfirmService } from '@core/services/confirm';
import type { ConfirmOptions } from '@core/services/confirm';
import type { Page } from '@shared/models';
import { MessageService } from 'primeng/api';
import { Observable, of, Subject } from 'rxjs';

import type {
  Product,
  ProductBrandOption,
  ProductCategoryOption,
  ProductListItem,
  ProductStatus,
} from '../models/product.model';
import { ProductsService } from '../services/products.service';

import { ProductList } from './product-list';

const ROWS: ProductListItem[] = [
  {
    id: 'p-1',
    name: 'هدفون بی‌سیم سونی',
    sku: 'SKU-1007',
    categoryName: 'لوازم برقی',
    brandName: 'سونی',
    price: 2_100_000,
    stock: 12,
    lowStockThreshold: 5,
    status: 'published',
    createdAt: 1728969600000,
  },
  {
    id: 'p-2',
    name: 'کیبورد مکانیکی ریزر',
    sku: 'SKU-1001',
    categoryName: 'لوازم برقی',
    brandName: 'ریزر',
    price: 1_850_000,
    stock: 0,
    lowStockThreshold: 5,
    status: 'draft',
    createdAt: 1728883200000,
  },
];

const PRODUCT: Product = {
  id: 'p-1',
  name: 'هدفون بی‌سیم سونی',
  slug: 'sony-headphones',
  sku: 'SKU-1007',
  categoryId: '3',
  categoryName: 'لوازم برقی',
  brandId: '5',
  brandName: 'سونی',
  shortDescription: 'هدفون حرفه‌ای',
  description: 'هدفون بی‌سیم با حذف نویز فعال.',
  price: 2_100_000,
  stock: 12,
  lowStockThreshold: 5,
  status: 'published',
  images: [],
  variants: [],
  createdAt: 1728969600000,
};

class ProductsServiceStub {
  rows: ProductListItem[] = [...ROWS];

  listCalls = 0;

  statusCalls: { id: string; status: ProductStatus }[] = [];

  removeCalls: string[] = [];

  lastStatus: Subject<Product> | null = null;

  lastRemove: Subject<void> | null = null;

  list(): Observable<Page<ProductListItem>> {
    this.listCalls += 1;
    return of({ items: [...this.rows], total: this.rows.length, page: 1, pageSize: 20 });
  }

  categories(): Observable<readonly ProductCategoryOption[]> {
    return of([]);
  }

  brands(): Observable<readonly ProductBrandOption[]> {
    return of([]);
  }

  setStatus(id: string, status: ProductStatus): Observable<Product> {
    this.statusCalls.push({ id, status });
    this.lastStatus = new Subject<Product>();
    return this.lastStatus.asObservable();
  }

  remove(id: string): Observable<void> {
    this.removeCalls.push(id);
    this.lastRemove = new Subject<void>();
    return this.lastRemove.asObservable();
  }
}

class ConfirmStub {
  confirmed = true;

  calls: ConfirmOptions[] = [];

  confirm(options: ConfirmOptions): Promise<boolean> {
    this.calls.push(options);
    return Promise.resolve(this.confirmed);
  }
}

describe('ProductList row actions (BO-F06)', () => {
  let fixture: ComponentFixture<ProductList>;
  let component: ProductList;
  let service: ProductsServiceStub;
  let confirm: ConfirmStub;
  let permissions: WritableSignal<readonly string[]>;

  beforeEach(async () => {
    service = new ProductsServiceStub();
    confirm = new ConfirmStub();
    permissions = signal<readonly string[]>(['products.view']);

    await TestBed.configureTestingModule({
      imports: [ProductList],
      providers: [
        { provide: ProductsService, useValue: service },
        { provide: ConfirmService, useValue: confirm },
        { provide: PERMISSIONS, useValue: permissions },
        provideRouter([]),
        MessageService,
      ],
    }).compileComponents();
  });

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function mount(): Promise<void> {
    fixture = TestBed.createComponent(ProductList);
    component = fixture.componentInstance;
    await settle();
  }

  function firstRow(): HTMLElement {
    return fixture.nativeElement.querySelector('tbody tr') as HTMLElement;
  }

  it('tc 1/9: the mobile kebab selects the row and builds its three-item menu', async () => {
    await mount();

    const kebab = firstRow().querySelector(
      'button[aria-label="عملیات محصول"]',
    ) as HTMLButtonElement;
    expect(kebab).toBeTruthy();

    kebab.click();
    await settle();

    expect(component.selectedProduct()?.id).toBe('p-1');
    expect(
      component
        .actionItems()
        .map((item) => item.label)
        .filter((label) => label !== undefined),
    ).toEqual(['ویرایش', 'غیرفعال کردن', 'حذف']);
  });

  it('tc 2/6/7: accepting the status confirm flips the pill optimistically, then refetches', async () => {
    await mount();
    const before = service.listCalls;

    await component.toggleStatus(service.rows[0]);

    expect(confirm.calls).toHaveLength(1);
    expect(confirm.calls[0].message).toContain('هدفون بی‌سیم سونی');
    expect(confirm.calls[0].header).toBe('تغییر وضعیت محصول');
    expect(service.statusCalls).toEqual([{ id: 'p-1', status: 'inactive' }]);
    expect(component.items()![0].status).toBe('inactive');

    service.rows[0] = { ...service.rows[0], status: 'inactive' };
    service.lastStatus!.next(PRODUCT);
    service.lastStatus!.complete();
    await settle();

    expect(service.listCalls).toBe(before + 1);
    expect(component.items()![0].status).toBe('inactive');
  });

  it('tc 3: cancelling the status confirm changes nothing and sends no request', async () => {
    await mount();
    confirm.confirmed = false;

    await component.toggleStatus(service.rows[0]);

    expect(confirm.calls).toHaveLength(1);
    expect(service.statusCalls).toEqual([]);
    expect(component.items()![0].status).toBe('published');
  });

  it('tc 4: delete uses a dangerous confirm, removes the row and lowers the total', async () => {
    await mount();

    await component.removeProduct(service.rows[0]);

    expect(confirm.calls[0].danger).toBe(true);
    expect(confirm.calls[0].message).toContain('هدفون بی‌سیم سونی');
    expect(service.removeCalls).toEqual(['p-1']);
    expect(component.items()!.map((item) => item.id)).toEqual(['p-2']);
    expect(component.total()).toBe(1);
  });

  it('tc 5/7: a failed status request rolls the pill back to the server value', async () => {
    await mount();
    const before = service.listCalls;

    await component.toggleStatus(service.rows[0]);
    expect(component.items()![0].status).toBe('inactive');

    service.lastStatus!.error(new Error('offline'));
    await settle();

    expect(component.items()![0].status).toBe('published');
    expect(service.listCalls).toBe(before);
  });

  it('tc 5/7: a failed delete restores the row and the total', async () => {
    await mount();

    await component.removeProduct(service.rows[0]);
    expect(component.items()!.map((item) => item.id)).toEqual(['p-2']);

    service.lastRemove!.error(new Error('offline'));
    await settle();

    expect(component.items()!.map((item) => item.id)).toEqual(['p-1', 'p-2']);
    expect(component.total()).toBe(2);
  });

  it('tc 9: without the products.view grant the actions are hidden and no-op', async () => {
    permissions.set([]);
    await mount();

    expect(firstRow().querySelector('button[aria-label="عملیات محصول"]')).toBeNull();
    expect(firstRow().querySelector('button[aria-label="تغییر وضعیت"]')).toBeNull();
    expect(firstRow().querySelector('button[aria-label="حذف"]')).toBeNull();

    await component.toggleStatus(service.rows[0]);

    expect(confirm.calls).toEqual([]);
    expect(service.statusCalls).toEqual([]);
  });

  it('tc 10: inline actions are desktop-only and the kebab is mobile-only', async () => {
    await mount();

    const actionCell = firstRow().querySelector('td:last-child') as HTMLElement;
    const desktop = actionCell.querySelector('div') as HTMLElement;
    const kebab = actionCell.querySelector('button[aria-label="عملیات محصول"]') as HTMLElement;

    expect(desktop.className).toContain('hidden');
    expect(desktop.className).toContain('sm:flex');
    expect(kebab.className).toContain('sm:hidden');
  });
});
