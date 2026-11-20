import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuthService } from '@core/services/auth';
import { ToastService } from '@core/services/toast';
import { of } from 'rxjs';

import { ResetPassword } from './reset-password';

class AuthStub {
  readonly resetPassword = vi.fn(() => of(undefined));
}

describe('ResetPassword (BO-D11)', () => {
  let auth: AuthStub;

  beforeEach(() => {
    auth = new AuthStub();

    TestBed.configureTestingModule({
      imports: [ResetPassword],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: ToastService, useValue: { success: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({ email: 'admin@example.com', token: 'tok-1' }),
            },
          },
        },
      ],
    });
  });

  function mount() {
    const fixture = TestBed.createComponent(ResetPassword);
    fixture.detectChanges();
    return fixture;
  }

  it('prefills the email and token from the link', () => {
    const fixture = mount();

    expect(fixture.componentInstance['form'].getRawValue()).toMatchObject({
      email: 'admin@example.com',
      token: 'tok-1',
    });
  });

  it('refuses a mismatch before calling the API', () => {
    const fixture = mount();

    fixture.componentInstance['form'].patchValue({
      newPassword: 'NewPassword123',
      confirmPassword: 'OtherPassword123',
    });
    fixture.componentInstance['submit']();

    expect(auth.resetPassword).not.toHaveBeenCalled();
  });

  it('resets with the email, token, and new password', () => {
    const fixture = mount();

    fixture.componentInstance['form'].patchValue({
      newPassword: 'NewPassword123',
      confirmPassword: 'NewPassword123',
    });
    fixture.componentInstance['submit']();

    expect(auth.resetPassword).toHaveBeenCalledWith('admin@example.com', 'tok-1', 'NewPassword123');
  });
});
