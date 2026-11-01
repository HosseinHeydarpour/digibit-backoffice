import {
  ACCEPTED_LOGO_TYPES,
  LOGO_ACCEPT,
  LOGO_HINT,
  MAX_LOGO_SIZE,
  logoAlt,
  logoErrorMessage,
  validateLogoFile,
} from './brand-logo';

function file(name: string, type: string, size = 10): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe('brand logo rules (BO-G06)', () => {
  it('accepts exactly PNG, SVG and WebP', () => {
    expect(ACCEPTED_LOGO_TYPES).toEqual(['image/png', 'image/svg+xml', 'image/webp']);
    expect(LOGO_ACCEPT).toBe('image/png,image/svg+xml,image/webp');

    expect(validateLogoFile(file('logo.png', 'image/png'))).toBeNull();
    expect(validateLogoFile(file('logo.svg', 'image/svg+xml'))).toBeNull();
    expect(validateLogoFile(file('logo.webp', 'image/webp'))).toBeNull();
  });

  it('tc 4: refuses a PDF and says only the three formats are allowed', () => {
    const pdf = file('brand.pdf', 'application/pdf');
    const error = validateLogoFile(pdf);

    expect(error).toBe('type');
    expect(logoErrorMessage(pdf, 'type')).toContain('فقط فایل PNG، SVG یا WebP مجاز است.');
    expect(logoErrorMessage(pdf, 'type')).toContain('brand.pdf');
  });

  it('tc 5: refuses anything over 1 MB and accepts exactly 1 MB', () => {
    const atLimit = file('limit.png', 'image/png', MAX_LOGO_SIZE);
    const overLimit = file('big.png', 'image/png', MAX_LOGO_SIZE + 1);

    expect(validateLogoFile(atLimit)).toBeNull();
    expect(validateLogoFile(overLimit)).toBe('size');
    expect(logoErrorMessage(overLimit, 'size')).toContain('بیشتر از ۱ مگابایت');
    expect(logoErrorMessage(overLimit, 'size')).toContain('big.png');
  });

  it('reports type before size when a file is both wrong', () => {
    const hugePdf = file('huge.pdf', 'application/pdf', MAX_LOGO_SIZE + 1);

    expect(validateLogoFile(hugePdf)).toBe('type');
  });

  it('tc 10: the alt carries the brand name, with a usable nameless fallback', () => {
    expect(logoAlt('سامسونگ')).toBe('سامسونگ — لوگو');
    expect(logoAlt('  سامسونگ  ')).toBe('سامسونگ — لوگو');
    expect(logoAlt('')).toBe('لوگوی برند');
    expect(logoAlt('   ')).toBe('لوگوی برند');
  });

  it('keeps the hint and the limit in one source', () => {
    expect(LOGO_HINT).toContain('PNG');
    expect(LOGO_HINT).toContain('SVG');
    expect(LOGO_HINT).toContain('WebP');
    expect(LOGO_HINT).toContain('۱ مگابایت');
    expect(MAX_LOGO_SIZE).toBe(1024 * 1024);
  });
});
