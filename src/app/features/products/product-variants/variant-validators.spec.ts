import { FormBuilder, FormControl } from '@angular/forms';
import type { FormArray } from '@angular/forms';

import { createAttributeGroup, createVariantArray, createVariantGroup } from './variant-form';
import {
  VARIANT_ATTRIBUTE_KEY_MAX,
  VARIANT_SKU_MAX,
  atLeastOneVariantValidator,
  attributeError,
  attributePairValidator,
  syncVariantErrors,
  variantImageError,
  variantImageUrlValidator,
  variantPriceError,
  variantPriceValidator,
  variantSkuError,
  variantSkuValidator,
  variantStockError,
  variantStockValidator,
  variantsRequiredError,
} from './variant-validators';

describe('variant validators (BO-F10)', () => {
  const fb = new FormBuilder();

  function variant(sku = '', price = 100, stock = 0) {
    return createVariantGroup(fb, { basePrice: price, seed: { sku, price, stock } });
  }

  describe('SKU', () => {
    it('tc 3/11: an empty or whitespace-only SKU is required', () => {
      expect(variantSkuValidator(new FormControl(''))).toEqual({ required: true });
      expect(variantSkuValidator(new FormControl('   '))).toEqual({ required: true });
    });

    it('accepts Latin letters, digits, dot, underscore and hyphen', () => {
      expect(variantSkuValidator(new FormControl('SONY.WH_1000-BLK'))).toBeNull();
      expect(variantSkuValidator(new FormControl('  SONY-1  '))).toBeNull();
    });

    it('rejects spaces, Persian letters and other punctuation', () => {
      expect(variantSkuValidator(new FormControl('SONY 1'))).toEqual({ pattern: true });
      expect(variantSkuValidator(new FormControl('کد-۱'))).toEqual({ pattern: true });
      expect(variantSkuValidator(new FormControl('SKU#1'))).toEqual({ pattern: true });
    });

    it('caps the SKU at the documented length', () => {
      expect(variantSkuValidator(new FormControl('A'.repeat(VARIANT_SKU_MAX)))).toBeNull();
      expect(variantSkuValidator(new FormControl('A'.repeat(VARIANT_SKU_MAX + 1)))).toEqual({
        maxlength: { requiredLength: VARIANT_SKU_MAX, actualLength: VARIANT_SKU_MAX + 1 },
      });
    });
  });

  describe('price and stock', () => {
    it('tc 4: price is required and strictly positive', () => {
      expect(variantPriceValidator(new FormControl(''))).toEqual({ required: true });
      expect(variantPriceValidator(new FormControl(null))).toEqual({ required: true });
      expect(variantPriceValidator(new FormControl(0))).toEqual({ positive: true });
      expect(variantPriceValidator(new FormControl(-1))).toEqual({ positive: true });
      expect(variantPriceValidator(new FormControl(250_000))).toBeNull();
    });

    it('tc 5: stock accepts zero, rejects negatives and fractions', () => {
      expect(variantStockValidator(new FormControl(0))).toBeNull();
      expect(variantStockValidator(new FormControl(-1))).toEqual({ negative: true });
      expect(variantStockValidator(new FormControl(1.5))).toEqual({ integer: true });
      expect(variantStockValidator(new FormControl(''))).toEqual({ required: true });
    });
  });

  describe('image URL', () => {
    it('is optional', () => {
      expect(variantImageUrlValidator(new FormControl(''))).toBeNull();
    });

    it('accepts http(s) and absolute paths, rejects a script URL', () => {
      expect(variantImageUrlValidator(new FormControl('https://cdn.test/a.jpg'))).toBeNull();
      expect(variantImageUrlValidator(new FormControl('/images/a.jpg'))).toBeNull();
      expect(variantImageUrlValidator(new FormControl('javascript:alert(1)'))).toEqual({
        pattern: true,
      });
    });
  });

  describe('attribute pairs', () => {
    it('allows both halves empty', () => {
      expect(attributePairValidator(createAttributeGroup(fb))).toBeNull();
    });

    it('requires the missing half', () => {
      expect(attributePairValidator(createAttributeGroup(fb, { key: 'رنگ' }))).toEqual({
        valueRequired: true,
      });
      expect(attributePairValidator(createAttributeGroup(fb, { value: 'مشکی' }))).toEqual({
        keyRequired: true,
      });
    });

    it('caps the key and value lengths', () => {
      const longKey = createAttributeGroup(fb, { key: 'ک'.repeat(VARIANT_ATTRIBUTE_KEY_MAX + 1) });
      const longValue = createAttributeGroup(fb, { key: 'رنگ', value: 'م'.repeat(60) });

      expect(longKey.get('key')?.hasError('maxlength')).toBe(true);
      expect(longValue.get('value')?.hasError('maxlength')).toBe(true);
    });
  });

  describe('cross-row checks', () => {
    it('tc 6: at least one variant is required', () => {
      const array = createVariantArray(fb);

      expect(atLeastOneVariantValidator(array)).toEqual({ requiredVariants: true });

      array.push(variant('A'));

      expect(atLeastOneVariantValidator(array)).toBeNull();
    });

    it('tc 3: flags every colliding SKU, case-insensitively, then clears it', () => {
      const array = createVariantArray(fb);
      array.push(variant('ABC-1'));
      array.push(variant('abc-1'));

      syncVariantErrors(array);

      const first = array.at(0).get('sku');
      const second = array.at(1).get('sku');

      expect(first?.hasError('duplicateSku')).toBe(true);
      expect(second?.hasError('duplicateSku')).toBe(true);

      second?.setValue('ABC-2');
      syncVariantErrors(array);

      expect(first?.hasError('duplicateSku')).toBe(false);
      expect(second?.hasError('duplicateSku')).toBe(false);
    });

    it('tc 3: a blank SKU never counts as a duplicate', () => {
      const array = createVariantArray(fb);
      array.push(variant());
      array.push(variant());

      syncVariantErrors(array);

      expect(array.at(0).get('sku')?.hasError('duplicateSku')).toBe(false);
      expect(array.at(1).get('sku')?.hasError('duplicateSku')).toBe(false);
    });

    it('tc 12: a repeated attribute key is flagged on both pairs', () => {
      const array = createVariantArray(fb);
      const group = variant('A');
      array.push(group);

      const attributes = group.get('attributes') as FormArray;
      attributes.push(createAttributeGroup(fb, { key: 'رنگ', value: 'مشکی' }));
      attributes.push(createAttributeGroup(fb, { key: 'رنگ', value: 'سفید' }));

      syncVariantErrors(array);

      expect(attributes.at(0).get('key')?.hasError('duplicateKey')).toBe(true);
      expect(attributes.at(1).get('key')?.hasError('duplicateKey')).toBe(true);
    });
  });

  describe('message visibility', () => {
    it('tc 3: a duplicate SKU is visible before the field is touched', () => {
      const sku = new FormControl('A');
      sku.setErrors({ duplicateSku: true });

      expect(variantSkuError(sku)).toContain('ردیف دیگری');
    });

    it('hides local errors until touched, then shows the typed sentence', () => {
      const sku = new FormControl('', variantSkuValidator);

      expect(variantSkuError(sku)).toBeNull();

      sku.markAsTouched();

      expect(variantSkuError(sku)).toContain('الزامی');
    });

    it('prefers a server message over the local key', () => {
      const sku = new FormControl('A', variantSkuValidator);
      sku.markAsTouched();
      sku.setErrors({ server: 'این SKU قبلاً ثبت شده است.' });

      expect(variantSkuError(sku)).toBe('این SKU قبلاً ثبت شده است.');
    });

    it('renders the price/stock/image sentences after touch', () => {
      const price = new FormControl(0, variantPriceValidator);
      const stock = new FormControl(-1, variantStockValidator);
      const image = new FormControl('bad url', variantImageUrlValidator);

      expect(variantPriceError(price)).toBeNull();
      expect(variantStockError(stock)).toBeNull();
      expect(variantImageError(image)).toBeNull();

      price.markAsTouched();
      stock.markAsTouched();
      image.markAsTouched();

      expect(variantPriceError(price)).toContain('بزرگ‌تر از صفر');
      expect(variantStockError(stock)).toContain('منفی');
      expect(variantImageError(image)).toContain('http');
    });

    it('explains a half-written attribute pair after touch', () => {
      const pair = createAttributeGroup(fb, { key: 'رنگ' });
      pair.markAsTouched();

      expect(attributeError(pair)).toContain('مقدار ویژگی');
    });

    it('tc 6: the list message waits for the array to be touched', () => {
      const array = createVariantArray(fb);

      expect(variantsRequiredError(array)).toBeNull();

      array.markAsTouched();

      expect(variantsRequiredError(array)).toContain('حداقل یک واریانت');
    });
  });
});
