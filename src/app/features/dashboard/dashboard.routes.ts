// src/app/features/dashboard/dashboard.routes.ts
//
// The dashboard's routes, owned by the dashboard.
//
// WHY A FEATURE OWNS ITS ROUTES AND NOT `app.routes.ts`
// -----------------------------------------------------
// BO-E01 is the first route with a resolver, and the resolver is the point:
// importing `summaryResolver` statically into `app.routes.ts` would hoist the
// resolver, `DashboardService` and `ApiService` into the main bundle — every
// visitor would download the dashboard's data layer to see the login page.
// `loadChildren` pulls all of it into one chunk that only loads when the user
// actually opens «پیشخوان» (tc 4). The production build proves it: a
// `dashboard-routes` chunk exists.
//
// The same file also keeps the route's `data` next to the code that consumes it.
// A central table means adding a feature is an edit to a shared file, and the
// breadcrumb/title labels drift away from the page they name.
//
// The cost is real and worth naming: `app.routes.ts` can no longer SEE this
// route's `data.breadcrumb`, so `breadcrumb.spec.ts`'s "every feature route
// declares a crumb" check exempts `loadChildren` routes, and this spec is the
// one that pins the labels. That trade is documented in AGENTS.md.
//
// `runGuardsAndResolvers: 'always'` is what makes the page's retry button
// work — see `Dashboard.retry()`, which also needs `onSameUrlNavigation`.

import { Routes } from '@angular/router';

import { Dashboard } from './dashboard';
import { summaryResolver } from './dashboard.resolver';

export const DASHBOARD_ROUTES: Routes = [
  {
    // Empty: the parent in `app.routes.ts` already consumed the `/dashboard`
    // segment, so this node adds nothing to the URL.
    path: '',

    component: Dashboard,

    // Two title fields, same as every other route (BO-B05/B08):
    // `data.title` feeds the topbar heading, `title` feeds the browser tab.
    title: 'پیشخوان',
    data: { title: 'پیشخوان', breadcrumb: 'پیشخوان' },

    // The summary is in `ActivatedRoute.data` before the component exists.
    resolve: { summary: summaryResolver },

    // 'always' and not the default 'paramsChange': a reused route is handed the
    // previous route's already-resolved data (`getRouteGuards` copies
    // `_resolvedData` forward) unless the mode says to run again. This is what
    // makes the page's retry refetch — see `Dashboard.retry()`, which also
    // needs `onSameUrlNavigation: 'reload'` to get past the router's
    // same-URL short-circuit in the first place.
    //
    // Cheap here because this route has one resolver and no guard; a page with
    // several should move the refetch into the service instead.
    runGuardsAndResolvers: 'always',
  },
];
