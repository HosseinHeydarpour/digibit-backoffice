import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth';
import { ToastService } from '@core/services/toast';
import { FormField } from '@shared/components/form-field/form-field';
import { LoadingDirective } from '@shared/directives/loading.directive';
import type { ApiError } from '@shared/models';
import { passwordsMatch } from '@shared/utils/passwords-match';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';

/** The backend rejects a new password shorter than 12 characters. */
const MIN_PASSWORD_LENGTH = 12;

@Component({
  selector: 'app-reset-password',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    FormField,
    ButtonDirective,
    InputText,
    LoadingDirective,
  ],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      email: [this.query.get('email') ?? '', [Validators.required, Validators.email]],
      token: [this.query.get('token') ?? '', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  private readonly formEvents = toSignal(this.form.events, { initialValue: null });

  protected readonly mismatch = computed(() => {
    this.formEvents();

    return this.form.hasError('mismatch') && this.form.controls.confirmPassword.touched;
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
    const { email, token, newPassword } = this.form.getRawValue();

    this.auth.resetPassword(email.trim(), token.trim(), newPassword).subscribe({
      next: () => {
        this.toast.success('رمز عبور تغییر کرد. با رمز جدید وارد شوید.');
        void this.router.navigateByUrl('/login', { replaceUrl: true });
      },
      error: (failure: ApiError) => {
        this.submitting.set(false);
        this.error.set(failure.message || 'بازیابی رمز ناموفق بود.');
      },
    });
  }
}
