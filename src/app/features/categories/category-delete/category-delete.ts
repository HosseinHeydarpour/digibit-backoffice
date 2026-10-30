// src/app/features/categories/category-delete/category-delete.ts
//
// The delete dialog's body (BO-G04).
//
// WHY IT IS NOT THE DIALOG
// ------------------------
// Same reason as `CategoryForm`: the page owns `<p-dialog>` and this component is
// only what goes inside, so a story or a spec can mount it without overlay and
// animation providers.
//
// ONE COMPONENT, THREE SHAPES
// ---------------------------
// `deleteDecision()` says which of the three the clicked node produces, and the
// template is a single `@if (blocked())` around one footer. Three dialogs would
// have meant three copies of the request, the spinner and the error line.
//
// TRACE — «دفتر و کاغذ» (a leaf, 0 products, 0 children) is deleted:
//
//   1. `deleteDecision` → `{ kind: 'simple' }`, so no radio group renders.
//   2. «حذف» → `confirm()`: `strategy` falls back to `'transfer'` (nothing to
//      transfer) and sends `DELETE /categories/<id>?strategy=transfer`.
//   3. Success emits `deleted`; the page closes the dialog, toasts and refetches
//      the tree, so the row and its slug are gone from the next read (tc 9).
//   4. A 409 (products appeared in another tab) keeps the dialog open and prints
//      the server's message instead of pretending the row is gone.

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LoadingDirective } from '@shared/directives/loading.directive';
import { ApiError } from '@shared/models';
import { PersianDigitsPipe } from '@shared/pipes/persian-digits.pipe';
import { RadioButton } from 'primeng/radiobutton';
import { take } from 'rxjs';

import type { CategoryDeleteStrategy, CategoryNode } from '../models/category.model';
import { CategoriesService } from '../services/categories.service';

import { deleteDecision } from './delete-decision';

@Component({
  selector: 'app-category-delete',
  imports: [FormsModule, LoadingDirective, PersianDigitsPipe, RadioButton],
  templateUrl: './category-delete.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryDelete {
  private readonly categories = inject(CategoriesService);

  readonly category = input.required<CategoryNode>();

  /** The level the children move to: its name, or `null` for the roots. */
  readonly parentName = input<string | null>(null);

  readonly deleted = output<CategoryNode>();
  readonly cancelled = output<void>();

  readonly decision = computed(() => deleteDecision(this.category()));

  readonly blocked = computed(() => this.decision().kind === 'blocked');

  /** Products sitting in the node itself — the reason a delete is refused. */
  readonly productCount = computed(() => {
    const decision = this.decision();

    return decision.kind === 'blocked' ? decision.productCount : 0;
  });

  readonly childCount = computed(() => {
    const decision = this.decision();

    return decision.kind === 'children' ? decision.childCount : 0;
  });

  /** Products in the sub-categories; a cascade with any of them is refused. */
  readonly childProducts = computed(() => {
    const decision = this.decision();

    return decision.kind === 'children' ? decision.childProducts : 0;
  });

  readonly canCascade = computed(() => this.childProducts() === 0);

  readonly targetLabel = computed(() => this.parentName() ?? 'سطح اصلی');

  readonly strategy = signal<CategoryDeleteStrategy>('transfer');

  readonly deleting = signal(false);

  readonly deleteError = signal<string | null>(null);

  /**
   * Send the delete. The blocked shape has no delete button, so this only runs
   * for the two deletable shapes.
   */
  confirm(): void {
    if (this.blocked() || this.deleting()) {
      return;
    }

    // The dialog cannot pick a cascade that the branch does not allow — the
    // server repeats the rule, so a stale dialog gets a 409 instead of silently
    // orphaning the children's products.
    const strategy: CategoryDeleteStrategy = this.canCascade() ? this.strategy() : 'transfer';

    this.deleting.set(true);
    this.deleteError.set(null);

    this.categories
      .remove(String(this.category().id), strategy)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.deleted.emit(this.category());
        },
        error: (error: unknown) => {
          this.deleting.set(false);
          this.deleteError.set(
            error instanceof ApiError ? error.message : 'حذف دسته ناموفق بود. دوباره تلاش کنید.',
          );
        },
      });
  }

  /** «انصراف» and «باشه» — the page closes the dialog (tc 5). */
  close(): void {
    this.cancelled.emit();
  }
}
