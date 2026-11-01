import type { CdkDrag, CdkDragDrop } from '@angular/cdk/drag-drop';
import { signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { PERMISSIONS } from '@core/auth/permissions.token';
import { ToastService } from '@core/services/toast';
import { OFFLINE_MESSAGE } from '@shared/utils/connectivity';
import { Subject, of, throwError } from 'rxjs';
import type { Observable } from 'rxjs';

import type { CategoryNode } from '../models/category.model';
import { CategoriesService } from '../services/categories.service';

import { CategoryTree } from './category-tree';

const TREE: readonly CategoryNode[] = [
  {
    id: 'c-1',
    parentId: null,
    name: 'لوازم تحریر',
    slug: 'stationery',
    icon: 'pi pi-pen-to-square',
    order: 1,
    isActive: true,
    description: '',
    productCount: 12,
    children: [
      {
        id: 'c-1-1',
        parentId: 'c-1',
        name: 'دفتر و کاغذ',
        slug: 'paper',
        icon: 'pi pi-book',
        order: 1,
        isActive: true,
        description: '',
        productCount: 7,
        children: [],
      },
      {
        id: 'c-1-2',
        parentId: 'c-1',
        name: 'خودکار و روان‌نویس',
        slug: 'pens',
        icon: 'pi pi-pencil',
        order: 2,
        isActive: false,
        description: '',
        productCount: 0,
        children: [],
      },
    ],
  },
  {
    id: 'c-2',
    parentId: null,
    name: 'گوشی موبایل',
    slug: 'phones',
    icon: 'pi pi-mobile',
    order: 2,
    isActive: true,
    description: '',
    productCount: 3,
    isDefault: true,
    children: [],
  },
];

class CategoriesServiceStub {
  fail = false;

  calls = 0;

  placed: { id: string; parentId: string | null; order: number }[] = [];

  toggled: { id: string; isActive: boolean }[] = [];

  toggleError = false;

  /** Holds the answer open so a spec can see the optimistic state first. */
  toggleHold: Subject<CategoryNode> | null = null;

  tree(): Observable<readonly CategoryNode[]> {
    this.calls += 1;

    return this.fail ? throwError(() => new Error('offline')) : of(TREE);
  }

  place(id: string, parentId: string | null, order: number): Observable<CategoryNode> {
    this.placed.push({ id, parentId, order });

    return of(TREE[0]!);
  }

  setActive(id: string, isActive: boolean): Observable<CategoryNode> {
    this.toggled.push({ id, isActive });

    if (this.toggleError) {
      return throwError(() => new Error('offline'));
    }

    return this.toggleHold ? this.toggleHold.asObservable() : of({ ...TREE[0]!, id, isActive });
  }
}

class ToastStub {
  success = vi.fn();
  warning = vi.fn();
  error = vi.fn();
}

describe('CategoryTree (BO-G01/G02/G03)', () => {
  let fixture: ComponentFixture<CategoryTree>;
  let service: CategoriesServiceStub;
  let toast: ToastStub;
  let permissions: WritableSignal<readonly string[]>;

  beforeEach(async () => {
    service = new CategoriesServiceStub();
    toast = new ToastStub();
    permissions = signal<readonly string[]>(['products.view']);

    await TestBed.configureTestingModule({
      imports: [CategoryTree],
      providers: [
        { provide: CategoriesService, useValue: service },
        { provide: ToastService, useValue: toast },
        { provide: PERMISSIONS, useValue: permissions },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryTree);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => vi.restoreAllMocks());

  function component(): CategoryTree {
    return fixture.componentInstance;
  }

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('tc 1/2: renders the roots and the expansion children in one nested list', () => {
    const roots = fixture.nativeElement.querySelectorAll('[data-category-tree] > ul > li');

    expect(roots.length).toBe(2);
    expect(text()).toContain('لوازم تحریر');
    expect(text()).toContain('دفتر و کاغذ');
    expect(text()).toContain('گوشی موبایل');
  });

  it('tc 3/4/5: prints the product count, the status pill and the icon', () => {
    expect(text()).toContain('۱۲');
    expect(text()).toContain('فعال');
    expect(text()).toContain('غیرفعال');
    expect(fixture.nativeElement.querySelector('.pi-pen-to-square')).toBeTruthy();
  });

  it('tc 10: orders every level by `order`, whatever the API answered', async () => {
    service.tree = () => of([TREE[1]!, TREE[0]!]);
    const fresh = TestBed.createComponent(CategoryTree);
    await fresh.whenStable();
    fresh.detectChanges();

    const names = Array.from(
      fresh.nativeElement.querySelectorAll(
        '[data-category-tree] > ul > li',
      ) as NodeListOf<HTMLElement>,
    ).map((node) => node.textContent ?? '');

    expect(names[0]).toContain('لوازم تحریر');
    expect(names.at(-1)).toContain('گوشی موبایل');
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

  it('tc 8: a search that matches nothing explains itself instead of an empty list', async () => {
    component().search.set('ناموجود');
    await fixture.whenStable();
    fixture.detectChanges();

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

  it('BO-G02: editing a child passes the node and its own level as siblings', () => {
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

  it('BO-G03: a drop persists the target list and the 1-based slot', async () => {
    component().drop(dropEvent(TREE[1]!, 0), null);
    await fixture.whenStable();

    expect(service.placed).toEqual([{ id: 'c-2', parentId: null, order: 1 }]);
  });

  it('BO-G03: dropping into a children list sends that parent id', async () => {
    component().drop(dropEvent(TREE[1]!, 1), 'c-1');
    await fixture.whenStable();

    expect(service.placed).toEqual([{ id: 'c-2', parentId: 'c-1', order: 2 }]);
  });

  it('BO-G03: a parent with children cannot enter a children list (third level)', () => {
    const leaf = { data: TREE[1]! } as CdkDrag;
    const parent = { data: TREE[0]! } as CdkDrag;

    expect(component().leafOnly(leaf)).toBe(true);
    expect(component().leafOnly(parent)).toBe(false);
  });

  it('BO-G03: a branch can be collapsed and reopened', () => {
    const toggle = fixture.nativeElement.querySelector(
      '[data-category-tree] > ul > li button[aria-expanded]',
    ) as HTMLButtonElement;

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    toggle.click();
    fixture.detectChanges();

    expect(text()).not.toContain('دفتر و کاغذ');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });
  it('BO-G03: the icon, the name and the chevron are one toggle button', () => {
    const toggle = fixture.nativeElement.querySelector(
      '[data-category-tree] > ul > li > div > button[aria-expanded]',
    ) as HTMLButtonElement;

    expect(toggle.querySelector('i.pi-pen-to-square')).toBeTruthy();
    expect(toggle.textContent).toContain('لوازم تحریر');
    expect(toggle.querySelector('.pi-chevron-down')).toBeTruthy();

    toggle.click();
    fixture.detectChanges();

    expect(text()).not.toContain('دفتر و کاغذ');
  });

  it('BO-G03: the pencil does not toggle the branch it sits in', () => {
    const pencil = fixture.nativeElement.querySelector('[data-edit-category]') as HTMLButtonElement;

    pencil.click();
    fixture.detectChanges();

    expect(text()).toContain('دفتر و کاغذ');
  });

  it('BO-G03: every rendered drop list is connected to every other one', () => {
    // CDK shadows the drop-list group on a nested list, so the child lists are
    // wired by id. If a list is missing here, a drop into it silently does
    // nothing — the exact bug this list exists to prevent.
    expect(component().droppableLists()).toEqual([
      'category-roots',
      'category-root-zone',
      'category-children-c-1',
    ]);

    const rendered = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
        '[data-category-tree] .cdk-drop-list',
      ),
    ).map((list) => list.id);

    expect(rendered.sort()).toEqual([...component().droppableLists()].sort());

    // A collapsed branch renders no list, and an id that resolves to nothing
    // would leave `undefined` in CDK's sibling array.
    component().toggle(TREE[0]!);
    expect(component().droppableLists()).not.toContain('category-children-c-1');
  });

  it('BO-G03: the root zone appends a child back to the roots', async () => {
    component().dropToRoot(dropEvent(TREE[0]!.children[0]!, 0));
    await fixture.whenStable();

    // Appended after the two existing roots, not inserted at the top.
    expect(service.placed).toEqual([{ id: 'c-1-1', parentId: null, order: 3 }]);
  });

  it('BO-G04: the trash button opens the delete dialog for that row', () => {
    const trash = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-delete-category]',
    ) as HTMLButtonElement;

    trash.click();
    fixture.detectChanges();

    expect(component().deletingNode()).toMatchObject({ id: 'c-1' });
    // A root: its children would move to the top level, which has no name.
    expect(component().deleteParentName()).toBeNull();

    component().closeDelete();
    expect(component().deletingNode()).toBeNull();
  });

  it('BO-G04: deleting a child names the level its children would move to', () => {
    component().openDelete(TREE[0]!.children[0]!);

    expect(component().deleteParentName()).toBe('لوازم تحریر');
  });

  it('BO-G07 tc 1/2/8: flips the row before the answer, keeps it, and toasts', async () => {
    const hold = new Subject<CategoryNode>();
    service.toggleHold = hold;

    const toggle = fixture.nativeElement.querySelector(
      '[data-toggle-category="c-1"]',
    ) as HTMLButtonElement;

    expect(toggle.getAttribute('aria-label')).toBe('غیرفعال کردن دستهٔ لوازم تحریر');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');

    toggle.click();
    fixture.detectChanges();

    // The server has not answered yet; the tree already shows the new state.
    expect(component().tree()?.[0].isActive).toBe(false);
    expect(service.toggled).toEqual([{ id: 'c-1', isActive: false }]);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    hold.next({ ...TREE[0]!, isActive: false });
    hold.complete();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component().tree()?.[0].isActive).toBe(false);
    expect(toast.success).toHaveBeenCalledWith('دسته غیرفعال شد.');
  });

  it('BO-G07 tc 3/4: an API error reloads the tree (rollback) and leaves the toast to the interceptor', async () => {
    service.toggleError = true;
    const before = service.calls;

    (
      fixture.nativeElement.querySelector('[data-toggle-category="c-1"]') as HTMLButtonElement
    ).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(service.calls).toBe(before + 1);
    expect(component().tree()?.[0].isActive).toBe(true);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('BO-G07 tc 7: offline changes nothing and warns instead', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    (
      fixture.nativeElement.querySelector('[data-toggle-category="c-1"]') as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(component().tree()?.[0].isActive).toBe(true);
    expect(service.toggled).toEqual([]);
    expect(toast.warning).toHaveBeenCalledWith(OFFLINE_MESSAGE);
  });

  it('BO-G07: the default bucket has no status toggle and no delete button', () => {
    expect(fixture.nativeElement.querySelector('[data-toggle-category="c-1"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-toggle-category="c-2"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-delete-category="c-2"]')).toBeNull();
  });

  it('BO-G07 tc 9: without products.view the toggle and the other row actions are hidden', () => {
    permissions.set([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-toggle-category]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-edit-category]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-delete-category]')).toBeNull();

    component().toggleStatus(TREE[0]!);

    expect(service.toggled).toEqual([]);
  });
});

/** The three fields the drop handler reads, without a real CDK drag. */
function dropEvent(item: CategoryNode, currentIndex: number): CdkDragDrop<readonly CategoryNode[]> {
  return { item: { data: item }, currentIndex } as CdkDragDrop<readonly CategoryNode[]>;
}
