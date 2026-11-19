import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PERMISSIONS } from '@core/auth/permissions.token';
import { ConfirmService } from '@core/services/confirm';
import { ToastService } from '@core/services/toast';
import type { BannerPosition } from '@shared/models';
import type { ToggleSwitch } from 'primeng/toggleswitch';
import { NEVER, Observable, of, throwError } from 'rxjs';

import type { Banner } from '../models/banner.model';
import { BannersService } from '../services/banners.service';

import { BannerList } from './banner-list';

const DAY = 86_400_000;
const NOW = Date.now();

function banner(overrides: Partial<Banner> = {}): Banner {
  return {
    id: '1',
    title: 'تخفیف پاییزه',
    alt: 'بنر تخفیف',
    imageUrl: '/mock/banner-1.jpg',
    link: '/products',
    position: 'home-top',
    order: 1,
    from: NOW - 5 * DAY,
    to: NOW + 5 * DAY,
    isActive: true,
    ...overrides,
  };
}

const BANNERS: readonly Banner[] = [
  banner(),
  banner({ id: '2', title: 'جشنوارهٔ زمستانه', order: 2 }),
  banner({
    id: '3',
    title: 'بنر کناری',
    position: 'sidebar',
    order: 1,
    to: NOW - DAY,
    isActive: false,
  }),
];

class BannersServiceStub {
  rows: readonly Banner[] = BANNERS;

  failWith: string | null = null;

  hang = false;

  statusCalls: { id: string; isActive: boolean }[] = [];

  statusFail = false;

  removeCalls: string[] = [];

  reorderCalls: { position: BannerPosition; ids: readonly string[] }[] = [];

  list(): Observable<Banner[]> {
    if (this.hang) return NEVER;

    return this.failWith === null
      ? of([...this.rows])
      : throwError(() => new Error(this.failWith ?? 'failed'));
  }

  setStatus(id: string, isActive: boolean): Observable<Banner> {
    this.statusCalls.push({ id, isActive });

    return this.statusFail
      ? throwError(() => new Error('status failed'))
      : of(banner({ id, isActive }));
  }

  remove(id: string): Observable<{ deleted: boolean }> {
    this.removeCalls.push(id);
    this.rows = this.rows.filter((row) => row.id !== id);

    return of({ deleted: true });
  }

  reorder(input: { position: BannerPosition; ids: readonly string[] }): Observable<Banner[]> {
    this.reorderCalls.push(input);
    this.rows = this.rows.map((row) =>
      row.position === input.position ? { ...row, order: input.ids.indexOf(row.id) + 1 } : row,
    );

    return of([...this.rows]);
  }
}

async function settle(fixture: ComponentFixture<BannerList>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
}

function fakeToggle(): ToggleSwitch {
  return { writeValue: vi.fn() } as unknown as ToggleSwitch;
}

