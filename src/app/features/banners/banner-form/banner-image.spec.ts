import { FormControl, FormGroup } from '@angular/forms';

import { bannerAspectLabel, bannerAspectClass, validateBannerImage } from './banner-image';
import {
  bannerDateRangeValidator,
  bannerLinkValidator,
  bannerTitleValidator,
} from './banner-validators';

function linkGroup(mode: 'internal' | 'external', internal: string, external: string): FormGroup {
  const group = new FormGroup({
    mode: new FormControl(mode),
    internalLink: new FormControl(internal),
    externalLink: new FormControl(external),
  });

  group.addValidators(bannerLinkValidator);
  group.updateValueAndValidity({ emitEvent: false });

  return group;
}

function dateGroup(from: string | null, to: string | null): FormGroup {
  const group = new FormGroup({
    from: new FormControl(from),
    to: new FormControl(to),
  });

  group.addValidators(bannerDateRangeValidator);
  group.updateValueAndValidity({ emitEvent: false });

  return group;
}

describe('banner image + validators (BO-L02/L03/L05)', () => {
  it('accepts PNG/JPEG/WebP under 2 MB and refuses the rest', () => {
    expect(validateBannerImage(new File(['x'], 'a.png', { type: 'image/png' }))).toBeNull();
    expect(validateBannerImage(new File(['x'], 'a.pdf', { type: 'application/pdf' }))).toContain(
      'PNG',
    );

    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.png', {
      type: 'image/png',
    });
    expect(validateBannerImage(big)).toContain('۲ مگابایت');
  });

  it('suggests the aspect ratio of each position', () => {
    expect(bannerAspectClass('home-top')).toContain('16/4');
    expect(bannerAspectClass('home-middle')).toContain('16/6');
    expect(bannerAspectClass('sidebar')).toContain('square');
    expect(bannerAspectLabel('sidebar')).toContain('۱:۱');
  });

  it('rejects a short or long title', () => {
    expect(bannerTitleValidator(new FormControl(''))).toBeNull();
    expect(bannerTitleValidator(new FormControl('بنر'))).toBeNull();
    expect(bannerTitleValidator(new FormControl('ب'))).toEqual({ titleShort: true });
    expect(bannerTitleValidator(new FormControl('x'.repeat(61)))).toEqual({ titleLong: true });
  });

  it('validates only the active link field', () => {
    expect(linkGroup('internal', '/products', '').controls['internalLink'].errors).toBeNull();
    expect(linkGroup('internal', 'products', '').controls['internalLink'].errors).toEqual({
      link: true,
    });
    expect(linkGroup('external', '', 'example.com').controls['externalLink'].errors).toEqual({
      link: true,
    });
    expect(linkGroup('external', '', 'https://x.com').controls['externalLink'].errors).toBeNull();
  });

  it('rejects an end date before the start date', () => {
    expect(dateGroup('2026-02-01', '2026-01-01').controls['to'].errors).toEqual({
      afterFrom: true,
    });
    expect(dateGroup('2026-01-01', '2026-02-01').controls['to'].errors).toBeNull();
  });
});
