// src/app/core/services/page-title.ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

/** Fallback when a route declares no title (test case 9). */
const DEFAULT_TITLE = 'پنل مدیریت';

@Injectable({ providedIn: 'root' })
export class PageTitleService {
  private readonly router = inject(Router);

  /** The deepest matched route that actually declares a title. */
  private readonly deepest = signal<string | null>(null);

  readonly title = computed(() => this.deepest() ?? DEFAULT_TITLE);

  /**
   * Keeps `title` in sync with the active route.
   *
   * Signals cannot observe router navigation on their own — `Router` exposes an
   * RxJS event stream, not a signal — so this subscription is the bridge. Its
   * one job is to write `deepest`; `title` derives everything else.
   *
   * Scenarios:
   * - App boots directly on `/orders/42` (deep link). `startWith(null)` fires
   *   immediately, `readDeepestTitle()` walks the matched chain and the heading
   *   reads «جزئیات سفارش» on the first paint — no flash of «پنل مدیریت».
   * - The user clicks «محصولات» in the sidebar. `NavigationEnd` fires once the
   *   route is committed, `deepest` is overwritten with «محصولات», and the
   *   computed `title` updates the `<h1>` in the topbar.
   * - The service is destroyed (component-scope teardown in a test, or app
   *   teardown). `takeUntilDestroyed()` completes the stream, so the router
   *   listener is released and no callback can write to a destroyed signal.
   */
  constructor() {
    this.router.events
      .pipe(
        // NavigationEnd, not NavigationStart: during a lazy route the title is
        // not resolvable yet, so listening early shows a stale heading.
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        // startWith so the first paint already has the right title.
        startWith(null),
        map(() => this.readDeepestTitle()),
        takeUntilDestroyed(),
      )
      .subscribe((title) => this.deepest.set(title));
  }

  /**
   * `route.firstChild` chain: a feature route under MainLayout means the title
   * lives one or more levels down, the same way `route.snapshot` does not
   * inherit. Walk to the deepest node (test case 5).
   *
   * Returns `null` — never the default — so the caller can tell "no route
   * declared a title" apart from "a route declared a title equal to the
   * fallback". `title` applies the fallback exactly once, in one place.
   *
   * Scenarios:
   * - `/products` is matched as `'' → MainLayout` + `products`. The root node
   *   has no `data.title` and is skipped; the child declares «محصولات», so
   *   «محصولات» is returned.
   * - `/orders/42` is matched as `'' → MainLayout` + `orders/:id`. Even though
   *   the segment is parameterised, `data.title` is static per route, so the
   *   literal «جزئیات سفارش» is returned. (Appending the actual id would need
   *   `route.params`, which is a separate concern.)
   * - The wildcard `**` route matches with no `data.title` anywhere in the
   *   chain. `title` stays `null` the whole way down, so `null` is returned and
   *   the computed falls back to «پنل مدیریت» (test case 6).
   * - The path matches only the layout, e.g. `''` with an empty outlet. The
   *   loop never enters (or enters once with no title), giving `null` — the
   *   same graceful default as above.
   */
  private readDeepestTitle(): string | null {
    let route = this.router.routerState.root.firstChild;
    let title: string | null = null;

    while (route) {
      const declared = route.snapshot.data['title'];
      if (typeof declared === 'string' && declared.length > 0) {
        title = declared;
      }
      route = route.firstChild;
    }

    return title;
  }
}