describe('BannerList (BO-L01..L07)', () => {
  let fixture: ComponentFixture<BannerList>;
  let component: BannerList;
  let service: BannersServiceStub;
  let toast: { success: ReturnType<typeof vi.fn>; warning: ReturnType<typeof vi.fn> };
  let confirm: { confirm: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    service = new BannersServiceStub();
    toast = { success: vi.fn(), warning: vi.fn() };
    confirm = { confirm: vi.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [BannerList],
      providers: [
        { provide: BannersService, useValue: service },
        { provide: ToastService, useValue: toast },
        { provide: ConfirmService, useValue: confirm },
        { provide: PERMISSIONS, useValue: signal(['content.view', 'content.manage']) },
      ],
    }).compileComponents();
  });

  async function mount(): Promise<void> {
    fixture = TestBed.createComponent(BannerList);
    component = fixture.componentInstance;
    await settle(fixture);
  }

  it('renders two groups with the position, order and schedule badges', async () => {
    await mount();
    const text = fixture.nativeElement.textContent;

    expect(component.groups().length).toBe(2);
    expect(text).toContain('هدر');
    expect(text).toContain('کناری');
    expect(text).toContain('ترتیب ۱');
    expect(text).toContain('در حال نمایش');
    expect(text).toContain('منقضی');
    expect(fixture.nativeElement.querySelectorAll('article').length).toBe(3);
  });

  it('filters the groups by position without another request', async () => {
    await mount();

    component.onPositionChange('sidebar');
    await settle(fixture);

    expect(component.groups().length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('بنر کناری');
    expect(fixture.nativeElement.querySelectorAll('article').length).toBe(1);
  });

  it('shows the filtered empty and the shop empty apart', async () => {
    service.rows = [banner()];
    await mount();

    component.onPositionChange('sidebar');
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('بنری با این موقعیت نیست');

    component.clearFilter();
    service.rows = [];
    await mount();
    expect(fixture.nativeElement.textContent).toContain('هنوز بنری اضافه نشده');
  });

  it('shows a placeholder for a missing image', async () => {
    service.rows = [banner({ imageUrl: '' })];
    await mount();

    expect(fixture.nativeElement.textContent).toContain('پیش‌نمایش نیست');
  });

  it('moves a banner with the up/down fallback and saves one batch', async () => {
    await mount();
    const group = component.groups()[0];

    component.move(group.items[1], group, -1);
    await settle(fixture);

    expect(service.reorderCalls).toEqual([{ position: 'home-top', ids: ['2', '1'] }]);
    expect(component.groups()[0].items.map((item) => item.id)).toEqual(['2', '1']);
  });

  it('drops a card and sends the whole slot once', async () => {
    await mount();
    const group = component.groups()[0];

    component.drop({ previousIndex: 0, currentIndex: 1 } as never, group);
    await settle(fixture);

    expect(service.reorderCalls).toEqual([{ position: 'home-top', ids: ['2', '1'] }]);
  });

  it('toggles optimistically and rolls back on error', async () => {
    await mount();
    const row = component.groups()[0].items[0];

    await component.toggleStatus(row, fakeToggle());
    expect(service.statusCalls).toEqual([{ id: row.id, isActive: false }]);
    expect(component.groups()[0].items[0].isActive).toBe(false);

    service.statusFail = true;
    await component.toggleStatus(component.groups()[0].items[0], fakeToggle());
    expect(component.groups()[0].items[0].isActive).toBe(true);
  });

  it('refuses to activate a banner without an image', async () => {
    service.rows = [banner({ imageUrl: '', isActive: false })];
    await mount();
    const control = fakeToggle();

    await component.toggleStatus(component.groups()[0].items[0], control);

    expect(control.writeValue).toHaveBeenCalledWith(false);
    expect(service.statusCalls).toEqual([]);
    expect(toast.warning).toHaveBeenCalled();
  });

  it('deletes after confirmation and removes the card', async () => {
    await mount();
    const row = component.groups()[0].items[0];

    await component.removeBanner(row);
    await settle(fixture);

    expect(service.removeCalls).toEqual([row.id]);
    expect(component.groups()[0].items.some((item) => item.id === row.id)).toBe(false);
    expect(toast.success).toHaveBeenCalledWith('بنر حذف شد.');
  });

  it('does nothing when the delete confirmation is cancelled', async () => {
    confirm.confirm.mockResolvedValue(false);
    await mount();

    await component.removeBanner(component.groups()[0].items[0]);

    expect(service.removeCalls).toEqual([]);
  });

  it('opens an empty form from the create button', async () => {
    await mount();

    component.openCreate();
    fixture.detectChanges();

    expect(component.dialogOpen()).toBe(true);
    expect(fixture.nativeElement.querySelector('app-banner-form')).toBeTruthy();
  });

  it('shows the skeleton and recovers from an error', async () => {
    service.hang = true;
    await mount();
    expect(fixture.nativeElement.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it('recovers from a failed fetch', async () => {
    service.failWith = 'boom';
    await mount();
    expect(fixture.nativeElement.textContent).toContain('دریافت بنرها ناموفق بود');

    service.failWith = null;
    const retry = fixture.nativeElement.querySelector(
      'app-error-state button',
    ) as HTMLButtonElement;
    retry.click();
    await settle(fixture);

    expect(fixture.nativeElement.querySelectorAll('article').length).toBe(3);
  });

  it('hides the write controls without content.manage', async () => {
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [BannerList],
      providers: [
        { provide: BannersService, useValue: new BannersServiceStub() },
        { provide: ToastService, useValue: { success: vi.fn(), warning: vi.fn() } },
        { provide: ConfirmService, useValue: { confirm: vi.fn() } },
        { provide: PERMISSIONS, useValue: signal(['content.view']) },
      ],
    }).compileComponents();

    const restricted = TestBed.createComponent(BannerList);
    await settle(restricted);

    expect(restricted.nativeElement.textContent).not.toContain('افزودن بنر');
    expect(restricted.nativeElement.querySelector('[data-edit-banner]')).toBeNull();
    expect(restricted.nativeElement.querySelector('[data-toggle-banner]')).toBeNull();
  });
});
