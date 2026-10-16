// src/app/shared/components/breadcrumb/breadcrumb.component.spec.ts
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Params, Router, provideRouter } from '@angular/router';

import { BreadcrumbComponent } from './breadcrumb.component';

@Component({ selector: 'app-blank', template: '' })
class Blank {}

const ROUTES = [
  {
    path: '',
    component: Blank,
    children: [
      { path: 'dashboard', data: { breadcrumb: 'پیشخوان' }, children: [] },
      {
        path: 'products',
        data: { breadcrumb: 'محصولات' },
        children: [
          {
            path: ':id',
            data: { breadcrumb: (params: Params) => `ویرایش محصول ${params['id']}` },
            children: [],
          },
        ],
      },
    ],
  },
  { path: '**', children: [] },
];

describe('BreadcrumbComponent', () => {
  let fixture: ComponentFixture<BreadcrumbComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BreadcrumbComponent],
      providers: [provideRouter(ROUTES)],
    }).compileComponents();

    fixture = TestBed.createComponent(BreadcrumbComponent);
    router = TestBed.inject(Router);
  });

  it('renders nothing before any navigation (tc 9)', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
  });

  it('renders one link per step and the last step as plain text (tc 5)', async () => {
    await router.navigateByUrl('/products/12');
    fixture.detectChanges();

    const links = fixture.nativeElement.querySelectorAll('a');
    const current = fixture.nativeElement.querySelector('span[aria-current="page"]');

    expect(links).toHaveLength(1);
    expect(links[0].textContent?.trim()).toBe('محصولات');
    expect(current?.textContent?.trim()).toBe('ویرایش محصول 12');
    // The last step is text, not a link — no anchor wraps it.
    expect(fixture.nativeElement.querySelectorAll('a')[0].textContent).not.toContain('ویرایش');
  });

  it('links each step to its cumulative URL (tc 4)', async () => {
    await router.navigateByUrl('/products/12');
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/products');
  });

  it('navigates to the step when its crumb is clicked (tc 4)', async () => {
    await router.navigateByUrl('/products/12');
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    link.click();
    await fixture.whenStable();

    expect(router.url).toBe('/products');
  });

  it('marks the current step for screen readers (tc 5)', async () => {
    await router.navigateByUrl('/products/12');
    fixture.detectChanges();

    const current = fixture.nativeElement.querySelector('span[aria-current="page"]');
    expect(current).toBeTruthy();
    expect(current.getAttribute('aria-current')).toBe('page');
  });

  it('shows a left-pointing separator between steps in RTL (tc 6)', async () => {
    await router.navigateByUrl('/products/12');
    fixture.detectChanges();

    const icons = Array.from(fixture.nativeElement.querySelectorAll('nav i')) as HTMLElement[];
    expect(icons).toHaveLength(1); // two steps → one separator
    expect(icons[0].classList.contains('pi-chevron-left')).toBe(true);
  });

  it('scrolls a long trail instead of wrapping it (tc 7)', async () => {
    await router.navigateByUrl('/products/12');
    fixture.detectChanges();

    const list = fixture.nativeElement.querySelector('ol') as HTMLElement;
    expect(list.classList.contains('overflow-x-auto')).toBe(true);
    expect(list.classList.contains('whitespace-nowrap')).toBe(true);
  });

  it('renders the Persian labels from route data (tc 8)', async () => {
    await router.navigateByUrl('/products/12');
    fixture.detectChanges();

    // No technical noise: these strings come straight from `data.breadcrumb`.
    expect(fixture.nativeElement.textContent).toContain('محصولات');
    expect(fixture.nativeElement.textContent).toContain('ویرایش محصول 12');
  });

  it('renders no chips on the 404 page (tc 9)', async () => {
    await router.navigateByUrl('/no-such-page');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('li')).toHaveLength(0);
  });
});
