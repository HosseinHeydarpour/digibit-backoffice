import { environment } from '@env/environment';

import { assetOrigin, resolveAssetUrl } from './asset-url.pipe';

const ORIGIN = new URL(environment.API_BASE_URL).origin;

describe('resolveAssetUrl', () => {
  it('prefixes a server-relative path with the API origin', () => {
    expect(resolveAssetUrl('/media/banner.jpg')).toBe(`${ORIGIN}/media/banner.jpg`);
    expect(resolveAssetUrl('/assets/images/advert/banner-1.jpg')).toBe(
      `${ORIGIN}/assets/images/advert/banner-1.jpg`,
    );
  });

  it('keeps a same-origin API base relative', () => {
    expect(assetOrigin('/api/v1')).toBe('');
    expect(assetOrigin('https://api.test/v1')).toBe('https://api.test');
  });

  it('leaves absolute, blob and empty values alone', () => {
    expect(resolveAssetUrl('https://cdn.test/banner.jpg')).toBe('https://cdn.test/banner.jpg');
    expect(resolveAssetUrl('blob:http://localhost/1')).toBe('blob:http://localhost/1');
    expect(resolveAssetUrl('')).toBe('');
    expect(resolveAssetUrl(null)).toBe('');
  });
});
