// src/app/features/products/product-create/product-create.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeader } from '@shared/components/page-header/page-header';

/**
 * Products create page — the target of the list page's «افزودن محصول» action and
 * the `/products/new` route (tc 5). BO-F01 scaffold; the tabbed form that
 * matches `admin-panel-add-product.html` arrives in BO-F07 (main info tab),
 * BO-F08 (validation), BO-F09 (category/brand select) and BO-F10 (variants).
 */
@Component({
  selector: 'app-product-create',
  imports: [PageHeader, RouterLink],
  templateUrl: './product-create.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCreate {}
