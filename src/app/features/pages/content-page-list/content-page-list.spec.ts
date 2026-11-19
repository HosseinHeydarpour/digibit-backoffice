import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PERMISSIONS } from '@core/auth/permissions.token';
import { ConfirmService } from '@core/services/confirm';
import { ToastService } from '@core/services/toast';
import { NEVER, Observable, of, throwError } from 'rxjs';

import type { ContentPage } from '../models/content-page.model';
import { PagesService } from '../services/pages.service';

import { ContentPageList } from './content-page-list';

const PAGES: readonly ContentPage[] = [
  {
    slug: 'about',
    title: 'درباره ما',
    body: 'متن',
    metaTitle: '',
    metaDescription: '',
    updatedAt: 1_728_000_000_000,
  },
  {
    slug: 'contact',
    title: 'تماس با ما',
    body: 'متن',
    metaTitle: '',
    metaDescription: '',
    updatedAt: 1_728_000_000_000,
  },
];

class PagesServiceStub {
  rows: readonly ContentPage[] = PAGES;

  hang = false;

  failWith: string | null = null;

  list(): Observable<ContentPage[]> {
    if (this.hang) return NEVER;

    return this.failWith === null
      ? of([...this.rows])
      : throwError(() => new Error(this.failWith ?? 'failed'));
  }
}

async function settle(fixture: ComponentFixture<ContentPageList>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('ContentPageList (BO-L08)', () => {
  let fixture: ComponentFixture<ContentPageList>;
  let component: ContentPageList;
  let toast: { success: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    toast = { success: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ContentPageList],
      providers: [
        { provide: PagesService, useValue: new PagesServiceStub() },
        { provide: ToastService, useValue: toast },
        { provide: ConfirmService, useValue: { confirm: vi.fn().mockResolvedValue(true) } },
        { provide: PERMISSIONS, useValue: signal(['content.view', 'content.manage']) },
      ],
    }).compileComponents();
  });

  async function mount(): Promise<void> {
    fixture = TestBed.createComponent(ContentPageList);
    component = fixture.componentInstance;
    await settle(fixture);
  }

  it('renders the fixed pages with their routes', async () => {
    await mount();
    const text = fixture.nativeElement.textContent;

    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
    expect(text).toContain('درباره ما');
    expect(text).toContain('/about');
  });

  it('opens the editor with the clicked page', async () => {
    await mount();

    component.edit((component.rows() ?? [])[0]);
    fixture.detectChanges();

    expect(component.dialogOpen()).toBe(true);
    expect(fixture.nativeElement.querySelector('app-content-page-form')).toBeTruthy();
  });

  it('toasts and reloads after a save', async () => {
    await mount();

    component.onSaved();
    await settle(fixture);

    expect(toast.success).toHaveBeenCalledWith('صفحه ذخیره شد.');
    expect(component.dialogOpen()).toBe(false);
  });

  it('has no create or delete control by design', async () => {
    await mount();

    expect(fixture.nativeElement.textContent).not.toContain('افزودن');
    expect(fixture.nativeElement.textContent).not.toContain('حذف');
  });

  it('shows the skeleton while loading', async () => {
    const stub = new PagesServiceStub();
    stub.hang = true;

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ContentPageList],
      providers: [
        { provide: PagesService, useValue: stub },
        { provide: ToastService, useValue: { success: vi.fn() } },
        { provide: ConfirmService, useValue: { confirm: vi.fn() } },
        { provide: PERMISSIONS, useValue: signal(['content.view']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContentPageList);
    await settle(fixture);

    expect(fixture.nativeElement.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it('hides the edit control without content.manage', async () => {
    await mount();

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ContentPageList],
      providers: [
        { provide: PagesService, useValue: new PagesServiceStub() },
        { provide: ToastService, useValue: { success: vi.fn() } },
        { provide: PERMISSIONS, useValue: signal(['content.view']) },
      ],
    }).compileComponents();

    const restricted = TestBed.createComponent(ContentPageList);
    await settle(restricted);

    expect(restricted.nativeElement.querySelector('[data-edit-page]')).toBeNull();
  });

  it('recovers from a failed fetch', async () => {
    const stub = new PagesServiceStub();
    stub.failWith = 'boom';

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ContentPageList],
      providers: [
        { provide: PagesService, useValue: stub },
        { provide: ToastService, useValue: { success: vi.fn() } },
        { provide: ConfirmService, useValue: { confirm: vi.fn() } },
        { provide: PERMISSIONS, useValue: signal(['content.view', 'content.manage']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContentPageList);
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('دریافت صفحات ناموفق بود');

    stub.failWith = null;
    const retry = fixture.nativeElement.querySelector(
      'app-error-state button',
    ) as HTMLButtonElement;
    retry.click();
    await settle(fixture);

    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
  });
});
