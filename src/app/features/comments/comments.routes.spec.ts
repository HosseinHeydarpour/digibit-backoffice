import { permissionGuard } from '@core/guards/permission.guard';

import { COMMENTS_ROUTES } from './comments.routes';

describe('COMMENTS_ROUTES (BO-N01)', () => {
  it('declares comments.view and guards the route', () => {
    expect(COMMENTS_ROUTES[0].data?.['permission']).toBe('comments.view');
    expect(COMMENTS_ROUTES[0].canActivate).toContain(permissionGuard);
  });
});
