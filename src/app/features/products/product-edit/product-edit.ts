// src/app/features/products/product-edit/product-edit.ts
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { PageHeader } from '@shared/components/page-header/page-header';

/**
 * Products edit page — `/products/:id/edit` (tc 6). BO-F01 scaffold; the form
 * itself arrives with BO-F07/F08 (it reuses the create form).
 *
 * Reads the id from the route param so the placeholder proves the `:id/edit`
 * route actually reaches the page with the right parameter (tc 6). `toSignal`
 * turns `paramMap` into a signal in the field initialiser, which Angular runs
 * inside the injection context — so the subscription is torn down with the
 * component, no `takeUntilDestroyed` needed.
 */
@Component({
  selector: 'app-product-edit',
  imports: [PageHeader],
  templateUrl: './product-edit.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductEdit {
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, { initialValue: null });

  /** The product id from `:id`, or `null` before the param map emits. */
  readonly productId = computed(() => this.params()?.get('id') ?? null);
}
