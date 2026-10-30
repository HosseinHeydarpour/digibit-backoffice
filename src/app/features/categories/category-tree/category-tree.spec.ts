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
    parentId: null,
    description: '',
    name: 'لوازم تحریر',
    slug: 'stationery',
    icon: 'pi pi-pen-to-square',
    order: 1,
    isActive: true,
    productCount: 12,
    children: [
      {
        id: 'c-1-1',
        parentId: 'c-1',
        description: '',
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
        parentId: 'c-1',
        description: '',
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
    parentId: null,
    description: '',
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

  moves: { id: string; parentId: string | null }[] = [];

  move(id: string, parentId: string | null): Observable<CategoryNode> {
    this.moves.push({ id, parentId });

    return of(TREE[0]!);
  }

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

    expect(fixture.nativeElement.querySelector('[data-category-tree]')).toBeNull();
    expect(text()).toContain('دسته‌ای با این جستجو پیدا نشد');
    // PrimeNG prints its own English empty line inside an empty tree; the tree
    // is not mounted at all so that message cannot appear under ours.
    expect(text()).not.toContain('No results found');
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
  it('sorts every level by `order`, whatever order the API answered in', async () => {
    service.tree = () =>
      of([
        { ...TREE[1]!, order: 2 }, // گوشی موبایل
        { ...TREE[0]!, order: 1 }, // لوازم تحریر
      ]);

    const fresh = TestBed.createComponent(CategoryTree);
    await fresh.whenStable();
    fresh.detectChanges();

    const labels = Array.from(
      fresh.nativeElement.querySelectorAll(
        '[data-category-tree] p-treenode',
      ) as NodeListOf<HTMLElement>,
    ).map((node) => node.textContent?.trim() ?? '');

    expect(labels[0]).toContain('لوازم تحریر');
    expect(labels[0]).toContain('دفتر و کاغذ'); // its children follow it
    expect(labels.at(-1)).toContain('گوشی موبایل');
  });

  it('Enter on a focused row toggles the branch (keyboard)', async () => {
    const firstRow = fixture.nativeElement.querySelector(
      '[data-category-tree] p-treenode [role="button"]',
    ) as HTMLElement;
    expect(firstRow.getAttribute('tabindex')).toBe('0');

    const before = fixture.nativeElement.querySelectorAll('p-treenode').length;
    firstRow.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();

    const after = fixture.nativeElement.querySelectorAll('p-treenode').length;
    expect(after).toBeLessThan(before);
  });
  it('BO-G02: the header button opens a create dialog with the roots as siblings', () => {
    component().openCreate();
    fixture.detectChanges();

    expect(component().dialogOpen()).toBe(true);
    expect(component().editing()).toBeNull();
    expect(
      component()
        .siblings()
        .map((node) => node.id),
    ).toEqual(['c-1', 'c-2']);
  });

  it('BO-G02: editing a child passes the node and its own level as siblings', async () => {
    component().openEdit(TREE[0]!.children[0]!);
    fixture.detectChanges();

    expect(component().editing()?.id).toBe('c-1-1');
    expect(
      component()
        .siblings()
        .map((node) => node.id),
    ).toEqual(['c-1-1', 'c-1-2']);
  });

  it('BO-G02 tc 7: a save closes the dialog and refetches the tree', async () => {
    const before = service.calls;
    component().openCreate();
    component().onSaved();
    await fixture.whenStable();

    expect(component().dialogOpen()).toBe(false);
    expect(service.calls).toBe(before + 1);
  });
  it('BO-G03: a drop onto a root moves the node under it and reloads', async () => {
    component().dragging.set(TREE[1]!); // «گوشی موبایل», a root with no children
    component().onPointerUpOn(TREE[0]!, new Event('pointerup') as PointerEvent);
    await fixture.whenStable();

    expect(service.moves).toEqual([{ id: 'c-2', parentId: 'c-1' }]);
    expect(component().dragging()).toBeNull();
  });

  it('BO-G03: dropping on the root strip makes the row a top-level category', async () => {
    component().dragging.set(TREE[0]!.children[0]!); // «دفتر و کاغذ»
    component().onDropToRoot();
    await fixture.whenStable();

    expect(service.moves).toEqual([{ id: 'c-1-1', parentId: null }]);
  });

  it('BO-G03: a node with children cannot be nested, and a child cannot accept a drop', () => {
    // «لوازم تحریر» has children → moving it under another root would be 3 levels.
    component().dragging.set(TREE[0]!);
    expect(component().canDropOn(TREE[1]!)).toBe(false);

    // A child target cannot take children at all.
    component().dragging.set(TREE[1]!);
    expect(component().canDropOn(TREE[0]!.children[0]!)).toBe(false);
  });
});
