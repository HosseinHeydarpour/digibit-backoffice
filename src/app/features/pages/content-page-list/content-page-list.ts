import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { PERMISSIONS } from '@core/auth/permissions.token';
import { ToastService } from '@core/services/toast';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { ErrorState } from '@shared/components/error-state/error-state';
import { PageHeader } from '@shared/components/page-header/page-header';
import { PersianDatePipe } from '@shared/pipes/persian-date.pipe';
import { Dialog } from 'primeng/dialog';
import { BehaviorSubject, catchError, of, switchMap, tap } from 'rxjs';

import { ContentPageForm } from '../content-page-form/content-page-form';
import type { ContentPage } from '../models/content-page.model';
import { PagesService } from '../services/pages.service';

/**
 * Fixed content pages — `/pages` (BO-L08).
 *
 * Four rows that never change identity (about/contact/terms/faq); only their
 * text and SEO fields are editable. There is deliberately no create or delete:
 * the site routes exist, and removing one would 404 a public URL.
 */
@Component({
  selector: 'app-content-page-list',
  imports: [PageHeader, Dialog, ContentPageForm, PersianDatePipe, ErrorState, EmptyState],
  templateUrl: './content-page-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentPageList {
  private readonly pages = inject(PagesService);

  private readonly toast = inject(ToastService);

  private readonly permissions = inject(PERMISSIONS);

  private readonly reload$ = new BehaviorSubject<void>(undefined);

  readonly listError = signal<string | null>(null);

  readonly isFetching = signal(false);

  readonly dialogOpen = signal(false);

  readonly editing = signal<ContentPage | null>(null);

  readonly canManage = computed(() => this.permissions().includes('content.manage'));

  readonly rows = toSignal<readonly ContentPage[] | null>(
    this.reload$.pipe(
      tap(() => {
        this.listError.set(null);
        this.isFetching.set(true);
      }),
      switchMap(() =>
        this.pages.list().pipe(
          tap({
            next: () => {
              this.listError.set(null);
              this.isFetching.set(false);
            },
            error: () => {
              this.listError.set('دریافت صفحات ناموفق بود');
              this.isFetching.set(false);
            },
          }),
          catchError(() => of(null)),
        ),
      ),
    ),
    { initialValue: null },
  );

  edit(page: ContentPage): void {
    if (!this.canManage()) {
      return;
    }

    this.editing.set(page);
    this.dialogOpen.set(true);
  }

  onSaved(): void {
    this.toast.success('صفحه ذخیره شد.');
    this.closeDialog();
    this.reload$.next();
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
    this.editing.set(null);
  }

  retry(): void {
    this.reload$.next();
  }
}
