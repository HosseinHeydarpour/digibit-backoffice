import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { PERMISSIONS } from '@core/auth/permissions.token';
import { applicationConfig, Meta, StoryObj } from '@storybook/angular';
import { NEVER, Observable, of, throwError } from 'rxjs';

import type { ContentPage } from '../models/content-page.model';
import { PagesService } from '../services/pages.service';

import { ContentPageList } from './content-page-list';

const PAGES: readonly ContentPage[] = [
  {
    slug: 'about',
    title: 'درباره ما',
    body: 'دیجی‌بیت مارکت فروشگاه آنلاین لوازم دیجیتال است.',
    metaTitle: 'درباره دیجی‌بیت مارکت',
    metaDescription: 'معرفی فروشگاه.',
    updatedAt: 1_728_000_000_000,
  },
  {
    slug: 'contact',
    title: 'تماس با ما',
    body: 'تلفن و ایمیل پشتیبانی.',
    metaTitle: 'تماس با ما',
    metaDescription: 'راه‌های ارتباط.',
    updatedAt: 1_728_000_000_000,
  },
  {
    slug: 'terms',
    title: 'قوانین و مقررات',
    body: 'شرایط خرید و مرجوعی.',
    metaTitle: 'قوانین',
    metaDescription: 'شرایط.',
    updatedAt: 1_728_000_000_000,
  },
  {
    slug: 'faq',
    title: 'سوالات متداول',
    body: 'پاسخ پرسش‌های پرتکرار.',
    metaTitle: 'سوالات متداول',
    metaDescription: 'پاسخ‌ها.',
    updatedAt: 1_728_000_000_000,
  },
];

class StaticPagesService implements Pick<PagesService, 'list'> {
  list(): Observable<ContentPage[]> {
    return of([...PAGES]);
  }
}

class FlakyPagesService implements Pick<PagesService, 'list'> {
  private failed = false;

  list(): Observable<ContentPage[]> {
    if (this.failed) return of([...PAGES]);

    this.failed = true;

    return throwError(() => new Error('offline'));
  }
}

const meta: Meta<ContentPageList> = {
  title: 'Features/Pages',
  component: ContentPageList,
  decorators: [
    applicationConfig({
      providers: [
        provideRouter([]),
        { provide: PERMISSIONS, useValue: signal(['content.view', 'content.manage']) },
      ],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          'Fixed content pages (BO-L08): about/contact/terms/faq, each edited in a dialog with a',
          'plain-text body preview and SEO fields. There is no create or delete — the public',
          'routes exist and removing one would 404 them.',
          '',
          '**One editor, a confirm on exit.** The dialog has no close button or Escape handler, so',
          'leaving always goes through Cancel, which asks when the form is dirty.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<ContentPageList>;

/** The four fixed pages. */
export const Default: Story = {
  render: () => ({
    template: '<app-content-page-list />',
    moduleMetadata: {
      providers: [{ provide: PagesService, useValue: new StaticPagesService() }],
    },
  }),
};

/** The first paint: four skeleton rows. */
export const Loading: Story = {
  render: () => ({
    template: '<app-content-page-list />',
    moduleMetadata: {
      providers: [{ provide: PagesService, useValue: { list: () => NEVER } }],
    },
  }),
};

/** No page returned (a misconfigured backend, not a delete flow). */
export const Empty: Story = {
  render: () => ({
    template: '<app-content-page-list />',
    moduleMetadata: {
      providers: [{ provide: PagesService, useValue: { list: () => of([]) } }],
    },
  }),
};

/** The fetch rejected; retry answers. */
export const RequestFailed: Story = {
  render: () => ({
    template: '<app-content-page-list />',
    moduleMetadata: {
      providers: [{ provide: PagesService, useValue: new FlakyPagesService() }],
    },
  }),
};
