import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { PERMISSIONS } from '@core/auth/permissions.token';
import { ConfirmService } from '@core/services/confirm';
import { ToastService } from '@core/services/toast';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { ErrorState } from '@shared/components/error-state/error-state';
import { PageHeader } from '@shared/components/page-header/page-header';
import type { EntityId } from '@shared/models';
import { isOnline, OFFLINE_MESSAGE } from '@shared/utils/connectivity';
import { ButtonDirective } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { BehaviorSubject, catchError, of, switchMap, tap } from 'rxjs';

import type { ShippingMethod } from '../models/shipping-method.model';
import { ShippingService } from '../services/shipping.service';
import { deliveryWindow, freeFromLabel, shippingCostLabel } from '../shipping-display';
import { ShippingForm } from '../shipping-form/shipping-form';

type ShippingView = 'loading' | 'error' | 'empty' | 'data';

/**
 * Shipping methods list — `/shipping` (BO-K01).
 *
 * A shop has a handful of methods, so there is no paging: one ordered list,
 * one create/edit dialog and the invariants the checkout depends on (a default
 * exists, at least one method is active, a used method is never erased).
 *
 * TRACE — disabling «تیپاکس» (the default):
 *   1. The switch flips visually, then `toggleStatus` reads `isDefault`.
 *   2. It writes the old value back and toasts that another default is needed
 *      before the switch can go off; no request is sent.
 *   3. On a non-default row the override paints the pill at once and
 *      `PATCH …/status` follows; a failure clears the override.
 */
