import { Component, inject } from '@angular/core';
import { LoadingService } from '@core/services/loading';

/**
 * The global thin bar at the top of the viewport (BO-C05).
 *
 * It is an indeterminate bar: the app does not know how much of a request is
 * left, so a fake percentage would lie. `pointer-events: none` keeps it from
 * blocking a control under it; `aria-hidden` is true while idle so a screen
 * reader never meets an empty progressbar.
 */
@Component({
  selector: 'app-top-progress-bar',
  templateUrl: './top-progress-bar.html',
  styleUrl: './top-progress-bar.scss',
})
export class TopProgressBar {
  protected readonly loading = inject(LoadingService);
}
