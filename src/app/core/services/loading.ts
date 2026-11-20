import { Injectable, computed, signal } from '@angular/core';

/**
 * A counter, not a boolean (BO-C05).
 *
 * Two parallel requests must keep the bar visible until BOTH finish; `finalize`
 * on each request decrements the same counter, and the `max(0)` guard makes a
 * double stop harmless. The top progress bar reads `active`.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly requests = signal(0);

  readonly active = computed(() => this.requests() > 0);

  start(): void {
    this.requests.update((count) => count + 1);
  }

  stop(): void {
    this.requests.update((count) => Math.max(0, count - 1));
  }
}
