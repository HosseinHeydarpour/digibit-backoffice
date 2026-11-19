import { permissionGuard } from '@core/guards/permission.guard';
import { unsavedChangesGuard } from '@core/guards/unsaved-changes.guard';

import { SETTINGS_ROUTES } from './settings.routes';

describe('SETTINGS_ROUTES (BO-M07)', () => {
  it('declares settings.write, the grant the sidebar item carries', () => {
    expect(SETTINGS_ROUTES[0].data?.['permission']).toBe('settings.write');
  });

  it('guards the route and asks before leaving unsaved edits', () => {
    expect(SETTINGS_ROUTES[0].canActivate).toContain(permissionGuard);
    expect(SETTINGS_ROUTES[0].canDeactivate).toContain(unsavedChangesGuard);
  });
});
