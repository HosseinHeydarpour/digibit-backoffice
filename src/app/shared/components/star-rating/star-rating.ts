import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatDigits, PersianDigitsPipe } from '@shared/pipes/persian-digits.pipe';

/**
 * A 1..5 rating as five Persian stars (BO-N04).
 *
 * Half stars are real: `4.5` renders four full, one half. A `null` rating is
 * «بدون امتیاز» and renders five empty stars, so a row without a score still
 * lines up with the scored rows.
 */
@Component({
  selector: 'app-star-rating',
  imports: [PersianDigitsPipe],
  template: `
    <span class="inline-flex items-center gap-1" [attr.aria-label]="label()">
      @for (star of stars(); track $index) {
        <i class="pi text-sm" [class]="star" aria-hidden="true"></i>
      }
      @if (rating() !== null) {
        <span class="text-xs text-gray-500 dark:text-gray-400">{{
          rating()! | persianDigits
        }}</span>
      } @else {
        <span class="text-xs text-gray-500 dark:text-gray-400">بدون امتیاز</span>
      }
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StarRating {
  readonly rating = input<number | null>(null);

  readonly stars = computed(() => {
    const value = this.rating() ?? 0;

    return Array.from({ length: 5 }, (_, index) => {
      const filled = value - index;

      if (filled >= 1) return 'pi-star-fill text-amber-400';
      if (filled >= 0.5) return 'pi-star-half-fill text-amber-400';

      return 'pi-star text-gray-300 dark:text-gray-600';
    });
  });

  readonly label = computed(() => {
    const value = this.rating();

    return value === null ? 'بدون امتیاز' : `امتیاز ${formatDigits(value)} از ۵`;
  });
}
