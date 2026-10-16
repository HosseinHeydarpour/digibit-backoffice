// src/app/shared/components/breadcrumb/breadcrumb.component.ts
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BreadcrumbService } from '@core/services/breadcrumb';

/**
 * Breadcrumb trail for the current page, built from the route hierarchy.
 *
 * Deliberately dumb: it renders whatever `BreadcrumbService.crumbs` holds and
 * owns no route logic of its own — the same split as Topbar (presentation)
 * and PageTitleService (state). A page drops it in with:
 *
 * ```html
 * <app-breadcrumb />
 * ```
 *
 * BO-B09 (page-header) will host it beside the page title; nothing mounts it
 * yet.
 */
@Component({
  selector: 'app-breadcrumb',
  imports: [RouterLink],
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.scss',
})
export class BreadcrumbComponent {
  private readonly breadcrumbs = inject(BreadcrumbService);

  /**
   * Read-only view of the trail. The template must call it — `crumbs()` —
   * because `@for`/`@if` do not unwrap signals automatically (only
   * interpolations do).
   */
  protected readonly crumbs = this.breadcrumbs.crumbs;
}
