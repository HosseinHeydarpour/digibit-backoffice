import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { ApiError } from '@shared/models';
import { of, throwError } from 'rxjs';
import type { Observable } from 'rxjs';

import type { CategoryDeleteStrategy, CategoryNode } from '../models/category.model';
import { CategoriesService } from '../services/categories.service';

import { CategoryDelete } from './category-delete';

/** A node with the fields the dialog reads; everything else is filler. */
function node(overrides: Partial<CategoryNode> = {}): CategoryNode {
  return {
    id: 'c-1',
    parentId: null,
    name: 'لوازم تحریر',
    slug: 'stationery',
    icon: 'pi pi-pen-to-square',
    order: 1,
    isActive: true,
    description: '',
    productCount: 0,
    children: [],
    ...overrides,
  };
}

class CategoriesServiceStub {
  removed: { id: string; strategy: CategoryDeleteStrategy }[] = [];

  fail: ApiError | null = null;

  remove(id: string, strategy: CategoryDeleteStrategy): Observable<void> {
    this.removed.push({ id, strategy });

    return this.fail ? throwError(() => this.fail) : of(undefined);
  }
}

describe('CategoryDelete (BO-G04)', () => {
  let fixture: ComponentFixture<CategoryDelete>;
  let service: CategoriesServiceStub;

  beforeEach(async () => {
    service = new CategoriesServiceStub();

    await TestBed.configureTestingModule({
      imports: [CategoryDelete],
      providers: [{ provide: CategoriesService, useValue: service }],
    }).compileComponents();
  });

  async function mount(category: CategoryNode, parentName: string | null = null): Promise<void> {
    fixture = TestBed.createComponent(CategoryDelete);
    fixture.componentRef.setInput('category', category);
    fixture.componentRef.setInput('parentName', parentName);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function button(selector: string): HTMLButtonElement {
    return element().querySelector(selector) as HTMLButtonElement;
  }

  it('tc 1: the default category is protected and offers only «باشه»', async () => {
    await mount(node({ isDefault: true, productCount: 12 }));

    expect(element().textContent).toContain('این دستهٔ پیش‌فرض است');
    expect(element().querySelector('[data-delete-confirm]')).toBeNull();

    let closed = false;
    fixture.componentInstance.cancelled.subscribe(() => (closed = true));
    button('[data-delete-dismiss]').click();

    expect(closed).toBe(true);
    expect(service.removed).toEqual([]);
  });

  it('tc 2: a category with products warns that they move to «بدون دسته‌بندی»', async () => {
    await mount(node({ productCount: 3 }));

    expect(element().textContent).toContain('۳ محصول در این دسته');
    expect(element().textContent).toContain('«بدون دسته‌بندی» منتقل می‌شوند');
    expect(element().querySelector('[data-delete-confirm]')).not.toBeNull();
  });

  it('tc 1: confirming deletes and reports the node', async () => {
    await mount(node());

    let deleted: CategoryNode | null = null;
    fixture.componentInstance.deleted.subscribe((value) => (deleted = value));

    button('[data-delete-confirm]').click();
    await fixture.whenStable();

    expect(service.removed).toEqual([{ id: 'c-1', strategy: 'transfer' }]);
    expect(deleted).toMatchObject({ id: 'c-1' });
  });

  it('tc 3: a parent offers the transfer choice, naming the level the children go to', async () => {
    await mount(node({ children: [node({ id: 'c-2', parentId: 'c-1' })] }), 'لوازم جانبی موبایل');

    expect(element().textContent).toContain('انتقال به لوازم جانبی موبایل');
    expect(element().querySelector('#delete-strategy-transfer')).not.toBeNull();

    button('[data-delete-confirm]').click();
    await fixture.whenStable();

    // Transfer is the default: it loses nothing.
    expect(service.removed).toEqual([{ id: 'c-1', strategy: 'transfer' }]);
  });

  it('tc 4: picking the cascade sends it', async () => {
    await mount(node({ children: [node({ id: 'c-2', parentId: 'c-1' })] }));

    expect(element().textContent).toContain('انتقال به سطح اصلی');
    expect(element().textContent).toContain('زیردسته‌ها را هم حذف کن');

    const cascade = element().querySelector('#delete-strategy-cascade') as HTMLInputElement;
    cascade.click();
    fixture.detectChanges();

    button('[data-delete-confirm]').click();
    await fixture.whenStable();

    expect(service.removed).toEqual([{ id: 'c-1', strategy: 'cascade' }]);
  });

  it('tc 10: a child with products does not block anything — they move too', async () => {
    await mount(node({ children: [node({ id: 'c-2', parentId: 'c-1', productCount: 5 })] }));

    const cascade = element().querySelector('#delete-strategy-cascade') as HTMLInputElement;
    expect(cascade.disabled).toBe(false);
    expect(element().textContent).toContain('۵ محصول در این دسته');

    cascade.click();
    fixture.detectChanges();
    button('[data-delete-confirm]').click();
    await fixture.whenStable();

    expect(service.removed).toEqual([{ id: 'c-1', strategy: 'cascade' }]);
  });

  it('a failed delete keeps the dialog open with the server message', async () => {
    await mount(node());
    service.fail = new ApiError('DEFAULT_CATEGORY', 'دستهٔ پیش‌فرض قابل حذف نیست.', 409);

    button('[data-delete-confirm]').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element().textContent).toContain('دستهٔ پیش‌فرض قابل حذف نیست.');
    expect(element().querySelector('[data-delete-confirm]')).not.toBeNull();
  });

  it('tc 5: cancel closes and never calls the server', async () => {
    await mount(node());

    let closed = false;
    fixture.componentInstance.cancelled.subscribe(() => (closed = true));

    button('[data-delete-cancel]').click();

    expect(closed).toBe(true);
    expect(service.removed).toEqual([]);
  });
});
