// src/app/core/services/theme.ts
import { Injectable, computed, effect, signal } from '@angular/core';

/** The two theme modes the switch cycles between. */
export type ThemeMode = 'light' | 'dark';

/**
 * Persistence key fixed by the task doc (BO-B07 `exec`) as `digibit.theme`.
 * Keep it stable: the anti-FOUC inline script in `index.html` reads the same
 * key, so renaming one without the other causes a flash on first paint.
 */
const STORAGE_KEY = 'digibit.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly modeSignal = signal<ThemeMode>(this.readInitial());

  /** Current mode, read-only to consumers. */
  readonly mode = this.modeSignal.asReadonly();

  /** Convenience flag for templates: `theme.isDark()` drives the icon swap. */
  readonly isDark = computed(() => this.modeSignal() === 'dark');

  constructor() {
    // Applies the class only. It deliberately does NOT persist: an effect runs
    // on the first change detection, i.e. before the user has chosen anything,
    // and writing there would turn "follow the system" into a stored value on
    // visit one — after which a later system light<->dark switch is ignored.
    // Persistence happens in `toggle()`/`set()`, so an absent `digibit.theme`
    // genuinely means "still following the system", exactly as the reference
    // does (it writes localStorage only from the click handler).
    effect(() => {
      document.documentElement.classList.toggle('app-dark', this.isDark());
    });
  }

  /**
   * Flip between light and dark, and remember the choice.
   * Scenarios:
   * - An admin on a bright screen taps the header button at 14:00; mode goes
   *   light -> dark and the sidebar/cards invert immediately.
   * - They tap again before reloading; dark -> light, and because the choice is
   *   persisted here, the next visit opens in light.
   */
  toggle(): void {
    this.modeSignal.update((mode) => (mode === 'dark' ? 'light' : 'dark'));
    this.persist(this.isDark());
  }

  /**
   * Set an explicit mode, and remember the choice.
   * Scenarios:
   * - Settings "همیشه تاریک" calls `set('dark')`, forcing dark regardless of OS.
   * - A "پیش‌فرض سیستم" action calls `set(systemMode)` to re-sync with
   *   `prefers-color-scheme` after the saved value was cleared.
   */
  set(mode: ThemeMode): void {
    this.modeSignal.set(mode);
    this.persist(this.isDark());
  }

  /** Read the starting mode once, before the first render (tc 2 / tc 3). */
  private readInitial(): ThemeMode {
    // Scenarios:
    // - Chose dark last week -> `localStorage` holds 'dark', open dark (tc 2).
    // - First visit on a phone in night mode -> no saved value, read
    //   `prefers-color-scheme` and open dark (tc 3).
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
      if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
    } catch {
      // `localStorage` can throw in private mode / sandboxed iframes.
    }
    return 'light';
  }

  private persist(dark: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
    } catch {
      // Storage unavailable — the in-memory signal still works this session.
    }
  }
}
