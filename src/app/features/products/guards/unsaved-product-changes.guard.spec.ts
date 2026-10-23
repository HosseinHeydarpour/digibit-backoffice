import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ConfirmService } from '@core/services/confirm';

import { unsavedProductChangesGuard } from './unsaved-product-changes.guard';
import type { HasUnsavedChanges } from './unsaved-product-changes.guard';

class ConfirmStub {
  confirmed = true;

  calls = 0;

  confirm(): Promise<boolean> {
    this.calls += 1;
    return Promise.resolve(this.confirmed);
  }
}

describe('unsavedProductChangesGuard (BO-F07 tc 7)', () => {
  let confirm: ConfirmStub;

  beforeEach(() => {
    confirm = new ConfirmStub();

    TestBed.configureTestingModule({
      providers: [{ provide: ConfirmService, useValue: confirm }],
    });
  });

  function run(component: HasUnsavedChanges): Promise<boolean> | boolean {
    return TestBed.runInInjectionContext(() =>
      unsavedProductChangesGuard(
        component,
        {} as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
        {} as RouterStateSnapshot,
      ),
    ) as Promise<boolean> | boolean;
  }

  it('lets a pristine form leave without asking', async () => {
    expect(await run({ hasUnsavedChanges: () => false })).toBe(true);
    expect(confirm.calls).toBe(0);
  });

  it('asks before leaving a dirty form', async () => {
    expect(await run({ hasUnsavedChanges: () => true })).toBe(true);
    expect(confirm.calls).toBe(1);
  });

  it('keeps the page when the user chooses to stay', async () => {
    confirm.confirmed = false;

    expect(await run({ hasUnsavedChanges: () => true })).toBe(false);
    expect(confirm.calls).toBe(1);
  });
});
