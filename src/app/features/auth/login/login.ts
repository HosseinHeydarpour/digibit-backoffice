import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth';
import { environment } from '@env/environment';
import { FormField } from '@shared/components/form-field/form-field';
import { LoadingDirective } from '@shared/directives/loading.directive';
import type { ApiError } from '@shared/models';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    FormField,
    ButtonDirective,
    InputText,
    LoadingDirective,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly appName = environment.APP_NAME;
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected submit(): void {
    if (this.submitting()) {
      return;
    }

    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();

    this.auth.login(email.trim(), password).subscribe({
      next: () => {
        const returnUrl = this.router.parseUrl(this.router.url).queryParams['returnUrl'];
        const target =
          typeof returnUrl === 'string' && returnUrl.startsWith('/') ? returnUrl : '/dashboard';

        void this.router.navigateByUrl(target, { replaceUrl: true });
      },
      error: (failure: ApiError) => {
        this.submitting.set(false);
        this.error.set(this.messageFor(failure));
      },
    });
  }

  private messageFor(error: ApiError): string {
    if (error.status === 401) {
      return 'ایمیل یا رمز عبور نادرست است.';
    }

    if (error.status === 423) {
      return 'حساب به دلیل تلاش‌های ناموفق موقتاً قفل شده است. چند دقیقه دیگر تلاش کنید.';
    }

    if (error.status === 0) {
      return 'ارتباط با سرور برقرار نشد. اتصال شبکه را بررسی کنید.';
    }

    return error.message || 'ورود ناموفق بود. دوباره تلاش کنید.';
  }
}
