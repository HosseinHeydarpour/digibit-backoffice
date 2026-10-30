import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { LoadingDirective } from '@shared/directives/loading.directive';
import { ApiError } from '@shared/models';
import { slugify } from '@shared/utils/slugify';
import { PrimeTemplate } from 'primeng/api';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { take } from 'rxjs';

import type { CategoryInput, CategoryNode } from '../models/category.model';
import { CategoriesService } from '../services/categories.service';

import {
  categoryNameValidator,
  categoryOrderValidator,
  categorySlugValidator,
  isDuplicateName,
} from './category-validators';

/** The PrimeIcons the picker offers; the value is the class the row stores. */
const ICON_OPTIONS = [
  { label: 'پوشه', value: 'pi pi-folder' },
  { label: 'تحریر', value: 'pi pi-pen-to-square' },
  { label: 'کتاب', value: 'pi pi-book' },
  { label: 'مداد', value: 'pi pi-pencil' },
  { label: 'حافظه', value: 'pi pi-database' },
  { label: 'کابل', value: 'pi pi-link' },
  { label: 'موبایل', value: 'pi pi-mobile' },
  { label: 'کامپیوتر', value: 'pi pi-desktop' },
  { label: 'باتری', value: 'pi pi-bolt' },
  { label: 'روشنایی', value: 'pi pi-lightbulb' },
  { label: 'قاب', value: 'pi pi-shield' },
  { label: 'بدون دسته', value: 'pi pi-inbox' },
];

/**
 * The create/edit category form (BO-G02), rendered inside the page's dialog.
 *
 * WHY THE FORM IS NOT THE DIALOG
 * ------------------------------
 * A component that owns `p-dialog` cannot be mounted in a story or a spec without
 * animation/overlay providers, and the page already has one dialog for both
 * modes. This component is the form only: the page decides when it is on screen.
 *
 * TRACE — «آزمایشی» with no slug typed:
 *
 *   1. `name.valueChanges` → `slugEdited` is false → `slugify('آزمایشی')` writes
 *      `azmayeshi` into the slug control.
 *   2. The user edits the slug by hand → `slugEdited` = true; the name no longer
 *      rewrites it.
 *   3. «ذخیره» → `save()`: local validators first, then the duplicate-name check
 *      against the SIBLINGS (same parent, excluding this node).
 *   4. Create posts, edit puts; a 422 with `fields` lands under the field it names
 *      (tc 5) and the dialog stays open with the typed values.
 *   5. The page closes the dialog and refetches the tree, so the new row (and its
 *      icon) appears without a manual reload (tc 7/10).
 */
