import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { ApiError } from '@shared/models';
import { of, throwError } from 'rxjs';
import type { Observable } from 'rxjs';

import type { Brand, BrandInput } from '../models/brand.model';
import { BrandsService } from '../services/brands.service';

import { BrandForm } from './brand-form';

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

class BrandsServiceStub {
  created: BrandInput | null = null;

  updated: { id: string; dto: BrandInput } | null = null;

  fail: ApiError | null = null;

  create(dto: BrandInput): Observable<Brand> {
    this.created = dto;

    return this.fail ? throwError(() => this.fail) : of({ ...SAMSUNG, ...dto, id: 'brand-new-9' });
  }

  update(id: string, dto: BrandInput): Observable<Brand> {
    this.updated = { id, dto };

    return this.fail ? throwError(() => this.fail) : of({ ...SAMSUNG, ...dto });
  }
}

describe('BrandForm (BO-G05)', () => {
  let fixture: ComponentFixture<BrandForm>;
  let service: BrandsServiceStub;

  beforeEach(async () => {
    service = new BrandsServiceStub();

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
    await type('#brand-logo', ' https://cdn.test/samsung.png ');

    let saved: Brand | null = null;
    fixture.componentInstance.saved.subscribe((brand) => (saved = brand));

    (element().querySelector('[data-save-brand]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(service.created).toEqual({
      name: 'Samsung',
      slug: 'samsung',
      logo: 'https://cdn.test/samsung.png',
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
    fixture.componentRef.setInput('brand', SAMSUNG);
    await fixture.whenStable();
    fixture.detectChanges();

    const name = element().querySelector('#brand-name') as HTMLInputElement;
    expect(name.value).toBe('سامسونگ');

    (element().querySelector('[data-save-brand]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(service.updated?.id).toBe('6');
    expect(service.updated?.dto).toMatchObject({ name: 'سامسونگ', slug: 'brand-6' });
  });
});
