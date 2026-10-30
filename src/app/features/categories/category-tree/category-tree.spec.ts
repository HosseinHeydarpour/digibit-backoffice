import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import type { Observable } from 'rxjs';
import { of, throwError } from 'rxjs';

import type { CategoryNode } from '../models/category.model';
import { CategoriesService } from '../services/categories.service';

import { CategoryTree } from './category-tree';

const TREE: readonly CategoryNode[] = [
  {
    id: 'c-1',
    name: 'لوازم تحریر',
    slug: 'stationery',
    icon: 'pi pi-pen-to-square',
    order: 1,
    isActive: true,
    productCount: 12,
    children: [
      {
        id: 'c-1-1',
        name: 'دفتر و کاغذ',
        slug: 'paper',
        icon: 'pi pi-book',
        order: 1,
        isActive: true,
        productCount: 7,
        children: [],
      },
      {
        id: 'c-1-2',
        name: 'خودکار و روان‌نویس',
        slug: 'pens',
        icon: 'pi pi-pencil',
        order: 2,
        isActive: false,
        productCount: 0,
        children: [],
      },
    ],
  },
  {
    id: 'c-2',
    name: 'گوشی موبایل',
    slug: 'phones',
    icon: 'pi pi-mobile',
    order: 2,
    isActive: true,
    productCount: 3,
    children: [],
  },
];

class CategoriesServiceStub {
  fail = false;

  calls = 0;

  tree(): Observable<readonly CategoryNode[]> {
    this.calls += 1;

    return this.fail ? throwError(() => new Error('offline')) : of(TREE);
  }
}

describe('CategoryTree (BO-G01)', () => {
  let fixture: ComponentFixture<CategoryTree>;
  let service: CategoriesServiceStub;

  beforeEach(async () => {
    service = new CategoriesServiceStub();

    await TestBed.configureTestingModule({
      imports: [CategoryTree],
      providers: [{ provide: CategoriesService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryTree);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('tc 1/2/10: renders both levels, in the order the API sent them', async () => {
    const rows = fixture.nativeElement.querySelectorAll('[data-category-tree] p-treenode');

    // Two roots + two descendants (the second root has none).
    expect(rows.length).toBe(4);
    expect(text()).toContain('لوازم تحریر');
    expect(text()).toContain('دفتر و کاغذ');
    expect(text()).toContain('گوشی موبایل');

    const labels = Array.from(
      fixture.nativeElement.querySelectorAll(
        '[data-category-tree] p-treenode',
      ) as NodeListOf<HTMLElement>,
    ).map((node) => node.textContent?.trim() ?? '');
    expect(labels[0]).toContain('لوازم تحریر');
    expect(labels.at(-1)).toContain('گوشی موبایل');
  });

  it('tc 3/4/5: prints the product count, the status pill and the icon of every node', () => {
    expect(text()).toContain('۱۲');
    expect(text()).toContain('فعال');
    expect(text()).toContain('غیرفعال');
    expect(text()).toContain('stationery');
    expect(fixture.nativeElement.querySelector('.pi-pen-to-square')).toBeTruthy();
  });

  it('tc 6: a search filters the tree and keeps the matching branch', async () => {
    const input = fixture.nativeElement.querySelector('#category-search') as HTMLInputElement;
    input.value = 'گوشی';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(text()).toContain('گوشی موبایل');
    expect(text()).not.toContain('لوازم تحریر');
  });

  it('tc 8: a search that matches nothing explains itself instead of an empty tree', async () => {
    component().search.set('ناموجود');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-category-tree]')).toBeTruthy();
    expect(text()).toContain('دسته‌ای با این جستجو پیدا نشد');
  });

  it('tc 7: an empty catalogue shows the shared empty state', async () => {
    service.tree = () => of([]);
    const fresh = TestBed.createComponent(CategoryTree);
    await fresh.whenStable();
    fresh.detectChanges();

    expect((fresh.nativeElement as HTMLElement).textContent).toContain('هنوز دسته‌ای ساخته نشده');
  });

  it('tc 7: a failed fetch shows the retry block and recovers', async () => {
    service.fail = true;
    const failed = TestBed.createComponent(CategoryTree);
    await failed.whenStable();
    failed.detectChanges();

    expect((failed.nativeElement as HTMLElement).textContent).toContain(
      'دریافت دسته‌بندی‌ها ناموفق بود',
    );

    service.fail = false;
    (failed.nativeElement.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    await failed.whenStable();
    failed.detectChanges();

    expect((failed.nativeElement as HTMLElement).textContent).toContain('لوازم تحریر');
  });

  function component(): CategoryTree {
    return fixture.componentInstance;
  }
});
