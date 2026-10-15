// src/app/core/services/page-title.spec.ts
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { PageTitleService } from './page-title';

@Component({ selector: 'app-blank', template: '' })
class Blank {}

const ROUTES = [
  {
    path: '',
    component: Blank,
    children: [
      { path: 'products', title: 'محصولات', data: { title: 'محصولات' }, children: [] },
      { path: 'orders/:id', data: { title: 'جزئیات سفارش' }, children: [] },
      { path: 'untitled', children: [] },
    ],
  },
  { path: '**', children: [] },
];

describe('PageTitleService', () => {
  let service: PageTitleService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(ROUTES)],
    });
    service = TestBed.inject(PageTitleService);
    router = TestBed.inject(Router);
  });

  it('starts on the default title before any navigation (tc 9)', () => {
    expect(service.title()).toBe('پنل مدیریت');
  });

  it('reads the title from the deepest matched route (tc 1, tc 10)', async () => {
    await router.navigateByUrl('/products');
    expect(service.title()).toBe('محصولات');
  });

  it('updates when the route changes (tc 1, tc 7)', async () => {
    await router.navigateByUrl('/products');
    expect(service.title()).toBe('محصولات');

    await router.navigateByUrl('/orders/42');
    expect(service.title()).toBe('جزئیات سفارش');
  });

  it('falls back to the default for a route with no data.title (tc 9)', async () => {
    await router.navigateByUrl('/untitled');
    expect(service.title()).toBe('پنل مدیریت');
  });

  it('builds the title for a parameterised route (tc 5)', async () => {
    await router.navigateByUrl('/orders/42');
    expect(service.title()).toBe('جزئیات سفارش');
  });
});
