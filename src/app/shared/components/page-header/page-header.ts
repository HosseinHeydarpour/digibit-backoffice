// src/app/shared/components/page-header/page-header.ts
import { Component, input } from '@angular/core';
import { Breadcrumb } from '@shared/components/breadcrumb/breadcrumb';

/**
 * The uniform header every page starts with: an optional breadcrumb trail, the
 * page title, an optional one-line description, and a slot for the page's
 * primary actions.
 *
 * WHY A COMPONENT AND NOT COPY-PASTED MARKUP
 * ------------------------------------------
 * Every list/detail page in this panel needs the same row: «محصولات» on the
 * right, «افزودن محصول» on the left, a trail above it. Copy-pasting that into
 * 15 pages guarantees 15 slightly different headers. One component means one
 * place to change the spacing, and every page looks the same (tc 6).
 *
 * HOW A PAGE USES IT
 * ------------------
 * Minimal — title only:
 *
 * ```html
 * <app-page-header title="پیشخوان" />
 * ```
 *
 * Typical list page — title, description, and one action button:
 *
 * ```html
 * <app-page-header title="محصولات" description="مدیریت کالاهای فروشگاه">
 *   <button type="button" page-header-actions class="...">افزودن محصول</button>
 * </app-page-header>
 * ```
 *
 * Detail page with two actions (the slot accepts as many as you like):
 *
 * ```html
 * <app-page-header title="سفارش ۴۲" description="ثبت‌شده در ۱۴۰۴/۰۵/۰۱">
 *   <button type="button" page-header-actions class="...">چاپ فاکتور</button>
 *   <button type="button" page-header-actions class="...">لغو سفارش</button>
 * </app-page-header>
 * ```
 *
 * A page that already shows a trail elsewhere can switch this one off:
 *
 * ```html
 * <app-page-header title="تنظیمات" [showBreadcrumb]="false" />
 * ```
 *
 * WHY `input()` AND NOT `@Input()`
 * --------------------------------
 * This project is signal-based end to end (`ThemeService`, `PageTitleService`,
 * the sidebar's `menu()`). `input()` gives a read-only signal, so the template
 * reads it as `title()` and cannot accidentally reassign it.
 *
 * `input.required<string>()` is a real guardrail, not decoration: a page that
 * forgets the title fails to COMPILE instead of rendering an empty <h1> — a
 * bug you would otherwise only notice by eye.
 */
@Component({
  selector: 'app-page-header',
  // Breadcrumb is a real import (not a slot) — see decision 3 in the
  // task handover: the trail is part of what the header *is*.
  imports: [Breadcrumb],
  templateUrl: './page-header.html',
  styleUrl: './page-header.scss',
})
export class PageHeader {
  /**
   * The page heading, rendered as the page's <h1>. Required.
   *
   * Scenarios:
   * - «محصولات» on the products list.
   * - «ویرایش محصول ۱۲» on a product form.
   */
  readonly title = input.required<string>();

  /**
   * Optional one-line explanation under the title. Omitted → no paragraph is
   * rendered at all (not an empty one).
   *
   * Scenarios:
   * - «مدیریت کالاهای فروشگاه» — tells a new admin what the page is for.
   * - Left off on the dashboard, where the title says enough.
   */
  readonly description = input<string>();

  /**
   * Whether to render the breadcrumb above the title. Defaults to `true`.
   *
   * Why a flag rather than "just remove the tag": the trail is useful on nested
   * pages and pointless on a one-level page, so the default favours the common
   * case. Even when `true`, a route that declares no `data.breadcrumb` produces
   * an EMPTY trail and `Breadcrumb` renders nothing (BO-B08 tc 9), so
   * this flag is a manual override, not a requirement.
   *
   * @example
   *   <app-page-header title="تنظیمات" [showBreadcrumb]="false" />
   */
  readonly showBreadcrumb = input<boolean>(true);
}
