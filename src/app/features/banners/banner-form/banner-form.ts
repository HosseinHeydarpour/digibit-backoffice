import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnChanges,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { SimpleChanges } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormField } from '@shared/components/form-field/form-field';
import { JalaliDatepicker } from '@shared/components/jalali-datepicker/jalali-datepicker';
import { LoadingDirective } from '@shared/directives/loading.directive';
import type { BannerPosition, SelectOption } from '@shared/models';
import { ApiError } from '@shared/models';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { of, switchMap } from 'rxjs';

import type { Banner, BannerInput } from '../models/banner.model';
import { BannersService } from '../services/banners.service';

import { bannerAspectClass, bannerAspectLabel, validateBannerImage } from './banner-image';
import {
  bannerAltValidator,
  bannerDateRangeValidator,
  bannerLinkValidator,
  bannerTitleValidator,
} from './banner-validators';

const DAY = 86_400_000;

/** `millis` → `YYYY-MM-DD` in LOCAL time (the datepicker's contract). */
function toDateInput(millis: number): string {
  const date = new Date(millis);
  const pad = (value: number): string => String(value).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** A `YYYY-MM-DD` string → the first or last millisecond of that local day. */
function toMillis(value: string | null, endOfDay: boolean): number {
  if (!value) {
    return 0;
  }

  const [year, month, day] = value.split('-').map(Number);
  const start = new Date(year, month - 1, day).getTime();

  return endOfDay ? start + DAY - 1 : start;
}

/**
 * Banner create/edit form (BO-L02/L03/L05).
 *
 * The image is uploaded AT SAVE: picking a file only validates it and shows a
 * blob: preview whose aspect ratio follows the position. The payload carries
 * the server URL, never the blob.
 *
 * The link has two modes (`/products` vs `https://…`); the active field owns
 * the error, so the user is never told "the link" while looking at two inputs.
 */
@Component({
  selector: 'app-banner-form',
  imports: [
    ReactiveFormsModule,
    FormField,
    JalaliDatepicker,
    LoadingDirective,
    ButtonDirective,
    InputText,
    Select,
    ToggleSwitch,
  ],
  templateUrl: './banner-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannerForm implements OnChanges {
  private readonly banners = inject(BannersService);

  private readonly destroyRef = inject(DestroyRef);

  /** `null` = create. */
  readonly banner = input<Banner | null>(null);

  readonly saved = output<Banner>();

  readonly cancelled = output<void>();

  readonly saving = signal(false);

  readonly saveError = signal<string | null>(null);

  readonly imageError = signal<string | null>(null);

  /** The stored URL (edit/prefill) — replaced by the upload's URL on save. */
  readonly imageUrl = signal('');

  /** A local blob URL for the picked-but-not-uploaded file. */
  private readonly objectUrl = signal('');

  private readonly file = signal<File | null>(null);

  readonly form = new FormGroup(
    {
      title: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, bannerTitleValidator],
      }),
      alt: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, bannerAltValidator],
      }),
      position: new FormControl<BannerPosition>('home-top', { nonNullable: true }),
      mode: new FormControl<'internal' | 'external'>('internal', { nonNullable: true }),
      internalLink: new FormControl('/products', { nonNullable: true }),
      externalLink: new FormControl('', { nonNullable: true }),
      from: new FormControl<string | null>(null, { validators: [Validators.required] }),
      to: new FormControl<string | null>(null, { validators: [Validators.required] }),
      isActive: new FormControl(false, { nonNullable: true }),
    },
    { validators: [bannerLinkValidator, bannerDateRangeValidator] },
  );

  get positionOptions(): SelectOption<BannerPosition>[] {
    return [
      { label: 'هدر', value: 'home-top' },
      { label: 'اسلایدر', value: 'home-middle' },
      { label: 'کناری', value: 'sidebar' },
    ];
  }

  get modeOptions(): SelectOption<'internal' | 'external'>[] {
    return [
      { label: 'آدرس داخلی', value: 'internal' },
      { label: 'آدرس بیرونی', value: 'external' },
    ];
  }

  get pageOptions(): SelectOption<string>[] {
    return [
      { label: 'خانه', value: '/' },
      { label: 'محصولات', value: '/products' },
      { label: 'دسته‌بندی‌ها', value: '/categories' },
      { label: 'درباره ما', value: '/about' },
      { label: 'تماس با ما', value: '/contact' },
    ];
  }

  readonly preview = computed(() => this.objectUrl() || this.imageUrl());

  readonly isExternal = computed(() => this.form.controls.mode.value === 'external');

  readonly aspectClass = computed(() => bannerAspectClass(this.form.controls.position.value));

  readonly aspectLabel = computed(() => bannerAspectLabel(this.form.controls.position.value));

  constructor() {
    this.destroyRef.onDestroy(() => this.revokeObjectUrl());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['banner']) {
      this.hydrate();
    }
  }

  /** File picked: validate, preview with a blob, keep the bytes for save. */
  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const error = validateBannerImage(file);

    if (error) {
      this.imageError.set(error);
      input.value = '';

      return;
    }

    this.revokeObjectUrl();
    this.file.set(file);
    this.imageError.set(null);
    this.objectUrl.set(URL.createObjectURL(file));
  }

  removeImage(): void {
    this.revokeObjectUrl();
    this.file.set(null);
    this.imageUrl.set('');
    this.imageError.set(null);
  }

  /** A server error's field message, shown only after the field was touched. */
  fieldError(name: string): string | null {
    const control = this.form.get(name);

    if (!control?.touched) {
      return null;
    }

    const server = control.errors?.['server'];

    if (typeof server === 'string') {
      return server;
    }

    const errors = control.errors ?? {};

    if (errors['titleShort']) return 'عنوان باید حداقل ۳ کاراکتر باشد.';
    if (errors['titleLong']) return 'عنوان باید حداکثر ۶۰ کاراکتر باشد.';
    if (errors['altLong']) return 'متن جایگزین حداکثر ۱۰۰ کاراکتر باشد.';
    if (errors['link']) return 'آدرس معتبر نیست.';
    if (errors['afterFrom']) return 'پایان بازه باید بعد از شروع باشد.';

    return null;
  }

  save(): void {
    if (this.saving()) {
      return;
    }

    this.form.markAllAsTouched();
    this.saveError.set(null);
    this.clearServerErrors();

    const active = this.form.controls.isActive.value;

    if (active && this.preview() === '') {
      this.imageError.set('بنر فعال باید تصویر داشته باشد.');
      return;
    }

    if (this.form.invalid) {
      this.saveError.set('اطلاعات فرم را کامل کنید.');
      return;
    }

    this.saving.set(true);

    const editing = this.banner();
    const file = this.file();

    of(file)
      .pipe(
        switchMap((picked) => (picked ? this.banners.upload(picked) : of(null))),
        switchMap((uploaded) => {
          const input = this.toInput(uploaded?.url ?? this.imageUrl());

          return editing ? this.banners.update(editing.id, input) : this.banners.create(input);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (banner) => {
          this.saving.set(false);
          this.saved.emit(banner);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.onSaveError(error);
        },
      });
  }

  private hydrate(): void {
    const banner = this.banner();
    const now = Date.now();

    this.saveError.set(null);
    this.imageError.set(null);
    this.clearServerErrors();
    this.revokeObjectUrl();
    this.file.set(null);

    if (banner) {
      const internal = banner.link.startsWith('/');

      this.imageUrl.set(banner.imageUrl);
      this.form.reset({
        title: banner.title,
        alt: banner.alt,
        position: banner.position,
        mode: internal ? 'internal' : 'external',
        internalLink: internal ? banner.link : '/products',
        externalLink: internal ? '' : banner.link,
        from: toDateInput(banner.from),
        to: toDateInput(banner.to),
        isActive: banner.isActive,
      });

      return;
    }

    this.imageUrl.set('');
    this.form.reset({
      title: '',
      alt: '',
      position: 'home-top',
      mode: 'internal',
      internalLink: '/products',
      externalLink: '',
      from: toDateInput(now),
      to: toDateInput(now + 14 * DAY),
      isActive: false,
    });
  }

  private toInput(imageUrl: string): BannerInput {
    const value = this.form.getRawValue();

    return {
      title: value.title.trim(),
      alt: value.alt.trim(),
      imageUrl,
      link: value.mode === 'internal' ? value.internalLink.trim() : value.externalLink.trim(),
      position: value.position,
      from: toMillis(value.from, false),
      to: toMillis(value.to, true),
      isActive: value.isActive,
    };
  }

  private onSaveError(error: unknown): void {
    if (error instanceof ApiError && error.fields) {
      for (const [field, messages] of Object.entries(error.fields)) {
        const control = this.form.get(field);

        if (control && messages.length > 0) {
          control.setErrors({ server: messages[0] });
          control.markAsTouched();
        }
      }

      return;
    }

    this.saveError.set(
      error instanceof ApiError ? error.message : 'ذخیرهٔ بنر ناموفق بود. دوباره تلاش کن.',
    );
  }

  private clearServerErrors(): void {
    for (const control of Object.values(this.form.controls)) {
      if (control.errors?.['server']) {
        const errors = { ...control.errors };
        delete errors['server'];
        control.setErrors(Object.keys(errors).length > 0 ? errors : null);
      }
    }
  }

  private revokeObjectUrl(): void {
    const url = this.objectUrl();

    if (url !== '') {
      URL.revokeObjectURL(url);
      this.objectUrl.set('');
    }
  }
}