@Component({
  selector: 'app-category-form',
  imports: [
    InputText,
    LoadingDirective,
    PrimeTemplate,
    ReactiveFormsModule,
    Select,
    Textarea,
    ToggleSwitch,
  ],
  templateUrl: './category-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryForm {
  private readonly categories = inject(CategoriesService);
  private readonly fb = inject(FormBuilder);

  /** The node being edited, or `null` for a new root category. */
  readonly category = input<CategoryNode | null>(null);

  /** The nodes at the same level; the duplicate-name rule compares against these. */
  readonly siblings = input<readonly CategoryNode[]>([]);

  /** The position a new category takes: one past the last sibling (BO-G03). */
  readonly defaultOrder = input<number>(1);

  readonly saved = output<CategoryNode>();
  readonly cancelled = output<void>();

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly duplicateName = signal(false);

  /** Server field messages, kept outside the controls so they survive a re-render. */
  private readonly serverErrors = signal<Readonly<Record<string, string>>>({});

  readonly form = this.fb.nonNullable.group({
    name: ['', categoryNameValidator],
    slug: ['', categorySlugValidator],
    icon: ['pi pi-folder'],
    order: [1, categoryOrderValidator],
    isActive: [true],
    description: [''],
  });

  readonly iconOptions = ICON_OPTIONS;

  readonly isEdit = computed(() => this.category() !== null);

  private slugEdited = false;

  constructor() {
    /**
     * Hydrate on open, reset on create: the page mounts one form instance and
     * flips `category` between rows, so the effect is the single entry point.
     */
    effect(() => {
      const category = this.category();
      this.slugEdited = category !== null;
      this.form.reset({
        name: category?.name ?? '',
        slug: category?.slug ?? '',
        icon: category?.icon ?? 'pi pi-folder',
        order: category?.order ?? this.defaultOrder(),
        isActive: category?.isActive ?? true,
        description: category?.description ?? '',
      });
      this.serverErrors.set({});
      this.duplicateName.set(false);
      this.saveError.set(null);
    });

    this.form.controls.name.valueChanges.subscribe((name) => {
      if (!this.slugEdited) {
        this.form.controls.slug.setValue(slugify(name));
      }
    });
  }

  /** A manual slug edit wins over the generated one (tc 3). */
  onSlugInput(): void {
    this.slugEdited = true;
  }

  /** First visible message for a field: server copy first, then the local rule. */
  errorFor(field: 'name' | 'slug' | 'order'): string | null {
    if (field === 'name' && this.duplicateName()) {
      return 'دسته‌ای با این نام در همین سطح وجود دارد.';
    }

    const server = this.serverErrors()[field];

    if (server) {
      return server;
    }

    const control = this.form.controls[field];

    if (!control.touched || !control.errors) {
      return null;
    }

    if (control.errors['required']) {
      return field === 'name' ? 'نام دسته الزامی است.' : 'نامک (slug) الزامی است.';
    }

    if (control.errors['pattern']) {
      return 'فقط حروف انگلیسی، عدد و خط تیره مجاز است.';
    }

    if (control.errors['number'] || control.errors['negative']) {
      return 'یک عدد صحیح نامنفی وارد کنید.';
    }

    if (control.errors['maxlength']) {
      return `حداکثر ${control.errors['maxlength'].requiredLength} کاراکتر مجاز است.`;
    }

    return 'مقدار واردشده معتبر نیست.';
  }

  /**
   * Validate → duplicate check → POST/PUT (tc 1/2/4/5/6).
   *
   * A validation failure marks controls and stops; a server 422 keeps the dialog
   * open with its fields mapped; a 201/200 reports the saved node upward.
   */
  save(): void {
    if (this.saving()) {
      return;
    }

    this.form.markAllAsTouched();
    this.serverErrors.set({});
    this.saveError.set(null);
    this.duplicateName.set(false);

    if (this.form.invalid) {
      return;
    }

    const value = this.form.getRawValue();
    const editing = this.category();

    if (isDuplicateName(this.siblings(), value.name, editing?.id)) {
      this.duplicateName.set(true);
      return;
    }

    const dto: CategoryInput = {
      name: value.name.trim(),
      slug: value.slug.trim(),
      icon: value.icon,
      order: value.order,
      isActive: value.isActive,
      description: value.description.trim(),
      parentId: editing?.parentId ?? null,
    };

    this.saving.set(true);

    const request = editing
      ? this.categories.update(String(editing.id), dto)
      : this.categories.create(dto);

    request.pipe(take(1)).subscribe({
      next: (node) => {
        this.saving.set(false);
        this.saved.emit(node);
      },
      error: (error: unknown) => {
        this.saving.set(false);

        if (error instanceof ApiError && error.isValidation) {
          this.applyServerErrors(error.fields);
          this.saveError.set(error.message);
          return;
        }

        this.saveError.set('ذخیرهٔ دسته ناموفق بود. دوباره تلاش کنید.');
      },
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }

  private applyServerErrors(fields: Readonly<Record<string, readonly string[]>> | undefined): void {
    if (!fields) {
      return;
    }

    const messages: Record<string, string> = {};

    for (const [name, list] of Object.entries(fields)) {
      const message = list[0];

      if (!message) {
        continue;
      }

      messages[name] = message;
      this.form.get(name)?.markAsTouched();
    }

    this.serverErrors.set(messages);
  }
}
