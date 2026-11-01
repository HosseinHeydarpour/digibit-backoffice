import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { ApiError } from '@shared/models';
import { of, throwError } from 'rxjs';
import type { Observable } from 'rxjs';

import type { Brand, BrandInput } from '../models/brand.model';
import { BrandsService } from '../services/brands.service';

import { BrandForm } from './brand-form';
import { MAX_LOGO_SIZE } from './brand-logo';

const SAMSUNG: Brand = {
  id: '6',
  name: 'سامسونگ',
  slug: 'brand-6',
  logo: null,
  isActive: true,
  productCount: 3,
  description: 'کره جنوبی',
  createdAt: 1_700_000_000_000,
};

const SAMSUNG_LOGO = 'https://cdn.test/samsung.webp';

class BrandsServiceStub {
  created: BrandInput | null = null;

  updated: { id: string; dto: BrandInput } | null = null;

  fail: ApiError | null = null;

  uploads: File[] = [];

  uploadUrl = 'https://cdn.test/uploaded-logo.webp';

  uploadFail: ApiError | null = null;

  create(dto: BrandInput): Observable<Brand> {
    this.created = dto;

    return this.fail ? throwError(() => this.fail) : of({ ...SAMSUNG, ...dto, id: 'brand-new-9' });
  }

  update(id: string, dto: BrandInput): Observable<Brand> {
    this.updated = { id, dto };

    return this.fail ? throwError(() => this.fail) : of({ ...SAMSUNG, ...dto });
  }

  uploadLogo(file: File): Observable<string> {
    this.uploads.push(file);

    return this.uploadFail ? throwError(() => this.uploadFail) : of(this.uploadUrl);
  }
}

function png(name = 'logo.png', size = 10): File {
  return new File([new Uint8Array(size)], name, { type: 'image/png' });
}

const createObjectURL = URL.createObjectURL;
const revokeObjectURL = URL.revokeObjectURL;

