import { slugify } from './slugify';

describe('slugify (shared: BO-F07, BO-F16, BO-G02)', () => {
  it('tc 8: turns the Persian example into an English slug', () => {
    expect(slugify('لپ‌تاپ ایسوس')).toBe('laptop-asus');
    expect(slugify('لپ تاپ ایسوس')).toBe('laptop-asus');
  });

  it('keeps Latin names readable', () => {
    expect(slugify('Laptop Asus')).toBe('laptop-asus');
    expect(slugify('Sony WH-1000XM5')).toBe('sony-wh-1000xm5');
  });

  it('normalises Arabic/Persian variants and diacritics', () => {
    expect(slugify('كيـف چرم')).toBe('bag-leather');
    expect(slugify('هدفون')).toBe('headphone');
  });

  it('collapses spaces, punctuation and repeated dashes', () => {
    expect(slugify('  کیف   دست‌دوز  ')).toBe('bag-dastdoz');
    expect(slugify('---')).toBe('');
  });

  it('returns an empty string for an empty name', () => {
    expect(slugify('')).toBe('');
    expect(slugify('   ')).toBe('');
  });

  it('caps the result at 80 characters and never leaves a trailing dash', () => {
    const slug = slugify('a'.repeat(100));

    expect(slug).toHaveLength(80);
    expect(slug.endsWith('-')).toBe(false);
  });
});
