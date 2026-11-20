import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { PERMISSIONS } from '@core/auth/permissions.token';
import { ConfirmService } from '@core/services/confirm';
import { ToastService } from '@core/services/toast';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { ErrorState } from '@shared/components/error-state/error-state';
import { PageHeader } from '@shared/components/page-header/page-header';
import type { BannerPosition, EntityId, SelectOption } from '@shared/models';
import { AssetUrlPipe } from '@shared/pipes/asset-url.pipe';
import { PersianDatePipe } from '@shared/pipes/persian-date.pipe';
import { PersianDigitsPipe } from '@shared/pipes/persian-digits.pipe';
import { isOnline, OFFLINE_MESSAGE } from '@shared/utils/connectivity';
import { ButtonDirective } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { BehaviorSubject, catchError, of, switchMap, tap } from 'rxjs';

import { BannerForm } from '../banner-form/banner-form';
import {
  bannerPositionLabel,
  bannerSchedule,
  bannerScheduleBadgeClass,
  bannerScheduleLabel,
} from '../banner-labels';
import type { Banner } from '../models/banner.model';
import { BannersService } from '../services/banners.service';

type BannersView = 'loading' | 'error' | 'empty' | 'data';

/** A position and its banners in display order. */
export interface BannerGroup {
  readonly position: BannerPosition;
  readonly items: readonly Banner[];
}

/**
 * Banners list — `/banners` (BO-L01..L07).
 *
 * The grid is GROUPED BY POSITION: order is per slot, so a flat list of eight
 * cards cannot answer "what is first in the header?". Each group is a CDK drop
 * list (the desktop gesture) with up/down buttons inside every card (the phone
 * and keyboard fallback); a drop sends ONE batch `PATCH /banners/order`.
 *
 * TRACE — moving the third header banner above the first:
 *   1. The drop handler swaps the group's items and paints the new order.
 *   2. `reorder({ position: 'home-top', ids: [...] })` sends the whole slot.
 *   3. Success refetches (the server's order wins); failure clears the overlay
 *      and the cards return to the previous order.
 */
