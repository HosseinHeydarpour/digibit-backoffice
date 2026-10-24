import { FormBuilder } from '@angular/forms';
import type { FormArray, FormGroup } from '@angular/forms';

import {
  MAX_VARIANTS,
  createAttributeGroup,
  createVariantArray,
  createVariantGroup,
  duplicateVariantGroup,
  nextAvailableSku,
  sumVariantStock,
  toVariantInput,
  variantAttributes,
  variantsPayload,
} from './variant-form';

describe('variant form factories (BO-F10)', () => {
  const fb = new FormBuilder();

  function row(seed: Parameters<typeof createVariantGroup>[1]['seed'] = {}): FormGroup {
    return createVariantGroup(fb, { basePrice: 100, seed });
  }

  it('tc 4/6: a new array is invalid until the first row exists', () => {
    const array = createVariantArray(fb);

    expect(array.length).toBe(0);
    expect(array.hasError('requiredVariants')).toBe(true);

    array.push(row());

    expect(array.hasError('requiredVariants')).toBe(false);
  });

  it('tc 4: a row takes the base price and a zero stock', () => {
    const group = row();

    expect(group.get('sku')?.value).toBe('');
    expect(group.get('price')?.value).toBe(100);
    expect(group.get('stock')?.value).toBe(0);
    expect(group.get('imageUrl')?.value).toBe('');
    expect((group.get('attributes') as FormArray).length).toBe(0);
  });

  it('tc 7: a seed restores every saved value, including attributes', () => {
    const group = row({
      sku: 'SONY-1',
      price: 250,
      stock: 4,
      imageUrl: '/images/sony.jpg',
      attributes: { رنگ: 'مشکی', سایز: 'L' },
    });

    expect(group.get('sku')?.value).toBe('SONY-1');
    expect(group.get('price')?.value).toBe(250);
    expect(group.get('stock')?.value).toBe(4);
    expect(group.get('imageUrl')?.value).toBe('/images/sony.jpg');
    expect((group.get('attributes') as FormArray).length).toBe(2);
  });

  it('tc 12: an empty attribute pair is a placeholder, not an error', () => {
    const pair = createAttributeGroup(fb);

    expect(pair.valid).toBe(true);

    pair.get('value')?.setValue('مشکی');

    expect(pair.hasError('keyRequired')).toBe(true);
  });

  it('tc 12: a half-filled attribute pair asks for the missing half', () => {
    const withKey = createAttributeGroup(fb, { key: 'رنگ' });
    const withValue = createAttributeGroup(fb, { value: 'مشکی' });

    expect(withKey.hasError('valueRequired')).toBe(true);
    expect(withValue.hasError('keyRequired')).toBe(true);
  });

  it('tc 12: builds the API record from complete, trimmed pairs only', () => {
    const group = row();
    const attributes = group.get('attributes') as FormArray;

    attributes.push(createAttributeGroup(fb, { key: ' رنگ ', value: ' مشکی ' }));
    attributes.push(createAttributeGroup(fb, { key: 'سایز', value: '' }));
    attributes.push(createAttributeGroup(fb, { key: '', value: '' }));

    expect(variantAttributes(group)).toEqual({ رنگ: 'مشکی' });
  });

  it('tc 12: the first value wins when a key is repeated', () => {
    const group = row();
    const attributes = group.get('attributes') as FormArray;

    attributes.push(createAttributeGroup(fb, { key: 'رنگ', value: 'مشکی' }));
    attributes.push(createAttributeGroup(fb, { key: 'رنگ', value: 'سفید' }));

    expect(variantAttributes(group)).toEqual({ رنگ: 'مشکی' });
  });

  it('builds one payload row with numbers and a null image', () => {
    const group = row({ sku: ' SKU-1 ', price: 300, stock: 2, attributes: { رنگ: 'مشکی' } });

    expect(toVariantInput(group)).toEqual({
      sku: 'SKU-1',
      attributes: { رنگ: 'مشکی' },
      price: 300,
      stock: 2,
      imageUrl: null,
    });
  });

  it('maps every row into the payload in form order', () => {
    const array = createVariantArray(fb);
    array.push(row({ sku: 'A', price: 10 }));
    array.push(row({ sku: 'B', price: 20 }));

    expect(variantsPayload(array).map((variant) => variant.sku)).toEqual(['A', 'B']);
  });

  it('tc 5: sums only finite, positive stock values', () => {
    const array = createVariantArray(fb);
    array.push(row({ stock: 2 }));
    array.push(row({ stock: 5 }));
    array.push(row({ stock: -1 }));
    array.at(2).get('stock')?.setValue('abc');

    expect(sumVariantStock(array)).toBe(7);
  });

  it('finds the first free duplicate SKU', () => {
    expect(nextAvailableSku('', ['A'])).toBe('');
    expect(nextAvailableSku('A', [])).toBe('A');
    expect(nextAvailableSku('A', ['A'])).toBe('A-2');
    expect(nextAvailableSku('A', ['A', 'A-2'])).toBe('A-3');
    expect(nextAvailableSku('A', ['a', 'A-2'])).toBe('A-3');
  });

  it('tc 3: a duplicate gets a free SKU but keeps the sellable values', () => {
    const source = row({
      sku: 'SONY-1',
      price: 250,
      stock: 4,
      imageUrl: '/images/sony.jpg',
      attributes: { رنگ: 'مشکی' },
    });

    const copy = duplicateVariantGroup(fb, source, ['SONY-1']);

    expect(copy.get('sku')?.value).toBe('SONY-1-2');
    expect(copy.get('price')?.value).toBe(250);
    expect(copy.get('stock')?.value).toBe(4);
    expect(copy.get('imageUrl')?.value).toBe('/images/sony.jpg');
    expect(variantAttributes(copy)).toEqual({ رنگ: 'مشکی' });
  });

  it('quotes the ceiling from one constant', () => {
    expect(MAX_VARIANTS).toBe(50);
  });
});
