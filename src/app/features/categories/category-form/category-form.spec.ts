import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { ApiError } from '@shared/models';
import type { Observable } from 'rxjs';
import { of, throwError } from 'rxjs';

import type { CategoryInput, CategoryNode } from '../models/category.model';
import { CategoriesService } from '../services/categories.service';

import { CategoryForm } from './category-form';

const ROOT: CategoryNode = {
  id: 'c-1',
  parentId: null,
  name: 'لوازم تحریر',
  slug: 'stationery',
  icon: 'pi pi-pen-to-square',
  order: 1,
  isActive: true,
  description: 'دفتر و نوشت‌افزار',
  productCount: 12,
  children: [],
};

const SIBLING: CategoryNode = {
  ...ROOT,
  id: 'c-2',
  name: 'حافظه و ذخیره‌سازی',
  slug: 'storage',
  order: 2,
};

class CategoriesServiceStub {
  created: CategoryInput[] = [];

  updated: { id: string; dto: CategoryInput }[] = [];

  failWith: unknown = null;

  create(dto: CategoryInput): Observable<CategoryNode> {
    this.created.push(dto);

    return this.failWith ? throwError(() => this.failWith) : of({ ...ROOT, ...dto, id: 'c-new' });
  }

  update(id: string, dto: CategoryInput): Observable<CategoryNode> {
    this.updated.push({ id, dto });

    return this.failWith ? throwError(() => this.failWith) : of({ ...ROOT, ...dto });
  }
}

describe('CategoryForm (BO-G02)', () => {
  let fixture: ComponentFixture<CategoryForm>;
  let service: CategoriesServiceStub;

  beforeEach(async () => {
    service = new CategoriesServiceStub();

    await TestBed.configureTestingModule({
      imports: [CategoryForm],
      providers: [{ provide: CategoriesService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryForm);
    fixture.componentRef.setInput('siblings', [ROOT, SIBLING]);
    fixture.detectChanges();
  });

  function component(): CategoryForm {
    return fixture.componentInstance;
  }

  function name(value: string): void {
    component().form.controls.name.setValue(value);
    fixture.detectChanges();
  }

  it('tc 3: builds the slug from the name until it is edited by hand', () => {
    name('لوازم تحریر');
    expect(component().form.controls.slug.value).toBe('accessories-stationery');

    component().form.controls.slug.setValue('my-custom-slug');
    component().onSlugInput();
    name('حافظه');
    expect(component().form.controls.slug.value).toBe('my-custom-slug');
  });

  it('tc 1/6: creating posts the trimmed fields and reports the saved node', () => {
    const saved: CategoryNode[] = [];
    component().saved.subscribe((node) => saved.push(node));

    name('  لوازم اداری  ');
    component().form.patchValue({ slug: 'office', icon: 'pi pi-book', order: 3, isActive: false });
    component().save();
    fixture.detectChanges();

    expect(service.created).toHaveLength(1);
    expect(service.created[0]).toMatchObject({
      name: 'لوازم اداری',
      slug: 'office',
      icon: 'pi pi-book',
      order: 3,
      isActive: false,
      parentId: null,
    });
    expect(saved).toHaveLength(1);
  });

  it('tc 4: a duplicate name at the same level blocks the request', () => {
    name('لوازم تحریر');
    component().form.controls.slug.setValue('stationery-2');
    component().save();
    fixture.detectChanges();

    expect(service.created).toHaveLength(0);
    expect(component().errorFor('name')).toContain('همین سطح');
  });

  it('tc 4: the same name is fine on another level (the sibling list is scoped)', () => {
    // The page passes only the nodes at the edited node's level, so an empty
    // list here means «no conflict» even though the name exists elsewhere.
    fixture.componentRef.setInput('siblings', []);
    name('لوازم تحریر');
    component().form.controls.slug.setValue('stationery-2');
    component().save();

    expect(service.created).toHaveLength(1);
  });

  it('tc 5: a server slug error lands under the slug field and keeps the dialog', () => {
    service.failWith = new ApiError('VALIDATION', 'اطلاعات دسته معتبر نیست.', 422, {
      slug: ['این نامک قبلاً استفاده شده است.'],
    });

    name('دستهٔ تازه');
    component().save();
    fixture.detectChanges();

    expect(component().errorFor('slug')).toBe('این نامک قبلاً استفاده شده است.');
    expect(component().saving()).toBe(false);
    expect(component().saveError()).toBe('اطلاعات دسته معتبر نیست.');
  });

  it('tc 2: editing prefills the form and PUTs the same id', () => {
    fixture.componentRef.setInput('category', ROOT);
    fixture.detectChanges();

    expect(component().form.getRawValue()).toMatchObject({
      name: 'لوازم تحریر',
      slug: 'stationery',
      icon: 'pi pi-pen-to-square',
      order: 1,
      description: 'دفتر و نوشت‌افزار',
    });
    expect(component().isEdit()).toBe(true);

    component().form.controls.name.setValue('لوازم تحریر و اداری');
    component().save();

    expect(service.updated).toHaveLength(1);
    expect(service.updated[0].id).toBe('c-1');
    expect(service.updated[0].dto.name).toBe('لوازم تحریر و اداری');
  });

  it('tc 8: cancel reports upward without saving', () => {
    let cancelled = 0;
    component().cancelled.subscribe(() => (cancelled += 1));

    name('بدون ذخیره');
    component().cancel();

    expect(cancelled).toBe(1);
    expect(service.created).toHaveLength(0);
    expect(service.updated).toHaveLength(0);
  });

  it('tc 9: the form is a single column that fits a dialog on a phone', () => {
    const grid = fixture.nativeElement.querySelector('form > div') as HTMLElement;
    expect(grid.className).toContain('grid-cols-1');
    expect(grid.className).toContain('sm:grid-cols-2');
  });
  it('BO-G03: a new category starts at the next free position, not at 1', () => {
    fixture.componentRef.setInput('defaultOrder', 9);
    fixture.detectChanges();

    expect(component().form.controls.order.value).toBe(9);
  });
});