@Component({
  selector: 'app-banner-list',
  imports: [
    PageHeader,
    FormsModule,
    Select,
    DragDropModule,
    ButtonDirective,
    Dialog,
    BannerForm,
    ToggleSwitch,
    PersianDatePipe,
    PersianDigitsPipe,
    AssetUrlPipe,
    ErrorState,
    EmptyState,
  ],
  templateUrl: './banner-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannerList {
  private readonly banners = inject(BannersService);

  private readonly toast = inject(ToastService);

  private readonly confirm = inject(ConfirmService);

  private readonly permissions = inject(PERMISSIONS);

  private readonly reload$ = new BehaviorSubject<void>(undefined);

  readonly listError = signal<string | null>(null);

  readonly isFetching = signal(false);

  /** `''` is «همه» — the explicit option, not `showClear`'s null. */
  readonly position = signal<BannerPosition | ''>('');

  readonly dialogOpen = signal(false);

  readonly editing = signal<Banner | null>(null);

  private readonly brokenImages = signal<ReadonlySet<EntityId>>(new Set());

  private readonly statusOverrides = signal<ReadonlyMap<EntityId, boolean>>(new Map());

  private readonly removedIds = signal<ReadonlySet<EntityId>>(new Set());

  /** id → ids array per position, painted until the server's answer arrives. */
  private readonly orderOverrides = signal<ReadonlyMap<BannerPosition, readonly EntityId[]>>(
    new Map(),
  );

  readonly canManage = computed(() => this.permissions().includes('content.manage'));

  readonly result = toSignal<readonly Banner[] | null>(
    this.reload$.pipe(
      tap(() => {
        this.listError.set(null);
        this.isFetching.set(true);
      }),
      switchMap(() =>
        this.banners.list().pipe(
          tap({
            next: () => {
              this.listError.set(null);
              this.isFetching.set(false);
              this.statusOverrides.set(new Map());
              this.removedIds.set(new Set());
              this.orderOverrides.set(new Map());
            },
            error: () => {
              this.listError.set('دریافت بنرها ناموفق بود');
              this.isFetching.set(false);
            },
          }),
          catchError(() => of(null)),
        ),
      ),
    ),
    { initialValue: null },
  );

  /** Positions in render order, filtered by the select, empty groups dropped. */
  readonly groups = computed<readonly BannerGroup[]>(() => {
    const list = this.result();

    if (list === null) {
      return [];
    }

    const filter = this.position();
    const status = this.statusOverrides();
    const removed = this.removedIds();
    const overrides = this.orderOverrides();

    const apply = (banner: Banner): Banner => {
      const isActive = status.get(banner.id);

      return isActive === undefined || isActive === banner.isActive
        ? banner
        : { ...banner, isActive };
    };

    const positions: BannerPosition[] =
      filter === '' ? ['home-top', 'home-middle', 'sidebar'] : [filter];

    return positions
      .map((position) => {
        const rows = list
          .filter((banner) => banner.position === position && !removed.has(banner.id))
          .map(apply);
        const order = overrides.get(position);
        const sorted =
          order === undefined
            ? [...rows].sort((a, b) => a.order - b.order)
            : [...rows].sort((a, b) => {
                const aIndex = order.indexOf(a.id);
                const bIndex = order.indexOf(b.id);

                return (
                  (aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex) -
                  (bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex)
                );
              });

        return { position, items: sorted };
      })
      .filter((group) => group.items.length > 0);
  });

  /** Total rows in the current projection; `0` on an empty shop. */
  readonly visibleCount = computed(() =>
    this.groups().reduce((sum, group) => sum + group.items.length, 0),
  );

  readonly viewState = computed<BannersView>(() => {
    if (this.listError()) {
      return 'error';
    }

    if (this.result() === null) {
      return 'loading';
    }

    return this.visibleCount() === 0 ? 'empty' : 'data';
  });

  readonly hasFilter = computed(() => this.position() !== '');

  get positionOptions(): SelectOption<BannerPosition | ''>[] {
    return [
      { label: 'همه', value: '' },
      { label: 'هدر', value: 'home-top' },
      { label: 'اسلایدر', value: 'home-middle' },
      { label: 'کناری', value: 'sidebar' },
    ];
  }

  positionLabel(position: BannerPosition): string {
    return bannerPositionLabel(position);
  }

  scheduleLabel(banner: Banner): string {
    return bannerScheduleLabel(bannerSchedule(banner));
  }

  scheduleBadgeClass(banner: Banner): string {
    return bannerScheduleBadgeClass(bannerSchedule(banner));
  }

  onPositionChange(position: BannerPosition | ''): void {
    this.position.set(position);
  }

  clearFilter(): void {
    this.position.set('');
  }

  onImageError(id: EntityId): void {
    this.brokenImages.update((current) => new Set(current).add(id));
  }

  isBroken(id: EntityId): boolean {
    return this.brokenImages().has(id);
  }

  /** Activating a banner without an image is refused before a request. */
  async toggleStatus(banner: Banner, toggle: ToggleSwitch): Promise<void> {
    if (!this.canManage()) {
      return;
    }

    const next = !banner.isActive;

    if (next && banner.imageUrl === '') {
      toggle.writeValue(false);
      this.toast.warning('بنر بدون تصویر را نمی‌توان فعال کرد؛ اول تصویر را بارگذاری کن.');
      return;
    }

    if (!isOnline()) {
      toggle.writeValue(banner.isActive);
      this.toast.warning(OFFLINE_MESSAGE);
      return;
    }

    this.setStatusOverride(banner.id, next);

    this.banners.setStatus(banner.id, next).subscribe({
      next: () => this.toast.success(next ? 'بنر فعال شد.' : 'بنر غیرفعال شد.'),
      error: () => this.clearStatusOverride(banner.id),
    });
  }

  async removeBanner(banner: Banner): Promise<void> {
    if (!this.canManage()) {
      return;
    }

    const confirmed = await this.confirm.confirm({
      message: `آیا از حذف بنر «${banner.title}» مطمئن هستی؟ تصویر مرتبط هم از سرور حذف می‌شود.`,
      header: 'حذف بنر',
      acceptLabel: 'حذف',
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    this.removedIds.update((ids) => new Set(ids).add(banner.id));

    this.banners.remove(banner.id).subscribe({
      next: () => {
        this.toast.success('بنر حذف شد.');
        this.reload$.next();
      },
      error: () => {
        this.removedIds.update((ids) => {
          const next = new Set(ids);
          next.delete(banner.id);

          return next;
        });
      },
    });
  }

  /** Up/down fallback (phone and keyboard). Disabled at the group's edges. */
  move(banner: Banner, group: BannerGroup, delta: -1 | 1): void {
    if (!this.canManage()) {
      return;
    }

    const index = group.items.findIndex((item) => item.id === banner.id);
    const target = index + delta;

    if (index < 0 || target < 0 || target >= group.items.length) {
      return;
    }

    const ids = group.items.map((item) => item.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];

    this.applyOrder(group.position, ids);
  }

  /** CDK drop: the new order of one position, saved in one request. */
  drop(event: CdkDragDrop<readonly Banner[]>, group: BannerGroup): void {
    if (!this.canManage() || event.previousIndex === event.currentIndex) {
      return;
    }

    const items = [...group.items];
    moveItemInArray(items, event.previousIndex, event.currentIndex);

    this.applyOrder(
      group.position,
      items.map((item) => item.id),
    );
  }

  openCreate(): void {
    if (!this.canManage()) {
      return;
    }

    this.editing.set(null);
    this.dialogOpen.set(true);
  }

  openEdit(banner: Banner): void {
    if (!this.canManage()) {
      return;
    }

    this.editing.set(banner);
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

  onSaved(banner: Banner): void {
    this.toast.success(this.editing() ? 'بنر ذخیره شد.' : `بنر «${banner.title}» اضافه شد.`);
    this.closeDialog();
    this.reload$.next();
  }

  retry(): void {
    this.reload$.next();
  }

  private applyOrder(position: BannerPosition, ids: readonly EntityId[]): void {
    this.orderOverrides.update((current) => new Map(current).set(position, ids));

    this.banners.reorder({ position, ids }).subscribe({
      next: () => {
        this.toast.success('ترتیب بنرها ذخیره شد.');
        this.reload$.next();
      },
      error: () => {
        this.orderOverrides.update((current) => {
          const next = new Map(current);
          next.delete(position);

          return next;
        });
      },
    });
  }

  private setStatusOverride(id: EntityId, isActive: boolean): void {
    this.statusOverrides.update((current) => new Map(current).set(id, isActive));
  }

  private clearStatusOverride(id: EntityId): void {
    this.statusOverrides.update((current) => {
      const next = new Map(current);
      next.delete(id);

      return next;
    });
  }
}
