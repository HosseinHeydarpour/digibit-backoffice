// src/app/features/brands/brand-form/brand-form.ts
//
// The create/edit brand form (BO-G05), rendered inside the page's dialog.
//
// Same split as `CategoryForm`: this component owns no overlay, so a story and a
// spec can mount it without animation providers, and the page decides when it is
// on screen.
//
// TRACE — «سامسونگ» is typed into a new brand:
//
//   1. `name.valueChanges` → `slugEdited` is false → `slugify('سامسونگ')` writes
//      `samsung` into the slug control (tc 4).
//   2. A manual slug edit sets `slugEdited`, and the name no longer rewrites it.
//   3. «ذخیره» → `save()`: local rules first (required, slug pattern), then POST.
//   4. A 422 with `fields` (a name or slug another brand owns, tc 5) lands under
//      that field and the dialog stays open with the typed values.
//   5. Success emits `saved`; the page closes the dialog and refetches the list.

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
import type { ValidatorFn } from '@angular/forms';
import { LoadingDirective } from '@shared/directives/loading.directive';
import { ApiError } from '@shared/models';
import { slugify } from '@shared/utils/slugify';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { take } from 'rxjs';

import type { Brand, BrandInput } from '../models/brand.model';
import { BrandsService } from '../services/brands.service';

/** The same ASCII/hyphen rule the categories use, because a slug is a URL. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const requiredName: ValidatorFn = (control) =>
  String(control.value ?? '').trim() === '' ? { required: true } : null;

const slugRule: ValidatorFn = (control) => {
  const value = String(control.value ?? '').trim();

  if (value === '') {
    return { required: true };
  }

  return SLUG_PATTERN.test(value) ? null : { pattern: true };
};

@Component({
  selector: 'app-brand-form',
  imports: [InputText, LoadingDirective, ReactiveFormsModule, Textarea, ToggleSwitch],
  templateUrl: './brand-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandForm {
  private readonly brands = inject(BrandsService);
  private readonly fb = inject(FormBuilder);

  /** The brand being edited, or `null` for a new one. */
  readonly brand = input<Brand | null>(null);

  readonly saved = output<Brand>();
  readonly cancelled = output<void>();

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  /** Server field messages, kept outside the controls so a re-render keeps them. */
  private readonly serverErrors = signal<Readonly<Record<string, string>>>({});

  readonly form = this.fb.nonNullable.group({
    name: ['', requiredName],
    slug: ['', slugRule],
    logo: [''],
    isActive: [true],
    description: [''],
  });

  readonly isEdit = computed(() => this.brand() !== null);

  /** Live preview of whatever URL is typed; empty means the initial fallback. */
  readonly logoPreview = signal('');

  private slugEdited = false;

  constructor() {
    effect(() => {
      const brand = this.brand();
      this.slugEdited = brand !== null;
      this.form.reset({
        name: brand?.name ?? '',
        slug: brand?.slug ?? '',
        logo: brand?.logo ?? '',
        isActive: brand?.isActive ?? true,
        description: brand?.description ?? '',
      });
      this.logoPreview.set(brand?.logo ?? '');
      this.serverErrors.set({});
      this.saveError.set(null);
    });

    this.form.controls.name.valueChanges.subscribe((name) => {
      if (!this.slugEdited) {
        this.form.controls.slug.setValue(slugify(name));
      }
    });

    this.form.controls.logo.valueChanges.subscribe((logo) => this.logoPreview.set(logo.trim()));
  }

  /** A manual slug edit wins over the generated one (tc 4). */
  onSlugInput(): void {
    this.slugEdited = true;
  }

  /** First visible message for a field: server copy first, then the local rule. */
  errorFor(field: 'name' | 'slug'): string | null {
    const server = this.serverErrors()[field];

    if (server) {
      return server;
    }

    const control = this.form.controls[field];

    if (!control.touched || !control.errors) {
      return null;
    }

    if (control.errors['required']) {
      return field === 'name' ? 'نام برند الزامی است.' : 'نامک (slug) الزامی است.';
    }

    return 'فقط حروف انگلیسی، عدد و خط تیره مجاز است.';
  }

  /** Validate → POST/PUT (tc 2/3/5). A server 422 stays on the field. */
  save(): void {
    if (this.saving()) {
      return;
    }

    this.form.markAllAsTouched();
    this.serverErrors.set({});
    this.saveError.set(null);

    if (this.form.invalid) {
      return;
    }

    const value = this.form.getRawValue();
    const dto: BrandInput = {
      name: value.name.trim(),
      slug: value.slug.trim(),
      logo: value.logo.trim() === '' ? null : value.logo.trim(),
      isActive: value.isActive,
      description: value.description.trim(),
    };

    this.saving.set(true);

    const editing = this.brand();
    const request = editing ? this.brands.update(editing.id, dto) : this.brands.create(dto);

    request.pipe(take(1)).subscribe({
      next: (brand) => {
        this.saving.set(false);
        this.saved.emit(brand);
      },
      error: (error: unknown) => {
        this.saving.set(false);

        if (error instanceof ApiError && error.isValidation) {
          this.applyServerErrors(error.fields);
          this.saveError.set(error.message);
          return;
        }

        this.saveError.set('ذخیرهٔ برند ناموفق بود. دوباره تلاش کنید.');
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
