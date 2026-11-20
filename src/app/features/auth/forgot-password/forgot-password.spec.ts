import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '@core/services/auth';
import { of } from 'rxjs';

import { ForgotPassword } from './forgot-password';

class AuthStub {
  readonly requestPasswordReset = vi.fn(() => of({ message: 'ok', debugToken: null }));
}

describe('ForgotPassword (BO-D11)', () => {
  let auth: AuthStub;

  beforeEach(() => {
    auth = new AuthStub();

    TestBed.configureTestingModule({
      imports: [ForgotPassword],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
  });

  function mount() {
    const fixture = TestBed.createComponent(ForgotPassword);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the same success message for any valid address', () => {
    const fixture = mount();

    fixture.componentInstance['form'].setValue({ email: 'somebody@example.com' });
    fixture.componentInstance['submit']();
    fixture.detectChanges();

    expect(auth.requestPasswordReset).toHaveBeenCalledWith('somebody@example.com');
    expect(fixture.nativeElement.textContent).toContain('اگر ایمیل معتبر باشد');
  });

  it('does not call the API for an invalid address', () => {
    const fixture = mount();

    fixture.componentInstance['form'].setValue({ email: 'not-an-email' });
    fixture.componentInstance['submit']();

    expect(auth.requestPasswordReset).not.toHaveBeenCalled();
  });
});
