// src/app/features/brands/brand-form/brand-form.ts
//
// The create/edit brand form (BO-G05 + logo upload BO-G06), rendered inside the
// page's dialog.
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
//
// TRACE — a PNG is picked for the same brand (BO-G06):
//
//   1. `onLogoSelected` validates it against `brand-logo.ts`; nothing is sent.
//      A `blob:` URL previews it, and `logoFile` holds the bytes in memory.
//   2. «ذخیره» → `save()` uploads first: `POST /media` → URL.
//   3. The URL goes into the `logo` control, the local blob is revoked, and the
//      brand POST/PUT carries `logo: <url>`.
//   4. A failed upload stops before the brand request and shows the sentence
//      under the logo. A failed brand save keeps the server URL, so «تلاش
//      دوباره» does not upload the same file twice.
//   5. «انصراف» revokes the blob and sends nothing; the server owns no orphan.
//   6. Closing the dialog destroys the form, and `takeUntilDestroyed` drops the
//      upload chain — no brand request starts after the dialog is gone.

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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

import { LOGO_ACCEPT, LOGO_HINT, logoAlt, logoErrorMessage, validateLogoFile } from './brand-logo';

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
  private readonly destroyRef = inject(DestroyRef);

  /** The brand being edited, or `null` for a new one. */
  readonly brand = input<Brand | null>(null);

  readonly saved = output<Brand>();
  readonly cancelled = output<void>();

  /** Drives the dialog's close controls: a transaction in flight cannot be dismissed. */
  readonly savingChange = output<boolean>();

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  /** Server field messages, kept outside the controls so a re-render keeps them. */
  private readonly serverErrors = signal<Readonly<Record<string, string>>>({});

  readonly form = this.fb.nonNullable.group({
    name: ['', requiredName],
    slug: ['', slugRule],
    // The URL the server owns; a local file never reaches this control.
    logo: [''],
    isActive: [true],
    description: [''],
  });

  readonly isEdit = computed(() => this.brand() !== null);

  /** A server URL or the `blob:` preview of `logoFile`; empty means the initial. */
  readonly logoPreview = signal('');

  /** The file picked this session; uploaded only when «ذخیره» is pressed. */
  readonly logoFile = signal<File | null>(null);

  readonly logoError = signal<string | null>(null);

  /**
   * The `blob:` URL this form created. Kept apart from `logoPreview` because
   * the mock's server URL is also a `blob:` — revoking that would break the row
   * in the list after a successful save.
   */
  private localPreviewUrl: string | null = null;

  private slugEdited = false;

  constructor() {
    effect(() => {
      const brand = this.brand();
      this.slugEdited = brand !== null;
      this.revokeLocalPreview();
      this.form.reset({
        name: brand?.name ?? '',
        slug: brand?.slug ?? '',
        logo: brand?.logo ?? '',
        isActive: brand?.isActive ?? true,
        description: brand?.description ?? '',
      });
      this.logoFile.set(null);
      this.logoPreview.set(brand?.logo ?? '');
      this.logoError.set(null);
      this.serverErrors.set({});
      this.saveError.set(null);
    });

    this.form.controls.name.valueChanges.subscribe((name) => {
      if (!this.slugEdited) {
        this.form.controls.slug.setValue(slugify(name));
      }
    });

    this.destroyRef.onDestroy(() => this.revokeLocalPreview());
  }

  /** A getter, not a field: the constants live in the eager spec graph too. */
  get logoAccept(): string {
    return LOGO_ACCEPT;
  }

  get logoHint(): string {
    return LOGO_HINT;
  }

  /** A manual slug edit wins over the generated one (tc 4). */
  onSlugInput(): void {
    this.slugEdited = true;
  }

  /** The image's alt tracks the name as it is typed (tc 10). */
  logoAltFor(): string {
    return logoAlt(this.form.controls.name.value);
  }

  /**
   * Choose a logo. This is the only file gate: a rejected file never gets a
   * preview and never reaches `POST /media` (tc 4/5).
   */
  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    // Reset so picking the SAME file again fires `change` once more.
    input.value = '';

    if (!file) {
      return;
    }

    const error = validateLogoFile(file);

    if (error !== null) {
      this.logoError.set(logoErrorMessage(file, error));
      return;
    }

    // Replacing the preview frees the previous local URL before it is dropped.
    this.revokeLocalPreview();
    const preview = URL.createObjectURL(file);
    this.localPreviewUrl = preview;
    this.logoFile.set(file);
    this.logoPreview.set(preview);
    this.logoError.set(null);
  }

  /**
   * Remove the logo. Before saving this is a local change only — no request,
   * no confirm: «ذخیره» is what sends `logo: null` (tc 3).
   */
  removeLogo(): void {
    this.revokeLocalPreview();
    this.logoFile.set(null);
    this.logoPreview.set('');
    this.logoError.set(null);
    this.form.controls.logo.setValue('');
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

  /**
   * Validate → upload (only when a file is waiting) → POST/PUT (tc 1/2/3/5/8).
   *
   * TRACE — a fresh PNG and a valid form:
   *
   *   1. `uploadLogo(file)` posts the bytes and answers with the server URL.
   *   2. The URL replaces the local preview, the blob is revoked, and the
   *      `logo` control holds the URL — never the `blob:` the browser made.
   *   3. `saveBrand(url)` builds the same `BrandInput` BO-G05 sent and calls
   *      create/update; a 422 still lands under its field.
   *
   * An upload failure returns before `saveBrand`, so the brand is untouched;
   * a brand failure after a successful upload leaves the URL in the control,
   * and a retry uploads nothing.
   */
  save(): void {
    if (this.saving()) {
      return;
    }

    this.form.markAllAsTouched();
    this.serverErrors.set({});
    this.saveError.set(null);
    this.logoError.set(null);

    if (this.form.invalid) {
      return;
    }

    this.setSaving(true);

    const file = this.logoFile();

    if (!file) {
      this.saveBrand(this.form.controls.logo.value);
      return;
    }

    this.brands
      .uploadLogo(file)
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (url) => {
          this.form.controls.logo.setValue(url);
          this.logoPreview.set(url);
          this.logoFile.set(null);
          this.revokeLocalPreview();
          this.saveBrand(url);
        },
        error: (error: unknown) => {
          this.setSaving(false);
          this.logoError.set(this.logoUploadMessage(error));
        },
      });
  }

  cancel(): void {
    // The button is disabled while saving; this guard keeps a programmatic
    // caller from cutting a transaction the dialog has already locked.
    if (this.saving()) {
      return;
    }

    this.revokeLocalPreview();
    this.cancelled.emit();
  }

  private saveBrand(logo: string): void {
    const value = this.form.getRawValue();
    const trimmedLogo = logo.trim();
    const dto: BrandInput = {
      name: value.name.trim(),
      slug: value.slug.trim(),
      logo: trimmedLogo === '' ? null : trimmedLogo,
      isActive: value.isActive,
      description: value.description.trim(),
    };

    const editing = this.brand();
    const request = editing ? this.brands.update(editing.id, dto) : this.brands.create(dto);

    request.pipe(take(1), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (brand) => {
        this.setSaving(false);
        this.saved.emit(brand);
      },
      error: (error: unknown) => {
        this.setSaving(false);

        if (error instanceof ApiError && error.isValidation) {
          this.applyServerErrors(error.fields);
          this.saveError.set(error.message);
          return;
        }

        this.saveError.set('ذخیرهٔ برند ناموفق بود. دوباره تلاش کنید.');
      },
    });
  }

  private setSaving(value: boolean): void {
    this.saving.set(value);
    this.savingChange.emit(value);
  }

  private logoUploadMessage(error: unknown): string {
    return error instanceof ApiError && error.message.trim() !== ''
      ? error.message
      : 'بارگذاری لوگو ناموفق بود. دوباره تلاش کنید.';
  }

  /** Only the `blob:` this form made; a server URL (even the mock's) survives. */
  private revokeLocalPreview(): void {
    if (this.localPreviewUrl === null) {
      return;
    }

    URL.revokeObjectURL(this.localPreviewUrl);
    this.localPreviewUrl = null;
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
