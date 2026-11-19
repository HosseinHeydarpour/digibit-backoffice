import { permissionGuard } from '@core/guards/permission.guard';

import { PAGES_ROUTES } from './pages.routes';

describe('PAGES_ROUTES (BO-L08)', () => {
  it('declares the content permission', () => {
    expect(PAGES_ROUTES[0].data?.['permission']).toBe('content.view');
  });

  it('guards the route', () => {
    expect(PAGES_ROUTES[0].canActivate).toContain(permissionGuard);
  });
});
