// src/app/features/products/product-list/product-list.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeader } from '@shared/components/page-header/page-header';

/**
 * Products list page — the landing page of the `/products` module (BO-F01
 * scaffold; the real `p-table` arrives in BO-F02).
 *
 * It already renders the Arino page shell: a `page-header` with the «افزودن
 * محصول» primary action routed to `new`, and a placeholder card that names the
 * next task. That keeps the navigation chain real from day one — tc 2 can click
 * «محصولات» in the sidebar and land on a page, not a blank outlet.
 */
@Component({
  selector: 'app-product-list',
  imports: [PageHeader, RouterLink],
  templateUrl: './product-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductList {}
