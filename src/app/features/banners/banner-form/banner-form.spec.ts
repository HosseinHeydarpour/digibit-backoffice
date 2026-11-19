import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApiError } from '@shared/models';
import { Observable, of, throwError } from 'rxjs';

import type { Banner, BannerInput } from '../models/banner.model';
import { BannersService } from '../services/banners.service';

import { BannerForm } from './banner-form';

const DAY = 86_400_000;
const NOW = Date.now();

const BANNER: Banner = {
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
};

class BannersServiceStub {
  created: BannerInput[] = [];

  updated: { id: string; input: BannerInput }[] = [];

  uploads = 0;

  failWith: unknown = null;

  upload(): Observable<{ url: string }> {
    this.uploads += 1;

    return of({ url: 'https://cdn.test/banner.webp' });
  }

  create(input: BannerInput): Observable<Banner> {
    this.created.push(input);

    return this.failWith ? throwError(() => this.failWith) : of({ ...BANNER, ...input, id: '9' });
  }

  update(id: string, input: BannerInput): Observable<Banner> {
    this.updated.push({ id, input });

    return this.failWith ? throwError(() => this.failWith) : of({ ...BANNER, ...input });
  }
}

describe('BannerForm (BO-L02/L03/L05)', () => {
  let fixture: ComponentFixture<BannerForm>;
  let component: BannerForm;
  let service: BannersServiceStub;

  beforeEach(() => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:preview'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  async function mount(banner: Banner | null): Promise<void> {
    service = new BannersServiceStub();

    await TestBed.configureTestingModule({
      imports: [BannerForm],
      providers: [{ provide: BannersService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(BannerForm);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('banner', banner);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function save(): Promise<void> {
    component.save();
    await fixture.whenStable();
  }

  it('starts a create form with an internal link and a 14-day window', async () => {
    await mount(null);

    expect(component.form.controls.position.value).toBe('home-top');
    expect(component.form.controls.mode.value).toBe('internal');
    expect(component.form.controls.internalLink.value).toBe('/products');
    expect(component.form.controls.isActive.value).toBe(false);
    expect(component.form.controls.from.value).toBeTruthy();
  });

  it('creates with trimmed text, a link and start/end-of-day millis', async () => {
    await mount(null);
    let emitted: Banner | undefined;
    component.saved.subscribe((banner) => (emitted = banner));

    component.form.patchValue({
      title: ' بنر آزمایشی ',
      alt: ' توضیح تصویر ',
      from: '2026-01-01',
      to: '2026-01-31',
      isActive: false,
    });
    await save();

    expect(service.created[0]).toEqual({
      title: 'بنر آزمایشی',
      alt: 'توضیح تصویر',
      imageUrl: '',
      link: '/products',
      position: 'home-top',
      from: new Date(2026, 0, 1).getTime(),
      to: new Date(2026, 0, 31, 23, 59, 59, 999).getTime(),
      isActive: false,
    });
    expect(emitted?.id).toBe('9');
  });

  it('uploads the picked file before creating and sends the server URL', async () => {
    await mount(null);
    const file = new File(['x'], 'banner.png', { type: 'image/png' });

    component.onFile({ target: { files: [file], value: '' } } as unknown as Event);
    component.form.patchValue({ title: 'بنر تازه', alt: 'توضیح', isActive: true });
    await save();

    expect(service.uploads).toBe(1);
    expect(service.created[0].imageUrl).toBe('https://cdn.test/banner.webp');
  });

  it('refuses a non-image or an oversized file', async () => {
    await mount(null);

    component.onFile({
      target: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })], value: '' },
    } as unknown as Event);
    expect(component.imageError()).toContain('PNG');

    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.png', {
      type: 'image/png',
    });
    component.onFile({ target: { files: [big], value: '' } } as unknown as Event);
    expect(component.imageError()).toContain('۲ مگابایت');
  });

  it('refuses to save an active banner without an image', async () => {
    await mount(null);
    component.form.patchValue({ title: 'بنر بدون تصویر', alt: 'توضیح', isActive: true });

    await save();

    expect(component.imageError()).toContain('تصویر');
    expect(service.created).toEqual([]);
  });

  it('rejects an external link without a protocol', async () => {
    await mount(null);
    component.form.patchValue({
      title: 'بنر بیرونی',
      alt: 'توضیح',
      mode: 'external',
      externalLink: 'example.com',
      isActive: false,
    });

    await save();

    expect(component.form.controls.externalLink.errors?.['link']).toBe(true);
    expect(service.created).toEqual([]);
  });

  it('hydrates and updates an existing banner', async () => {
    await mount(BANNER);

    expect(component.form.controls.title.value).toBe('تخفیف پاییزه');
    expect(component.imageUrl()).toBe('/mock/banner-1.jpg');

    component.form.controls.title.setValue('تخفیف پاییزهٔ جدید');
    await save();

    expect(service.updated.length).toBe(1);
    expect(service.updated[0].input.title).toBe('تخفیف پاییزهٔ جدید');
    expect(service.uploads).toBe(0);
  });

  it('maps a duplicate/validation 422 under its field', async () => {
    await mount(null);
    service.failWith = new ApiError('VALIDATION', 'بد', 422, {
      title: ['عنوان تکراری است.'],
    });

    component.form.patchValue({ title: 'عنوان', alt: 'توضیح', isActive: false });
    await save();

    expect(component.form.controls.title.errors?.['server']).toBe('عنوان تکراری است.');
    expect(component.fieldError('title')).toBe('عنوان تکراری است.');
  });

  it('removes the image and clears the preview', async () => {
    await mount(BANNER);

    component.removeImage();

    expect(component.imageUrl()).toBe('');
    expect(component.preview()).toBe('');
  });
});
