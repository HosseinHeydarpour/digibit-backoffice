import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ErrorState } from './error-state';

describe('ErrorState (BO-E07)', () => {
  let fixture: ComponentFixture<ErrorState>;
  let component: ErrorState;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorState],
    }).compileComponents();

    fixture = TestBed.createComponent(ErrorState);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
  });

  it('renders the default title and retry label with no inputs (tc 2)', () => {
    fixture.detectChanges();

    // Bare `<app-error-state />` must still speak the panel's generic failure —
    // a widget that just wants to say "it broke" needs no configuration.
    expect(el.querySelector('[role="alert"] h2')?.textContent?.trim()).toBe(
      'دریافت اطلاعات ناموفق بود',
    );
    expect(el.querySelector('[role="alert"] p')?.textContent?.trim()).toBe(
      'لطفاً دوباره تلاش کنید.',
    );
    expect(el.querySelector('button')?.textContent).toContain('تلاش دوباره');
  });

  it('overrides the title and description when given (tc 2)', () => {
    fixture.componentRef.setInput('title', 'دریافت نمودار فروش ناموفق بود');
    fixture.componentRef.setInput('description', 'سرور پاسخ نداد.');
    fixture.detectChanges();

    expect(el.querySelector('[role="alert"] h2')?.textContent?.trim()).toBe(
      'دریافت نمودار فروش ناموفق بود',
    );
    expect(el.querySelector('[role="alert"] p')?.textContent?.trim()).toBe('سرور پاسخ نداد.');
  });

  it('emits retry when the button is clicked (tc 3)', () => {
    fixture.detectChanges();

    let retries = 0;
    component.retry.subscribe(() => {
      retries += 1;
    });

    (el.querySelector('button') as HTMLButtonElement).click();
    (el.querySelector('button') as HTMLButtonElement).click();

    expect(retries).toBe(2);
  });

  it('wraps the block in role="alert", not role="status"', () => {
    fixture.detectChanges();

    // A failure REPLACES content the user was waiting on, so it is announced
    // immediately. `role="status"` (the empty-state contract) would be wrong
    // here — that is for a quiet "nothing found" result.
    expect(el.querySelector('[role="alert"]')).toBeTruthy();
    expect(el.querySelector('[role="status"]')).toBeNull();
  });
});
