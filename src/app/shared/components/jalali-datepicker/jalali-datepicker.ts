import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  computed,
  inject,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ThemeService } from '@core/services/theme';
import { Jalali } from 'jalali-ts';
import { IActiveDate, NgPersianDatepickerModule } from 'ng-persian-datepicker';
import type { IDatepickerTheme } from 'ng-persian-datepicker';
import { Subscription } from 'rxjs';

/** Format the library's own control (and the visible input) holds. */
const SHAMSI_FORMAT = 'YYYY/MM/DD';

/**
 * The library's stock theme is a fixed white sheet, which ignores the app's
 * dark mode. These two palettes use this project's slate + brand colours, and
 * the dark one is picked from `ThemeService`; the selected day uses the darker
 * brand shade because white on `#ff8229` is below AA for 12px text.
 */
const LIGHT_CALENDAR_THEME: IDatepickerTheme = {
  border: '#e2e8f0',
  timeBorder: '#e2e8f0',
  background: '#ffffff',
  text: '#1e293b',
  hoverBackground: '#fff4ec',
  hoverText: '#b76122',
  disabledBackground: '#f1f5f9',
  disabledText: '#64748b',
  selectedBackground: '#b76122',
  selectedText: '#ffffff',
  todayBackground: '#fff4ec',
  todayText: '#b76122',
  otherMonthBackground: 'transparent',
  otherMonthText: '#64748b',
};

const DARK_CALENDAR_THEME: IDatepickerTheme = {
  border: '#475569',
  timeBorder: '#475569',
  background: '#1e293b',
  text: '#f8fafc',
  hoverBackground: '#334155',
  hoverText: '#f8fafc',
  disabledBackground: '#273449',
  disabledText: '#94a3b8',
  selectedBackground: '#b76122',
  selectedText: '#ffffff',
  todayBackground: '#334155',
  todayText: '#f8fafc',
  otherMonthBackground: 'transparent',
  otherMonthText: '#94a3b8',
};

/**
 * Jalali (Persian) date input for the back office.
 *
 * Wraps `ng-persian-datepicker` so the rest of the app never touches the library
 * directly. The contract is the one ARCHITECTURE.md section 5 requires: the
 * `FormControl` holds a **Gregorian `YYYY-MM-DD`** string (dates travel to and from
 * the API as UTC), while the user always sees and types a Jalali date.
 *
 * ```html
 * <app-jalali-datepicker [control]="form.controls.deliveredAt" />
 * ```
 *
 * Two controls are needed on purpose. The library always parses the control it owns
 * as *shamsi*, and it re-emits `dateOnSelect` for programmatic changes as well as
 * user picks. Giving it the public Gregorian control makes it reinterpret
 * `2025-09-23` as a Jalali year and convert forever (1404 -> 2025 -> 2646 -> ...).
 * So the library owns the private shamsi control, and this component is the
 * translation boundary in both directions.
 */
@Component({
  selector: 'app-jalali-datepicker',
  imports: [ReactiveFormsModule, NgPersianDatepickerModule],
  templateUrl: './jalali-datepicker.html',
  styleUrl: './jalali-datepicker.scss',
  host: { '[class.datepicker-overlay]': 'overlay' },
})
export class JalaliDatepicker implements OnChanges, OnDestroy {
  /** Holds the Gregorian date, e.g. `2025-09-23`. */
  @Input({ required: true }) control!: FormControl<string | null>;

  @Input() inputId = 'app-jalali-datepicker';

  @Input() placeholder = 'انتخاب تاریخ';

  /**
   * Float the calendar under the input instead of expanding the host in normal
   * flow. A toolbar needs this: an inline calendar grows the row and pushes
   * every neighbouring filter out of line.
   */
  @Input() overlay = false;

  private readonly theme = inject(ThemeService);

  /** The calendar's palette, following the app's light/dark switch. */
  protected readonly calendarTheme = computed<IDatepickerTheme>(() =>
    this.theme.isDark() ? DARK_CALENDAR_THEME : LIGHT_CALENDAR_THEME,
  );

  /** The library's own control — shamsi only. */
  protected readonly inner = new FormControl<string | null>(null);

  private subscription?: Subscription;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['control']) {
      this.subscription?.unsubscribe();
      this.subscription = this.control.valueChanges.subscribe((value) => this.syncInner(value));
      this.syncInner(this.control.value);
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  protected onSelect(event: IActiveDate): void {
    if (this.control.value !== event.gregorian) {
      this.control.setValue(event.gregorian);
    }
  }

  private syncInner(gregorian: string | null): void {
    const shamsi = gregorian ? Jalali.gregorian(gregorian).format(SHAMSI_FORMAT) : null;
    if (this.inner.value !== shamsi) {
      this.inner.setValue(shamsi);
    }
  }
}
