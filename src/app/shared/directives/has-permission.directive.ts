import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { PERMISSIONS } from '@core/auth/permissions.token';

/**
 * Structural permission directive (BO-D08).
 *
 * ```html
 * <button *appHasPermission="'products.create'">افزودن</button>
 * <div *appHasPermission="['orders.view', 'orders.manage']">…</div>
 * ```
 *
 * The element is created in an embedded view only when the grant is present, so
 * a hidden control is ABSENT from the DOM, not `display:none` — tc 11 asks that
 * a devtools inspection cannot reveal it. An array is OR: any one grant is
 * enough. An empty string, an empty array or an unknown permission hides.
 *
 * It reads the `PERMISSIONS` signal inside `effect`, so a later login that adds
 * a grant re-renders the element without a reload (tc 4).
 */
@Directive({ selector: '[appHasPermission]' })
export class HasPermissionDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);

  private readonly viewContainer = inject(ViewContainerRef);

  private readonly permissions = inject(PERMISSIONS);

  readonly appHasPermission = input<string | readonly string[]>([]);

  private visible = false;

  constructor() {
    effect(() => {
      const required = this.appHasPermission();
      const grants = this.permissions();
      const wanted = typeof required === 'string' ? [required] : required;
      const allowed = wanted.some((permission) => permission !== '' && grants.includes(permission));

      if (allowed && !this.visible) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      } else if (!allowed && this.visible) {
        this.viewContainer.clear();
      }

      this.visible = allowed;
    });
  }
}
