// src/app/features/products/guards/unsaved-product-changes.guard.ts
//
// BO-F07 tc 7: leaving a dirty product form must ask first.
//
// A `CanDeactivateFn` is the only hook that covers EVERY in-app exit — the
// back link, the sidebar, the browser's Back button — with one answer. A
// `beforeunload` listener (which the component also has) cannot see a router
// navigation, and a `(click)` on the back link only covers one button.
//
// The guard depends on the small `HasUnsavedChanges` interface instead of the
// concrete `ProductCreate` class, so BO-F14 can reuse it on the edit page
// without importing this feature's component.

import { inject } from '@angular/core';
import type { CanDeactivateFn } from '@angular/router';
import { ConfirmService } from '@core/services/confirm';

/** Implemented by any page that can be left with unsaved edits. */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

export const unsavedProductChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component?.hasUnsavedChanges?.()) {
    return true;
  }

  return inject(ConfirmService).confirm({
    message: 'تغییرات ذخیره‌نشده از دست می‌رود. از فرم خارج می‌شوید؟',
    header: 'خروج از فرم',
    acceptLabel: 'خروج',
    rejectLabel: 'ماندن',
    danger: true,
  });
};
