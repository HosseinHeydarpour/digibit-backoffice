import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth';
import { SessionService } from '@core/services/session';
import { ToastService } from '@core/services/toast';
import { FormField } from '@shared/components/form-field/form-field';
import { PageHeader } from '@shared/components/page-header/page-header';
import { LoadingDirective } from '@shared/directives/loading.directive';
import type { ApiError } from '@shared/models';
import { passwordsMatch } from '@shared/utils/passwords-match';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';

/** The backend rejects a new password shorter than 12 characters. */
export const MIN_PASSWORD_LENGTH = 12;

@Component({
  selector: 'app-profile',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    FormField,
    PageHeader,
    ButtonDirective,
    InputText,
    LoadingDirective,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  private readonly auth = inject(AuthService);
  private readonly session = inject(SessionService);
  private readonly toast = inject(ToastService);

  protected readonly user = this.session.user;
  protected readonly initials = this.session.initials;

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
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
    const { currentPassword, newPassword } = this.form.getRawValue();

    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        // The server revokes the refresh tokens on a password change, so the
        // current session is already over; say why and leave cleanly.
        this.toast.success('رمز عبور تغییر کرد. دوباره وارد شوید.');
        this.auth.logout();
      },
      error: (failure: ApiError) => {
        this.submitting.set(false);
        this.error.set(failure.message || 'تغییر رمز ناموفق بود.');
      },
    });
  }
}
