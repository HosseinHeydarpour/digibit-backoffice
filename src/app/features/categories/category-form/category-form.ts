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
  { label: 'پوشهٔ باز', value: 'pi pi-folder-open' },
  { label: 'نقشهٔ سایت', value: 'pi pi-sitemap' },
  { label: 'جعبه', value: 'pi pi-box' },
  { label: 'تحریر', value: 'pi pi-pen-to-square' },
  { label: 'کتاب', value: 'pi pi-book' },
  { label: 'کاغذ و پرونده', value: 'pi pi-file' },
  { label: 'پیوست', value: 'pi pi-paperclip' },
  { label: 'حافظه', value: 'pi pi-database' },
  { label: 'سرور', value: 'pi pi-server' },
  { label: 'کابل', value: 'pi pi-link' },
  { label: 'وای‌فای', value: 'pi pi-wifi' },
  { label: 'موبایل', value: 'pi pi-mobile' },
  { label: 'تبلت', value: 'pi pi-tablet' },
  { label: 'کامپیوتر', value: 'pi pi-desktop' },
  { label: 'هدفون', value: 'pi pi-headphones' },
  { label: 'میکروفون', value: 'pi pi-microphone' },
  { label: 'صدا', value: 'pi pi-volume-up' },
  { label: 'صدای کم', value: 'pi pi-volume-down' },
  { label: 'دوربین', value: 'pi pi-camera' },
  { label: 'ویدئو', value: 'pi pi-video' },
  { label: 'پخش', value: 'pi pi-play-circle' },
  { label: 'تصویر', value: 'pi pi-image' },
  { label: 'پالت رنگ', value: 'pi pi-palette' },
  { label: 'چاپگر', value: 'pi pi-print' },
  { label: 'باتری', value: 'pi pi-bolt' },
  { label: 'روشنایی', value: 'pi pi-lightbulb' },
  { label: 'قاب و محافظ', value: 'pi pi-shield' },
  { label: 'ابزار', value: 'pi pi-wrench' },
  { label: 'تنظیمات', value: 'pi pi-cog' },
  { label: 'اسلایدر', value: 'pi pi-sliders-h' },
  { label: 'فیلتر', value: 'pi pi-filter' },
  { label: 'کیف اداری', value: 'pi pi-briefcase' },
  { label: 'برچسب', value: 'pi pi-tag' },
  { label: 'ستاره', value: 'pi pi-star' },
  { label: 'هدیه', value: 'pi pi-gift' },
  { label: 'تخفیف و بلیت', value: 'pi pi-ticket' },
  { label: 'کارت بانکی', value: 'pi pi-credit-card' },
  { label: 'کیف پول', value: 'pi pi-wallet' },
  { label: 'سبد خرید', value: 'pi pi-shopping-cart' },
  { label: 'ارسال', value: 'pi pi-truck' },
  { label: 'ساختمان', value: 'pi pi-building' },
  { label: 'خانه', value: 'pi pi-home' },
  { label: 'نمودار', value: 'pi pi-chart-bar' },
  { label: 'نمودار خطی', value: 'pi pi-chart-line' },
  { label: 'ساعت', value: 'pi pi-clock' },
  { label: 'تقویم', value: 'pi pi-calendar' },
  { label: 'ماشین‌حساب', value: 'pi pi-calculator' },
  { label: 'کاربر', value: 'pi pi-user' },
  { label: 'کاربران', value: 'pi pi-users' },
  { label: 'نظر', value: 'pi pi-comments' },
  { label: 'ایمیل', value: 'pi pi-envelope' },
  { label: 'تلفن', value: 'pi pi-phone' },
  { label: 'مکان', value: 'pi pi-map-marker' },
  { label: 'خودرو', value: 'pi pi-car' },
  { label: 'جهان', value: 'pi pi-globe' },
  { label: 'قلب', value: 'pi pi-heart' },
  { label: 'پسند', value: 'pi pi-thumbs-up' },
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

  /**
   * The roots the form may pick as a parent (BO-G03 tc 1).
   *
   * Only roots: the tree is two levels, so a child can never be a parent. The node
   * being edited is filtered out too, and one that HAS children cannot move at all
   * (the select is read-only with a hint) because that would create a third level.
   */
  readonly parents = input<readonly CategoryNode[]>([]);

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
    // '' is the «no parent» sentinel: PrimeNG's select shows a null option as the
    // placeholder, so the roots entry needs a real value to be selectable.
    parentId: [''],
  });

  readonly iconOptions = ICON_OPTIONS;

  readonly isEdit = computed(() => this.category() !== null);

  /** A node with children cannot become somebody's child (third level). */
  readonly hasChildren = computed(() => (this.category()?.children.length ?? 0) > 0);

  /** «بدون والد» plus every root except the node being edited. */
  readonly parentOptions = computed(() => [
    { label: '— بدون والد (دستهٔ اصلی) —', value: '' },
    ...this.parents()
      .filter((node) => node.id !== this.category()?.id)
      .map((node) => ({ label: node.name, value: String(node.id) })),
  ]);

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
        parentId:
          category?.parentId === null || category?.parentId === undefined
            ? ''
            : String(category.parentId),
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
      parentId: value.parentId === '' ? null : value.parentId,
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
