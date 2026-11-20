import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth';
import { FormField } from '@shared/components/form-field/form-field';
import { LoadingDirective } from '@shared/directives/loading.directive';
import type { ApiError } from '@shared/models';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';

@Component({
  selector: 'app-forgot-password',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    FormField,
    ButtonDirective,
    InputText,
    LoadingDirective,
  ],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  private readonly auth = inject(AuthService);

  protected readonly submitting = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly debugToken = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected submit(): void {
    if (this.submitting()) {
      return;
    }

    this.form.markAllAsTouched();
    this.error.set(null);

    if (this.form.invalid) {
      return;
    }

    this.submitting.set(true);

    this.auth.requestPasswordReset(this.form.getRawValue().email.trim()).subscribe({
      next: (answer) => {
        this.submitting.set(false);
        this.sent.set(true);
        this.debugToken.set(answer.debugToken ?? null);
      },
      error: (failure: ApiError) => {
        this.submitting.set(false);
        this.error.set(failure.message || 'ارسال درخواست ناموفق بود.');
      },
    });
  }

  protected get email(): string {
    return this.form.getRawValue().email.trim();
  }
}
