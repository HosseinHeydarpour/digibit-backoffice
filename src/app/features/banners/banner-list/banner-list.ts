import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { ErrorState } from '@shared/components/error-state/error-state';
import { PageHeader } from '@shared/components/page-header/page-header';
import type { EntityId, SelectOption } from '@shared/models';
import { PersianDatePipe } from '@shared/pipes/persian-date.pipe';
import { PersianDigitsPipe } from '@shared/pipes/persian-digits.pipe';
import { Select } from 'primeng/select';
import { BehaviorSubject, catchError, of, switchMap, tap } from 'rxjs';

import { bannerPositionLabel } from '../banner-labels';
import type { Banner, BannerPosition } from '../models/banner.model';
import { BannersService } from '../services/banners.service';

type BannersView = 'loading' | 'error' | 'empty' | 'data';

/**
 * Banners list — `/banners` (BO-L01).
 *
 * A card grid, not a table: a banner is an image, and a row of numbers hides
 * the one thing the editor needs to see. Each card shows the image (or an
 * honest placeholder when the URL is broken), the position, its order in that
 * slot, the display window in Jalali and the on/off state.
 *
 * TRACE — filtering by «کناری»:
 *   1. `onPositionChange('sidebar')` writes the signal; no request is sent.
 *   2. `rows()` filters the already-loaded list locally (six banners, one fetch).
 *   3. An empty result says «بنری با این موقعیت نیست» and offers a clear button,
 *      not the «هنوز بنری اضافه نشده» of a truly empty shop.
 */
@Component({
  selector: 'app-banner-list',
  imports: [
    PageHeader,
    FormsModule,
    Select,
    PersianDatePipe,
    PersianDigitsPipe,
    ErrorState,
    EmptyState,
  ],
  templateUrl: './banner-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannerList {
  private readonly banners = inject(BannersService);

  private readonly reload$ = new BehaviorSubject<void>(undefined);

  readonly listError = signal<string | null>(null);

  readonly isFetching = signal(false);

  /** `''` is «همه» — the explicit option, not `showClear`'s null. */
  readonly position = signal<BannerPosition | ''>('');

  /** The ids whose image failed; the card then renders a placeholder. */
  private readonly brokenImages = signal<ReadonlySet<EntityId>>(new Set());

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

  /** The rows the grid renders: the server list filtered by the position select. */
  readonly rows = computed<readonly Banner[] | null>(() => {
    const list = this.result();

    if (list === null) {
      return null;
    }

    const position = this.position();

    return position === '' ? list : list.filter((banner) => banner.position === position);
  });

  readonly viewState = computed<BannersView>(() => {
    if (this.listError()) {
      return 'error';
    }

    const rows = this.rows();

    if (rows === null) {
      return 'loading';
    }

    return rows.length === 0 ? 'empty' : 'data';
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

  onPositionChange(position: BannerPosition | ''): void {
    this.position.set(position);
  }

  clearFilter(): void {
    this.position.set('');
  }

  /** A broken URL is data, not an error page: one card shows a placeholder. */
  onImageError(id: EntityId): void {
    this.brokenImages.update((current) => new Set(current).add(id));
  }

  isBroken(id: EntityId): boolean {
    return this.brokenImages().has(id);
  }

  retry(): void {
    this.reload$.next();
  }
}
