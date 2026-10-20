// src/app/features/products/product-detail/product-detail.ts
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { PageHeader } from '@shared/components/page-header/page-header';

/**
 * Products detail page — `/products/:id` (tc 6, tc 10). BO-F01 scaffold; the
 * real detail view (variants, gallery, inventory) arrives in later F tasks.
 *
 * Reads the id from the route param exactly like `ProductEdit`, so the scaffold
 * proves the bare `:id` route resolves to this page with the right param instead
 * of falling through to the 404.
 */
@Component({
  selector: 'app-product-detail',
  imports: [PageHeader],
  templateUrl: './product-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, { initialValue: null });

  /** The product id from `:id`, or `null` before the param map emits. */
  readonly productId = computed(() => this.params()?.get('id') ?? null);
}
