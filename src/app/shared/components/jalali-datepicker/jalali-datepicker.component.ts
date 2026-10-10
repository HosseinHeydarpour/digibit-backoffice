import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Jalali } from 'jalali-ts';
import { IActiveDate, NgPersianDatepickerModule } from 'ng-persian-datepicker';
import { Subscription } from 'rxjs';

/** Format the library's own control (and the visible input) holds. */
const SHAMSI_FORMAT = 'YYYY/MM/DD';

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
  templateUrl: './jalali-datepicker.component.html',
  styleUrl: './jalali-datepicker.component.scss',
})
export class JalaliDatepickerComponent implements OnChanges, OnDestroy {
  /** Holds the Gregorian date, e.g. `2025-09-23`. */
  @Input({ required: true }) control!: FormControl<string | null>;

  @Input() inputId = 'app-jalali-datepicker';

  @Input() placeholder = 'انتخاب تاریخ';

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
