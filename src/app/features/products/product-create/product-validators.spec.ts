import { FormControl } from '@angular/forms';
import type { ValidatorFn } from '@angular/forms';

import {
  SHORT_DESCRIPTION_MAX,
  fieldError,
  nonNegativeNumberValidator,
  positivePriceValidator,
  productNameValidator,
  productSlugValidator,
  shortDescriptionValidator,
} from './product-validators';

function errors(validator: ValidatorFn, value: unknown) {
  return validator(new FormControl(value));
}

describe('product validators (BO-F08)', () => {
  it('tc 1/2: name is required, trimmed, and 3–200 characters', () => {
    expect(errors(productNameValidator, '')?.['required']).toBe(true);
    expect(errors(productNameValidator, '   ')?.['required']).toBe(true);
    expect(errors(productNameValidator, 'ab')?.['minlength']).toEqual({
      requiredLength: 3,
      actualLength: 2,
    });
    expect(errors(productNameValidator, 'کیف')).toBeNull();
    expect(errors(productNameValidator, 'x'.repeat(200))).toBeNull();
    expect(errors(productNameValidator, 'x'.repeat(201))?.['maxlength']).toEqual({
      requiredLength: 200,
      actualLength: 201,
    });
  });

  it('tc 3: slug is required, lowercase ASCII, single hyphens and max 80', () => {
    expect(errors(productSlugValidator, '')?.['required']).toBe(true);
    expect(errors(productSlugValidator, 'My Slug')?.['pattern']).toBe(true);
    expect(errors(productSlugValidator, 'my--slug')?.['pattern']).toBe(true);
    expect(errors(productSlugValidator, 'my-slug-1')).toBeNull();
    expect(errors(productSlugValidator, 'x'.repeat(81))?.['maxlength']).toEqual({
      requiredLength: 80,
      actualLength: 81,
    });
  });

  it('tc 5: price is required and strictly positive', () => {
    expect(errors(positivePriceValidator, '')?.['required']).toBe(true);
    expect(errors(positivePriceValidator, 0)?.['positive']).toBe(true);
    expect(errors(positivePriceValidator, -1)?.['positive']).toBe(true);
    expect(errors(positivePriceValidator, 1)).toBeNull();
    expect(errors(positivePriceValidator, 'abc')?.['number']).toBe(true);
  });

  it('tc 6: stock accepts zero but never a negative or non-number', () => {
    expect(errors(nonNegativeNumberValidator, '')?.['required']).toBe(true);
    expect(errors(nonNegativeNumberValidator, -1)?.['negative']).toBe(true);
    expect(errors(nonNegativeNumberValidator, 0)).toBeNull();
    expect(errors(nonNegativeNumberValidator, 12)).toBeNull();
    expect(errors(nonNegativeNumberValidator, 'abc')?.['number']).toBe(true);
  });

  it('tc 9: short description counts code points and caps at 160', () => {
    expect(errors(shortDescriptionValidator, 'x'.repeat(SHORT_DESCRIPTION_MAX))).toBeNull();
    expect(
      errors(shortDescriptionValidator, 'x'.repeat(SHORT_DESCRIPTION_MAX + 1))?.['maxlength'],
    ).toEqual({
      requiredLength: SHORT_DESCRIPTION_MAX,
      actualLength: SHORT_DESCRIPTION_MAX + 1,
    });
    expect(errors(shortDescriptionValidator, '')).toBeNull();
  });

  describe('fieldError', () => {
    it('tc 9: shows nothing before the control is touched', () => {
      const control = new FormControl('', productNameValidator);

      expect(fieldError('name', control)).toBeNull();
    });

    it('maps required, pattern and positive keys to Persian messages', () => {
      const name = new FormControl('', productNameValidator);
      name.markAsTouched();
      expect(fieldError('name', name)).toContain('نام محصول');

      const slug = new FormControl('BAD SLUG', productSlugValidator);
      slug.markAsTouched();
      expect(fieldError('slug', slug)).toContain('حروف انگلیسی');

      const price = new FormControl(0, positivePriceValidator);
      price.markAsTouched();
      expect(fieldError('price', price)).toContain('بزرگ‌تر از صفر');
    });

    it('uses Persian digits in length messages', () => {
      const name = new FormControl('ab', productNameValidator);
      name.markAsTouched();

      expect(fieldError('name', name)).toContain('۳');
    });

    it('tc 7: a server message wins over the local key', () => {
      const slug = new FormControl('valid-slug', productSlugValidator);
      slug.setErrors({ server: 'این نامک قبلاً استفاده شده است.' });
      slug.markAsTouched();

      expect(fieldError('slug', slug)).toBe('این نامک قبلاً استفاده شده است.');
    });
  });
});
