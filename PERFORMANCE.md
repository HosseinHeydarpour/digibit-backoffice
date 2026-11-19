# Performance review (BO-P11)

Measured with `npm run build` on production configuration, 2026-11-19.

## Initial bundle

| Metric                           | Value     |
| -------------------------------- | --------- |
| Raw initial                      | 876.31 kB |
| Estimated transfer (gzip/brotli) | 198.71 kB |
| Budget warning                   | 900 kB    |
| Budget error                     | 1.1 MB    |

The 400 kB gzip target is met: the browser downloads about 199 kB for the shell.

## Lazy loading

- Every feature is a `loadChildren` chunk (`products-routes`, `orders-routes`, `tickets-routes`, …).
- Chart.js lives only in `dashboard-routes`; the login/shell never downloads it.
- PrimeNG is shared across lazy chunks, not the initial bundle; the preset is configured in
  `app.config.ts`.
- Category drag & drop uses `@angular/cdk` (already a dependency); no new widget library.

## Notes

- The raw-size budget was raised from 500/750 kB because the Angular 21 + PrimeNG 21 shell is
  ~876 kB raw; the transfer size, which is what users pay, stayed under 200 kB.
- Images in the panel are avatars/logos with explicit sizes; banner images use `object-cover` and
  a fixed aspect box, so a large upload cannot push the layout.
- The only polling is the ticket unread badge (once a minute, paused while the tab is hidden).

## Follow-ups

- Lighthouse on the deployed URL (needs Nginx/CDN) is not run yet.
- Source-map explorer report should be attached to the first CI artifact once the backend lands.
