// src/app/layout/topbar/topbar.spec.ts
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PageTitleService } from '@core/services/page-title';

import { Topbar } from './topbar';

describe('Topbar', () => {
  let fixture: ComponentFixture<Topbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Topbar],
      providers: [
        provideRouter([]),
        {
          provide: PageTitleService,
          useValue: { title: signal('محصولات') },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Topbar);
    fixture.detectChanges();
  });

  it('renders the current page title from the service (tc 1, tc 4)', () => {
    const heading = fixture.nativeElement.querySelector('h1') as HTMLElement;
    expect(heading.textContent?.trim()).toBe('محصولات');
  });

  it('shows the hamburger only below the lg breakpoint (tc 3)', () => {
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    // classList.contains, never querySelector('.lg\\:hidden') — the escaped
    // colon in a Tailwind variant is fragile, and the "/" in opacity
    // modifiers is outright invalid in a selector.
    expect(button.classList.contains('lg:hidden')).toBe(true);
  });

  it('emits menuToggle when the hamburger is clicked', () => {
    let emitted = 0;
    fixture.componentInstance.menuToggle.subscribe(() => (emitted += 1));

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();

    expect(emitted).toBe(1);
  });

  it('gives the icon-only button an accessible name', () => {
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBeTruthy();
  });
});
