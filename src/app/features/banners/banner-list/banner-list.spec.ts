import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEVER, Observable, of, throwError } from 'rxjs';

import type { Banner } from '../models/banner.model';
import { BannersService } from '../services/banners.service';

import { BannerList } from './banner-list';

const BANNERS: readonly Banner[] = [
  {
    id: '1',
    title: 'تخفیف پاییزه',
    imageUrl: '/mock/banner-1.jpg',
    link: '/products',
    position: 'home-top',
    order: 1,
    from: 1_728_000_000_000,
    to: 1_730_000_000_000,
    isActive: true,
  },
  {
    id: '2',
    title: 'اسلایدر موبایل',
    imageUrl: '/mock/banner-2.jpg',
    link: '/products',
    position: 'home-middle',
    order: 2,
    from: 1_728_000_000_000,
    to: 1_730_000_000_000,
    isActive: true,
  },
  {
    id: '3',
    title: 'بنر کناری',
    imageUrl: '/mock/banner-3.jpg',
    link: '/products',
    position: 'sidebar',
    order: 1,
    from: 1_728_000_000_000,
    to: 1_730_000_000_000,
    isActive: false,
  },
];

class BannersServiceStub {
  rows: readonly Banner[] = BANNERS;

  failWith: string | null = null;

  hang = false;

  list(): Observable<Banner[]> {
    if (this.hang) return NEVER;

    return this.failWith === null
      ? of([...this.rows])
      : throwError(() => new Error(this.failWith ?? 'failed'));
  }
}

async function settle(fixture: ComponentFixture<BannerList>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('BannerList (BO-L01)', () => {
  let fixture: ComponentFixture<BannerList>;
  let component: BannerList;
  let service: BannersServiceStub;

  beforeEach(async () => {
    service = new BannersServiceStub();

    await TestBed.configureTestingModule({
      imports: [BannerList],
      providers: [{ provide: BannersService, useValue: service }],
    }).compileComponents();
  });

  async function mount(): Promise<void> {
    fixture = TestBed.createComponent(BannerList);
    component = fixture.componentInstance;
    await settle(fixture);
  }

  it('renders one card per banner with title, position, order, window and status', async () => {
    await mount();
    const text = fixture.nativeElement.textContent;

    expect(fixture.nativeElement.querySelectorAll('article').length).toBe(3);
    expect(text).toContain('تخفیف پاییزه');
    expect(text).toContain('هدر');
    expect(text).toContain('اسلایدر');
    expect(text).toContain('کناری');
    expect(text).toContain('ترتیب ۱');
    expect(text).toMatch(/۱۴[۰-۹]{2}\/[۰-۹]{2}\/[۰-۹]{2}/);
    expect(text).toContain('فعال');
    expect(text).toContain('غیرفعال');
  });

  it('filters the grid by position without another request', async () => {
    await mount();
    const before = service.rows.length;

    component.onPositionChange('sidebar');
    await settle(fixture);

    expect(fixture.nativeElement.querySelectorAll('article').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('بنر کناری');
    expect(service.rows.length).toBe(before);
  });

  it('tells a filtered empty apart from an empty shop', async () => {
    service.rows = [BANNERS[0]];
    await mount();

    component.onPositionChange('sidebar');
    await settle(fixture);

    expect(fixture.nativeElement.textContent).toContain('بنری با این موقعیت نیست');

    component.clearFilter();
    await settle(fixture);
    expect(fixture.nativeElement.querySelectorAll('article').length).toBe(1);
  });

  it('shows a placeholder when an image is broken', async () => {
    await mount();
    const image = fixture.nativeElement.querySelector('article img') as HTMLImageElement;

    image.dispatchEvent(new Event('error'));
    await settle(fixture);

    expect(fixture.nativeElement.textContent).toContain('پیش‌نمایش نیست');
  });

  it('shows the skeleton while loading', async () => {
    service.hang = true;
    await mount();

    expect(fixture.nativeElement.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it('shows the empty state for a shop with no banners', async () => {
    service.rows = [];
    await mount();

    expect(fixture.nativeElement.textContent).toContain('هنوز بنری اضافه نشده');
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
});
