import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '@core/services/auth';
import { SessionService } from '@core/services/session';
import { ToastService } from '@core/services/toast';
import { of } from 'rxjs';

import { Profile } from './profile';

class AuthStub {
  readonly changePassword = vi.fn(() => of(undefined));

  readonly logout = vi.fn();
}

describe('Profile (BO-D12)', () => {
  let auth: AuthStub;
  let toast: { success: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    auth = new AuthStub();
    toast = { success: vi.fn() };

    TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        {
          provide: SessionService,
          useValue: {
            user: signal({
              id: '1',
              fullName: 'مدیر سیستم',
              email: null,
              avatarUrl: null,
            }),
            initials: signal('مس'),
          },
        },
        { provide: ToastService, useValue: toast },
      ],
    });
  });

  function mount() {
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();
    return fixture;
  }

  function fill(
    fixture: ReturnType<typeof mount>,
    current: string,
    next: string,
    confirm: string,
  ): void {
    const form = fixture.componentInstance['form'];

    form.setValue({
      currentPassword: current,
      newPassword: next,
      confirmPassword: confirm,
    });
  }

  it('shows the signed-in identity', () => {
    const fixture = mount();

    expect(fixture.nativeElement.textContent).toContain('مدیر سیستم');
    expect(fixture.nativeElement.textContent).toContain('مس');
  });

  it('refuses a mismatch before calling the API', () => {
    const fixture = mount();
    fill(fixture, 'OldPassword123', 'NewPassword123', 'OtherPassword123');

    fixture.componentInstance['submit']();

    expect(auth.changePassword).not.toHaveBeenCalled();
  });

  it('changes the password, confirms, and ends the session', () => {
    const fixture = mount();
    fill(fixture, 'OldPassword123', 'NewPassword123', 'NewPassword123');

    fixture.componentInstance['submit']();

    expect(auth.changePassword).toHaveBeenCalledWith('OldPassword123', 'NewPassword123');
    expect(toast.success).toHaveBeenCalled();
    expect(auth.logout).toHaveBeenCalled();
  });
});
