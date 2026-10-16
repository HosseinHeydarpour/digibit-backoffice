import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      // The root shell now mounts the confirm dialog (BO-B11) and the toast
      // (BO-B12), and neither PrimeNG's ConfirmationService nor its
      // MessageService is root-provided — the real app registers both in
      // app.config.ts, so this test has to register them too or the shell throws
      // a NullInjectorError while creating the hosts.
      providers: [provideRouter([]), ConfirmationService, MessageService],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the router outlet', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });
});
