import {
  ChangeDetectionStrategy,
  Component,
  OnChanges,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { SimpleChanges } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmService } from '@core/services/confirm';
import { FormField } from '@shared/components/form-field/form-field';
import { LoadingDirective } from '@shared/directives/loading.directive';
import { ApiError } from '@shared/models';
import { formatDigits } from '@shared/pipes/persian-digits.pipe';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { startWith } from 'rxjs';

import type { ContentPage, ContentPageInput } from '../models/content-page.model';
import { PagesService } from '../services/pages.service';

export const PAGE_META_TITLE_MAX = 70;
export const PAGE_META_DESCRIPTION_MAX = 160;

/**
 * Fixed-page editor (BO-L08).
 *
 * The slug is fixed data; only the content and its SEO fields are editable.
 * The preview is the body with its newlines preserved — a plain-text editor,
 * not a Markdown renderer, so what the author types is exactly what the site
 * shows.
 *
 * `hasChanges` gates Cancel: leaving with unsaved text asks first. The dialog
 * itself has no close button or Escape handler, so every exit goes through
 * this component's two buttons.
 */
@Component({
  selector: 'app-content-page-form',
  imports: [ReactiveFormsModule, FormField, LoadingDirective, ButtonDirective, InputText, Textarea],
  templateUrl: './content-page-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentPageForm implements OnChanges {
  private readonly pages = inject(PagesService);

  private readonly confirm = inject(ConfirmService);

  readonly page = input<ContentPage | null>(null);

  readonly saved = output<ContentPage>();

  readonly cancelled = output<void>();

  readonly saving = signal(false);

  readonly saveError = signal<string | null>(null);

  readonly form = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(80)],
    }),
    body: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    metaTitle: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(PAGE_META_TITLE_MAX)],
    }),
    metaDescription: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(PAGE_META_DESCRIPTION_MAX)],
    }),
  });

  private readonly formValue = toSignal(
    this.form.valueChanges.pipe(startWith(this.form.getRawValue())),
    { initialValue: this.form.getRawValue() },
  );

  readonly preview = computed(() => this.formValue()?.body ?? '');
  readonly metaTitleCount = computed(() => formatDigits(this.formValue()?.metaTitle?.length ?? 0));
  readonly metaDescriptionCount = computed(() =>
    formatDigits(this.formValue()?.metaDescription?.length ?? 0),
  );

  get hasChanges(): boolean {
    return this.form.dirty;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['page']) {
      const page = this.page();

      this.saveError.set(null);
      this.form.reset({
        title: page?.title ?? '',
        body: page?.body ?? '',
        metaTitle: page?.metaTitle ?? '',
        metaDescription: page?.metaDescription ?? '',
      });
    }
  }

  save(): void {
    const page = this.page();

    if (this.saving() || !page) {
      return;
    }

    this.form.markAllAsTouched();
    this.saveError.set(null);
    this.clearServerErrors();

    if (this.form.invalid) {
      this.saveError.set('عنوان و متن صفحه را کامل کن.');
      return;
    }

    this.saving.set(true);

    this.pages.update(page.slug, this.toInput()).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.form.markAsPristine();
        this.saved.emit(updated);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.onSaveError(error);
      },
    });
  }

  async cancel(): Promise<void> {
    if (this.hasChanges) {
      const confirmed = await this.confirm.confirm({
        message: 'تغییرات ذخیره نشده‌اند؛ بدون ذخیره خارج می‌شوی؟',
        header: 'خروج بدون ذخیره',
        acceptLabel: 'خارج شو',
        danger: true,
      });

      if (!confirmed) {
        return;
      }
    }

    this.cancelled.emit();
  }

  fieldError(name: string): string | null {
    const control = this.form.get(name);

    if (!control?.touched) {
      return null;
    }

    const server = control.errors?.['server'];

    return typeof server === 'string' ? server : null;
  }

  private toInput(): ContentPageInput {
    const value = this.form.getRawValue();

    return {
      title: value.title.trim(),
      body: value.body.trim(),
      metaTitle: value.metaTitle.trim(),
      metaDescription: value.metaDescription.trim(),
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
      error instanceof ApiError ? error.message : 'ذخیرهٔ صفحه ناموفق بود. دوباره تلاش کن.',
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
}
