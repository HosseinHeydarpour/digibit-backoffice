import { FormBuilder } from '@angular/forms';

import { createImageGroup, createImageArray } from '../product-gallery/gallery-form';
import { createVariantArray, createVariantGroup } from '../product-variants/variant-form';

import { toCreateProductDto } from './product-payload';

function buildForm() {
  const fb = new FormBuilder();

  return fb.nonNullable.group({
    name: [''],
    slug: [''],
    sku: [''],
    categoryId: [''],
    brandId: [''],
    shortDescription: [''],
    description: [''],
    price: [0],
    stock: [0],
    lowStockThreshold: [5],
    status: ['draft' as const],
    variants: createVariantArray(fb),
    images: createImageArray(fb),
  });
}

describe('toCreateProductDto (BO-F13)', () => {
  it('trims text and turns the empty brand into null', () => {
    const form = buildForm();
    form.patchValue({
      name: '  هدفون سونی  ',
      slug: ' hdfon-sony ',
      sku: ' SONY-WH1000-BLK ',
      categoryId: '3',
      brandId: '',
      description: '  توضیحات  ',
      price: 2_100_000,
      stock: 10,
    });

    const dto = toCreateProductDto(form);

    expect(dto.name).toBe('هدفون سونی');
    expect(dto.slug).toBe('hdfon-sony');
    expect(dto.sku).toBe('SONY-WH1000-BLK');
    expect(dto.brandId).toBeNull();
    expect(dto.description).toBe('توضیحات');
    expect(dto.stock).toBe(10);
  });

  it('keeps a real brand id', () => {
    const form = buildForm();
    form.patchValue({ brandId: '5' });

    expect(toCreateProductDto(form).brandId).toBe('5');
  });

  it('maps the variant rows and drops blob: images', () => {
    const fb = new FormBuilder();
    const form = buildForm();

    form.controls.variants.push(
      createVariantGroup(fb, { basePrice: 2_100_000, seed: { sku: 'SONY-BLK', stock: 4 } }),
    );
    form.controls.images.push(
      createImageGroup(fb, { url: 'blob:http://localhost/abc', alt: 'تصویر' }),
    );
    form.controls.images.push(
      createImageGroup(fb, { url: '/images/products/1.jpg', alt: 'واقعی', isPrimary: true }),
    );

    const dto = toCreateProductDto(form);

    expect(dto.variants).toHaveLength(1);
    expect(dto.variants?.[0]).toMatchObject({ sku: 'SONY-BLK', stock: 4, imageUrl: null });
    // The blob URL is browser-local; only a resolvable URL may reach the API.
    expect(dto.images).toHaveLength(1);
    expect(dto.images?.[0]).toMatchObject({ url: '/images/products/1.jpg', isPrimary: true });
  });

  it('coerces cleared numbers to zero instead of null', () => {
    const form = buildForm();
    form.controls.price.setValue(null as unknown as number);

    expect(toCreateProductDto(form).price).toBe(0);
  });
});
