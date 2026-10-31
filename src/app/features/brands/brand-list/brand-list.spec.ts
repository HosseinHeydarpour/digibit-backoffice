import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { PERMISSIONS } from '@core/auth/permissions.token';
import { ConfirmService } from '@core/services/confirm';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import type { Observable } from 'rxjs';

import type { Brand, BrandListItem, BrandQuery } from '../models/brand.model';
import { BrandsService } from '../services/brands.service';

import { BrandList } from './brand-list';

const SAMSUNG: BrandListItem = {
  id: '6',
  name: 'سامسونگ',
  slug: 'brand-6',
  logo: null,
  isActive: true,
  productCount: 3,
};

const NOKIA: BrandListItem = {
  id: '7',
  name: 'نوکیا',
  slug: 'brand-7',
  logo: null,
  isActive: false,
  productCount: 0,
};

class BrandsServiceStub {
  queries: BrandQuery[] = [];

  removed: string[] = [];

  toggled: { id: string; isActive: boolean }[] = [];

  failList = false;

  list(
    query: BrandQuery = {},
  ): Observable<{ items: BrandListItem[]; total: number; page: number; pageSize: number }> {
    this.queries.push(query);

    if (this.failList) {
      throw new Error('offline');
    }

    return of({ items: [SAMSUNG, NOKIA], total: 12, page: query.page ?? 1, pageSize: 10 });
  }

  get(id: string): Observable<Brand> {
    return of({ ...SAMSUNG, id, description: 'توضیح', createdAt: 1 });
  }

  setActive(id: string, isActive: boolean): Observable<Brand> {
    this.toggled.push({ id, isActive });

    return of({ ...SAMSUNG, id, isActive, description: '', createdAt: 1 });
  }

  remove(id: string): Observable<number> {
    this.removed.push(id);

    return of(0);
  }
}

class ConfirmStub {
  answer = true;

  calls = 0;

  confirm(): Promise<boolean> {
    this.calls += 1;

    return Promise.resolve(this.answer);
  }
}

describe('BrandList (BO-G05)', () => {
  let fixture: ComponentFixture<BrandList>;
  let service: BrandsServiceStub;
  let confirm: ConfirmStub;

  beforeEach(async () => {
    service = new BrandsServiceStub();
    confirm = new ConfirmStub();

    await TestBed.configureTestingModule({
      imports: [BrandList],
      providers: [
        { provide: BrandsService, useValue: service },
        { provide: ConfirmService, useValue: confirm },
        MessageService,
        { provide: PERMISSIONS, useValue: signal<readonly string[]>(['products.view']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BrandList);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('tc 1: renders the rows with their slug, product count and status pill', () => {
    expect(element().textContent).toContain('سامسونگ');
    expect(element().textContent).toContain('brand-6');
    expect(element().textContent).toContain('فعال');
    expect(element().textContent).toContain('غیرفعال');
    // Two rows, 12 total → two pages; the label reports the server total.
    expect(fixture.componentInstance.pageCount()).toBe(2);
  });

  it('tc 6: the toggle flips the row before the answer and calls the endpoint', async () => {
    const toggle = element().querySelector('[data-toggle-brand="6"]') as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();

    // The first row is optimistically off; the server stub echoes it back.
    expect(fixture.componentInstance.rows()?.[0].isActive).toBe(false);
    expect(service.toggled).toEqual([{ id: '6', isActive: false }]);
    await fixture.whenStable();
  });

  it('tc 7: delete asks first, and cancelling sends nothing', async () => {
    confirm.answer = false;

    await fixture.componentInstance.removeBrand(SAMSUNG);
    fixture.detectChanges();

    expect(confirm.calls).toBe(1);
    expect(service.removed).toEqual([]);
  });

  it('tc 7: confirming deletes and reloads the page', async () => {
    await fixture.componentInstance.removeBrand(SAMSUNG);
    await fixture.whenStable();

    expect(service.removed).toEqual(['6']);
    expect(service.queries.length).toBe(2);
  });

  it('tc 1: the search is debounced and starts again from page 1', async () => {
    const input = element().querySelector('#brand-search') as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;

    fixture.componentInstance.goTo(2);
    await fixture.whenStable();
    service.queries.length = 0;

    setter.call(input, 'سامسونگ');
    input.dispatchEvent(new Event('input', { bubbles: true }));

    // Nothing is sent for the first 300 ms.
    expect(service.queries).toEqual([]);

    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(service.queries).toEqual([{ query: 'سامسونگ', page: 1, pageSize: 10 }]);
  });

  it('tc 2: the dialog opens for create and for the full edit record', async () => {
    fixture.componentInstance.openCreate();
    expect(fixture.componentInstance.dialogOpen()).toBe(true);
    expect(fixture.componentInstance.editing()).toBeNull();

    fixture.componentInstance.closeDialog();
    fixture.componentInstance.openEdit(SAMSUNG);
    await fixture.whenStable();

    expect(fixture.componentInstance.editing()).toMatchObject({ id: '6', description: 'توضیح' });
  });
});
