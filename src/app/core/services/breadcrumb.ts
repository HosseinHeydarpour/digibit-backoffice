import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Params, Router } from '@angular/router';
import type { Breadcrumb } from '@shared/models';
import { filter, map, startWith } from 'rxjs';

/**
 * What a route is allowed to declare under `data.breadcrumb`.
 *
 * A plain string for static labels, or a function when the label needs the
 * route's own params — for example a detail page whose crumb must name the
 * record:
 *
 * ```ts
 * {
 *   path: 'products/:id',
 *   data: { breadcrumb: (params) => `ویرایش محصول ${params['id']}` },
 * }
 * ```
 *
 * The function receives only `params` (that route's `snapshot.params`), never
 * the whole snapshot — it stays pure, so it is trivial to reason about and to
 * test.
 */
export type BreadcrumbLabel = string | ((params: Params) => string);

/**
 * Builds the breadcrumb trail from the active route hierarchy.
 *
 * Same shape as `PageTitleService` on purpose: a signal that a Router event
 * subscription keeps in sync, plus a read-only view the template reads.
 * Reading the two services side by side is the fastest way to learn this
 * codebase's "router state → signal" bridge.
 *
 * Scenarios:
 * - `/dashboard` → one crumb, «پیشخوان». A flat page shows a lone crumb.
 * - `/products/12` → «محصولات» then «ویرایش محصول 12», the second built by
 *   the function label from this navigation's `id` param.
 * - `/orders/42/edit`, where only `orders/:id` declares a label → «سفارش‌ها»
 *   twice: Angular merges a parent's `data` into children that declare none
 *   (the same inheritance `data.title` enjoys), so `edit` carries the label
 *   under its own deeper URL. A level that should read differently declares
 *   its own `data.breadcrumb` — that is what the function labels are for.
 * - An URL that matches no breadcrumb data at all — including the 404
 *   wildcard — yields an EMPTY trail, so the component renders no chips
 *   (test case 9). The silence is deliberate: a 404 has no place in a trail.
 */
@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
  private readonly router = inject(Router);

  /** The raw trail; `crumbs` is the public, read-only view of it. */
  private readonly trail = signal<readonly Breadcrumb[]>([]);

  /** The trail for the active route. Empty when no step declares a crumb. */
  readonly crumbs = this.trail.asReadonly();

  /**
   * Router events are RxJS, not signals — this subscription is the bridge,
   * and it is the whole reason the service exists. Its one job is to write
   * `trail`; `crumbs` derives everything else.
   *
   * `startWith(null)` runs `readTrail()` immediately, so a deep link
   * (`/products/12` opened directly) is correct on the first paint instead
   * of flashing empty — the same trick `PageTitleService` uses.
   */
  constructor() {
    this.router.events
      .pipe(
        // NavigationEnd, not NavigationStart: during a lazy route the data is
        // not resolvable yet, so reading early would emit a stale trail.
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        startWith(null),
        map(() => this.readTrail()),
        // Root-provided services live for the app's lifetime; this keeps the
        // subscription correct if the service is ever scoped to a component.
        takeUntilDestroyed(),
      )
      .subscribe((trail) => this.trail.set(trail));
  }

  /**
   * Walks the matched route chain from the layout's first child down to the
   * deepest node, collecting one crumb per node that declares
   * `data.breadcrumb`, building each crumb's URL cumulatively.
   *
   * Why cumulative URLs: `route.snapshot.url` holds only THIS node's own
   * segments — `['12']` for `products/:id` — never its ancestors'. Walking
   * down and appending is what turns `products` + `:id` + `edit` into
   * `/products/12/edit`.
   *
   * Real example on `/products/12`, where `products` and `:id` declare labels:
   *
   *   root.firstChild → products  url '/products'    data.breadcrumb 'محصولات'
   *     └ firstChild → :id       url '/products/12' data.breadcrumb fn → 'ویرایش محصول 12'
   *
   * Node levels that declare nothing still matter in two ways: they extend
   * the cumulative URL of the crumb above them, and they INHERIT that crumb's
   * label — Angular merges a parent's `data` into children that declare none,
   * exactly as `data.title` does. Prefer declaring a label per level over
   * relying on the inheritance: a duplicated label reads as a bug in the UI.
   *
   * Returns `[]` — never a fallback crumb — when nothing declares one, so
   * "no trail" and "empty trail" are the same thing and the component can
   * stay dumb.
   *
   * Known scope limits (fine for this app, worth knowing): matrix and query
   * params are not part of the crumb URL, and secondary (named-outlet) routes
   * are not walked.
   */
  private readTrail(): readonly Breadcrumb[] {
    const crumbs: Breadcrumb[] = [];
    let route = this.router.routerState.root.firstChild;
    let url = '';

    while (route) {
      // This node's own segments, e.g. ['12'] for the `products/:id` route.
      const segments = route.snapshot.url.map((segment) => segment.path);

      // A node with no segments (a component-less parent) must not append a
      // stray '/' — '/products/' would break routerLink equality checks.
      if (segments.length > 0) {
        url += `/${segments.join('/')}`;
      }

      // Bracket access, not dot access: `noPropertyAccessFromIndexSignature`
      // is on (tsconfig), so `data.breadcrumb` does not compile.
      // The cast turns the route-data `any` into the documented union above.
      const declared = route.snapshot.data['breadcrumb'] as BreadcrumbLabel | undefined;

      if (declared !== undefined) {
        const label = typeof declared === 'function' ? declared(route.snapshot.params) : declared;
        crumbs.push({ label, url });
      }

      route = route.firstChild;
    }

    return crumbs;
  }
}