@Component({
  selector: 'app-shipping-list',
  imports: [
    PageHeader,
    FormsModule,
    ButtonDirective,
    Dialog,
    ShippingForm,
    ToggleSwitch,
    ErrorState,
    EmptyState,
  ],
  templateUrl: './shipping-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShippingList {
  private readonly shipping = inject(ShippingService);

  private readonly toast = inject(ToastService);

  private readonly confirm = inject(ConfirmService);

  private readonly permissions = inject(PERMISSIONS);

  private readonly reload$ = new BehaviorSubject<void>(undefined);

  readonly listError = signal<string | null>(null);

  readonly isFetching = signal(false);

  readonly dialogOpen = signal(false);

  readonly editing = signal<ShippingMethod | null>(null);

  /** `taskId`-style overlay: id → isActive, cleared when the server agrees. */
  private readonly statusOverrides = signal<ReadonlyMap<EntityId, boolean>>(new Map());

  private readonly removedIds = signal<ReadonlySet<EntityId>>(new Set());

  readonly canManage = computed(() => this.permissions().includes('shipping.manage'));

  readonly result = toSignal<ShippingMethod[] | null>(
    this.reload$.pipe(
      tap(() => {
        this.listError.set(null);
        this.isFetching.set(true);
      }),
      switchMap(() =>
        this.shipping.list().pipe(
          tap({
            next: () => {
              this.listError.set(null);
              this.isFetching.set(false);
              this.reconcile();
            },
            error: () => {
              this.listError.set('دریافت روش‌های ارسال ناموفق بود');
              this.isFetching.set(false);
            },
          }),
          catchError(() => of(null)),
        ),
      ),
    ),
    { initialValue: null },
  );

  readonly methods = computed<readonly ShippingMethod[] | null>(() => {
    const rows = this.result();

    if (rows === null) {
      return null;
    }

    const overrides = this.statusOverrides();
    const removed = this.removedIds();

    return rows
      .filter((method) => !removed.has(method.id))
      .map((method) => {
        const isActive = overrides.get(method.id);

        return isActive === undefined || isActive === method.isActive
          ? method
          : { ...method, isActive };
      });
  });

  readonly viewState = computed<ShippingView>(() => {
    if (this.listError()) {
      return 'error';
    }

    const rows = this.methods();

    if (rows === null) {
      return 'loading';
    }

    return rows.length === 0 ? 'empty' : 'data';
  });

  costLabel(method: ShippingMethod): string {
    return shippingCostLabel(method);
  }

  freeFrom(method: ShippingMethod): string {
    return freeFromLabel(method.freeFrom);
  }

  windowLabel(method: ShippingMethod): string {
    return deliveryWindow(method);
  }

  /** The default switch cannot go off; a warning explains why (K03 tc 2). */
  async toggleStatus(method: ShippingMethod, toggle: ToggleSwitch): Promise<void> {
    if (!this.canManage()) {
      return;
    }

    const next = !method.isActive;

    if (!next && method.isDefault) {
      toggle.writeValue(true);
      this.toast.warning('روش پیش‌فرض را نمی‌توان غیرفعال کرد؛ اول روش دیگری را پیش‌فرض کن.');
      return;
    }

    if (!next && this.methods()?.filter((item) => item.isActive).length === 1) {
      toggle.writeValue(true);
      this.toast.warning('حداقل یک روش ارسال فعال باید بماند.');
      return;
    }

    if (!isOnline()) {
      toggle.writeValue(method.isActive);
      this.toast.warning(OFFLINE_MESSAGE);
      return;
    }

    this.setOverride(method.id, next);

    this.shipping.setStatus(method.id, next).subscribe({
      next: () => this.toast.success(next ? 'روش ارسال فعال شد.' : 'روش ارسال غیرفعال شد.'),
      error: () => this.clearOverride(method.id),
    });
  }

  /** «پیش‌فرض کن» on a non-default row (K05). */
  setDefault(method: ShippingMethod): void {
    if (!this.canManage() || method.isDefault) {
      return;
    }

    this.shipping.setDefault(method.id).subscribe({
      next: () => {
        this.toast.success(`«${method.name}» پیش‌فرض شد.`);
        this.reload$.next();
      },
    });
  }

  /** Delete: a used method is switched off, a default one is refused. */
  async removeMethod(method: ShippingMethod): Promise<void> {
    if (!this.canManage()) {
      return;
    }

    if (method.isDefault) {
      this.toast.warning('روش پیش‌فرض را نمی‌توان حذف کرد؛ اول روش دیگری را پیش‌فرض کن.');
      return;
    }

    const confirmed = await this.confirm.confirm({
      message: `آیا از حذف روش ارسال «${method.name}» مطمئن هستی؟ اگر در سفارشی استفاده شده باشد، فقط غیرفعال می‌شود.`,
      header: 'حذف روش ارسال',
      acceptLabel: 'حذف',
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    this.removedIds.update((ids) => new Set(ids).add(method.id));

    this.shipping.remove(method.id).subscribe({
      next: (result) => {
        if (result.deleted) {
          this.toast.success('روش ارسال حذف شد.');
          this.reload$.next();
          return;
        }

        this.removedIds.update((ids) => {
          const next = new Set(ids);
          next.delete(method.id);

          return next;
        });
        this.setOverride(method.id, false);
        this.toast.success('این روش در سفارش‌ها استفاده شده و غیرفعال شد.');
      },
      error: () => {
        this.removedIds.update((ids) => {
          const next = new Set(ids);
          next.delete(method.id);

          return next;
        });
      },
    });
  }

  openCreate(): void {
    if (!this.canManage()) {
      return;
    }

    this.editing.set(null);
    this.dialogOpen.set(true);
  }

  openEdit(method: ShippingMethod): void {
    if (!this.canManage()) {
      return;
    }

    this.editing.set(method);
    this.dialogOpen.set(true);
  }

  onDialogVisibility(visible: boolean): void {
    this.dialogOpen.set(visible);

    if (!visible) {
      this.editing.set(null);
    }
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
    this.editing.set(null);
  }

  onSaved(method: ShippingMethod): void {
    this.toast.success(this.editing() ? 'روش ارسال ذخیره شد.' : `«${method.name}» اضافه شد.`);
    this.closeDialog();
    this.reload$.next();
  }

  retry(): void {
    this.reload$.next();
  }

  private setOverride(id: EntityId, isActive: boolean): void {
    this.statusOverrides.update((current) => new Map(current).set(id, isActive));
  }

  private clearOverride(id: EntityId): void {
    this.statusOverrides.update((current) => {
      const next = new Map(current);
      next.delete(id);

      return next;
    });
  }

  /** Drop overlays once the server's rows agree with them. */
  private reconcile(): void {
    const overrides = this.statusOverrides();
    const removed = this.removedIds();

    if (overrides.size === 0 && removed.size === 0) {
      // The first emission runs while `result` is still being assigned; there
      // is nothing to reconcile yet.
      return;
    }

    const rows = this.result() ?? [];
    const present = new Set(rows.map((method) => method.id));

    if (overrides.size > 0) {
      const next = new Map(overrides);

      for (const method of rows) {
        if (next.get(method.id) === method.isActive) {
          next.delete(method.id);
        }
      }

      if (next.size !== overrides.size) {
        this.statusOverrides.set(next);
      }
    }

    if (removed.size > 0) {
      const next = new Set([...removed].filter((id) => present.has(id)));

      if (next.size !== removed.size) {
        this.removedIds.set(next);
      }
    }
  }
}