describe('BrandForm (BO-G05 + BO-G06)', () => {
  let fixture: ComponentFixture<BrandForm>;
  let service: BrandsServiceStub;
  let urlCounter = 0;
  const revoked: string[] = [];

  beforeAll(() => {
    // jsdom implements neither; the form's preview contract needs both.
    URL.createObjectURL = vi.fn(() => `blob:logo-${(urlCounter += 1)}`);
    URL.revokeObjectURL = vi.fn((url: string) => {
      revoked.push(url);
    }) as typeof URL.revokeObjectURL;
  });

  afterAll(() => {
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
  });

  beforeEach(async () => {
    service = new BrandsServiceStub();
    urlCounter = 0;
    revoked.length = 0;

    await TestBed.configureTestingModule({
      imports: [BrandForm],
      providers: [{ provide: BrandsService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(BrandForm);
    fixture.componentRef.setInput('brand', null);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  async function type(selector: string, value: string): Promise<void> {
    const input = element().querySelector(selector) as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function selectLogo(file: File): Promise<void> {
    const input = element().querySelector('[data-logo-input]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function previewImage(): HTMLImageElement | null {
    return element().querySelector('[data-logo-image]');
  }

  async function mountEdit(brand: Brand): Promise<void> {
    fixture.componentRef.setInput('brand', brand);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('tc 1: a PNG previews locally, then uploads before the brand is saved', async () => {
    await type('#brand-name', 'Samsung');
    await selectLogo(png('brand.png'));

    expect(service.uploads).toEqual([]);
    expect(previewImage()?.getAttribute('src')).toBe('blob:logo-1');
    expect(fixture.componentInstance.logoFile()?.name).toBe('brand.png');

    let saved: Brand | null = null;
    fixture.componentInstance.saved.subscribe((brand) => (saved = brand));

    (element().querySelector('[data-save-brand]') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(service.uploads.map((file) => file.name)).toEqual(['brand.png']);
    expect(service.created?.logo).toBe(service.uploadUrl);
    expect(fixture.componentInstance.form.controls.logo.value).toBe(service.uploadUrl);
    expect(previewImage()?.getAttribute('src')).toBe(service.uploadUrl);
    expect(revoked).toContain('blob:logo-1');
    expect(saved).toMatchObject({ id: 'brand-new-9' });
  });

  it('tc 2: the preview is a fixed square, object-contain, with the initial fallback', async () => {
    const box = element().querySelector('[data-logo-preview]') as HTMLElement;
    expect(box.className).toContain('size-24');
    expect(element().querySelector('[data-logo-fallback]')?.textContent?.trim()).toBe('؟');

    await type('#brand-name', 'سامسونگ');
    expect(element().querySelector('[data-logo-fallback]')?.textContent?.trim()).toBe('س');

    await selectLogo(png());
    expect(previewImage()?.className).toContain('object-contain');
  });

  it('tc 3: removing a saved logo sends logo: null and never revokes the server URL', async () => {
    await mountEdit({ ...SAMSUNG, logo: SAMSUNG_LOGO });

    expect(previewImage()?.getAttribute('src')).toBe(SAMSUNG_LOGO);

    (element().querySelector('[data-remove-logo]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(previewImage()).toBeNull();
    expect(element().querySelector('[data-logo-fallback]')?.textContent?.trim()).toBe('س');

    (element().querySelector('[data-save-brand]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(service.updated?.dto.logo).toBeNull();
    expect(revoked).not.toContain(SAMSUNG_LOGO);
  });

  it('tc 4: a PDF is refused inline and sends nothing', async () => {
    const pdf = new File([new Uint8Array(10)], 'brand.pdf', { type: 'application/pdf' });

    await selectLogo(pdf);

    expect(service.uploads).toEqual([]);
    expect(service.created).toBeNull();
    expect(element().querySelector('[data-logo-error]')?.getAttribute('role')).toBe('alert');
    expect(element().textContent).toContain('فقط فایل PNG، SVG یا WebP مجاز است.');
    expect(previewImage()).toBeNull();
  });

  it('tc 5: a file over 1 MB is refused inline and sends nothing', async () => {
    const big = png('big.png', MAX_LOGO_SIZE + 1);

    await selectLogo(big);

    expect(service.uploads).toEqual([]);
    expect(service.created).toBeNull();
    expect(element().textContent).toContain('حجم فایل بیشتر از ۱ مگابایت است.');
  });

  it('tc 6: an SVG is accepted and uploaded byte-for-byte', async () => {
    const svg = new File(
      [new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>')],
      'brand.svg',
      { type: 'image/svg+xml' },
    );

    await type('#brand-name', 'Samsung');
    await selectLogo(svg);

    expect(previewImage()?.getAttribute('src')).toBe('blob:logo-1');

    (element().querySelector('[data-save-brand]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(service.uploads).toHaveLength(1);
    expect(service.uploads[0]).toBe(svg);
    expect(service.uploads[0].type).toBe('image/svg+xml');
    expect(service.created?.logo).toBe(service.uploadUrl);
  });

  it('tc 8: a second choice replaces the first file and revokes its blob', async () => {
    await type('#brand-name', 'Samsung');
    await selectLogo(png('first.png'));
    await selectLogo(png('second.png'));

    expect(previewImage()?.getAttribute('src')).toBe('blob:logo-2');
    expect(revoked).toEqual(['blob:logo-1']);
    expect(fixture.componentInstance.logoFile()?.name).toBe('second.png');

    (element().querySelector('[data-save-brand]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(service.uploads.map((file) => file.name)).toEqual(['second.png']);
  });

  it('tc 10: the image alt carries the brand name and the input has a real label', async () => {
    const label = element().querySelector('label[for="brand-logo-file"]');
    expect(label).not.toBeNull();
    expect(label?.textContent).toContain('انتخاب فایل');

    await selectLogo(png());
    expect(previewImage()?.getAttribute('alt')).toBe('لوگوی برند');

    await type('#brand-name', 'سامسونگ');
    expect(previewImage()?.getAttribute('alt')).toBe('سامسونگ — لوگو');

    expect((element().querySelector('[data-logo-input]') as HTMLInputElement).accept).toBe(
      'image/png,image/svg+xml,image/webp',
    );
  });

  it('cancel sends nothing, revokes the preview and leaves the brand untouched', async () => {
    let cancelled = false;
    fixture.componentInstance.cancelled.subscribe(() => (cancelled = true));

    await selectLogo(png());
    fixture.componentInstance.cancel();

    expect(cancelled).toBe(true);
    expect(service.uploads).toEqual([]);
    expect(service.created).toBeNull();
    expect(revoked).toContain('blob:logo-1');
  });

  it('destroys the preview URL with the form', async () => {
    await selectLogo(png());

    fixture.destroy();

    expect(revoked).toContain('blob:logo-1');
  });

  it('a failed upload leaves the brand unsaved and shows the message under the logo', async () => {
    service.uploadFail = new ApiError(
      'INTERNAL',
      'بارگذاری لوگو ناموفق بود. دوباره تلاش کنید.',
      500,
    );

    await type('#brand-name', 'Samsung');
    await selectLogo(png());
    (element().querySelector('[data-save-brand]') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(service.created).toBeNull();
    expect(fixture.componentInstance.saving()).toBe(false);
    expect(element().textContent).toContain('بارگذاری لوگو ناموفق بود. دوباره تلاش کنید.');
    expect(fixture.componentInstance.form.controls.logo.value).toBe('');
  });

  it('a failed brand save keeps the uploaded URL, so a retry does not upload again', async () => {
    service.fail = new ApiError('INTERNAL', 'ذخیره ناموفق بود.', 500);

    await type('#brand-name', 'Samsung');
    await selectLogo(png());
    (element().querySelector('[data-save-brand]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(service.uploads).toHaveLength(1);
    expect(fixture.componentInstance.form.controls.logo.value).toBe(service.uploadUrl);

    service.fail = null;
    (element().querySelector('[data-save-brand]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(service.uploads).toHaveLength(1);
    expect(service.created?.logo).toBe(service.uploadUrl);
  });

  it('tc 4/5: the error clears when a valid file is chosen next', async () => {
    await selectLogo(new File([new Uint8Array(10)], 'brand.pdf', { type: 'application/pdf' }));
    expect(element().querySelector('[data-logo-error]')).not.toBeNull();

    await selectLogo(png());
    expect(element().querySelector('[data-logo-error]')).toBeNull();
  });

  it('tc 4: the slug follows the name until it is edited by hand', async () => {
    await type('#brand-name', 'Samsung');

    const slug = element().querySelector('#brand-slug') as HTMLInputElement;
    expect(slug.value).toBe('samsung');

    await type('#brand-slug', 'galaxy');
    await type('#brand-name', 'Samsung Electronics');

    expect(slug.value).toBe('galaxy');
  });

  it('tc 2: an empty form does not call the server and explains what is missing', async () => {
    (element().querySelector('[data-save-brand]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(service.created).toBeNull();
    expect(element().textContent).toContain('نام برند الزامی است');
    expect(element().textContent).toContain('نامک (slug) الزامی است');
  });

  it('tc 2: a valid create sends the trimmed DTO and reports the saved brand', async () => {
    await type('#brand-name', '  Samsung  ');

    let saved: Brand | null = null;
    fixture.componentInstance.saved.subscribe((brand) => (saved = brand));

    (element().querySelector('[data-save-brand]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(service.created).toEqual({
      name: 'Samsung',
      slug: 'samsung',
      logo: null,
      isActive: true,
      description: '',
    });
    expect(saved).toMatchObject({ id: 'brand-new-9' });
  });

  it('tc 5: a 422 lands under the field and keeps the form open', async () => {
    service.fail = new ApiError('VALIDATION', 'این نامک قبلاً استفاده شده است.', 422, {
      slug: ['این نامک قبلاً استفاده شده است.'],
    });

    await type('#brand-name', 'سامسونگ');
    (element().querySelector('[data-save-brand]') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element().textContent).toContain('این نامک قبلاً استفاده شده است.');
    expect(element().querySelector('[data-save-brand]')).not.toBeNull();
  });

  it('tc 3: editing prefills every field and sends a PUT', async () => {
    await mountEdit(SAMSUNG);

    const name = element().querySelector('#brand-name') as HTMLInputElement;
    expect(name.value).toBe('سامسونگ');

    (element().querySelector('[data-save-brand]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(service.updated?.id).toBe('6');
    expect(service.updated?.dto).toMatchObject({ name: 'سامسونگ', slug: 'brand-6' });
  });
});
