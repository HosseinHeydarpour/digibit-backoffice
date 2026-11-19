import { permissionGuard } from '@core/guards/permission.guard';

import { BANNERS_ROUTES } from './banners.routes';

describe('BANNERS_ROUTES (BO-L01)', () => {
  it('declares the content permission the sidebar item carries', () => {
    expect(BANNERS_ROUTES[0].data?.['permission']).toBe('content.view');
  });

  it('guards the route', () => {
    expect(BANNERS_ROUTES[0].canActivate).toContain(permissionGuard);
  });

  it('carries a title and a breadcrumb label', () => {
    expect(BANNERS_ROUTES[0].title).toBe('بنر و محتوا');
    expect(BANNERS_ROUTES[0].data?.['breadcrumb']).toBe('بنر و محتوا');
  });
});
