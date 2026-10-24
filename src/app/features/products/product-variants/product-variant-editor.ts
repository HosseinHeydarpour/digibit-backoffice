// src/app/features/products/product-variants/product-variant-editor.ts
//
// The variant editor used by the product create form (BO-F10).
//
// THE CONTRACT WITH ProductCreate
// -------------------------------
// The page owns the FormArray; this component edits it. `[variants]` is a
// required input, so the editor cannot accidentally create a second array that
// never reaches the submitted payload. The page keeps `variants` in the central
// FormGroup, which is what lets the wizard's «ادامه» validate the tab without a
// special case.
//
// WHY A `version` SIGNAL
// ----------------------
// A `FormArray` is not reactive. Pushing a row changes `controls`, but Angular
// has no reason to re-evaluate a `computed` that read `.length` before. The
// editor subscribes once to `variants.valueChanges` and bumps `version`; every
// derived value (`rows`, `count`, `totalStock`) reads it. One signal, one
// subscription, no per-row bookkeeping.
//
// The subscription also runs `syncVariantErrors`. That is deliberate: duplicate
// SKUs and duplicate attribute keys are cross-row facts, and the only moment
// they can change is a value change in ANY row.
//
// WHY REMOVE IS ASYNC
// -------------------
// Deleting a sellable row is not undoable with Ctrl+Z, so it goes through the
// shared ConfirmService. The `await` creates a tiny window in which the array
// could change; the identity check after the answer (`at(index) !== group`)
// makes a stale index a no-op instead of deleting the wrong row.
//
// WHY THE EMPTY STATE IS A SHARED COMPONENT
// -----------------------------------------
// `app-empty-state` already owns the Persian wording, the 64px glyph, the
// dark-mode pair and the 44px mobile target. Re-implementing a dashed box here
// would be a second empty-state style to keep in sync. The wrapper adds only the
// dashed surface, which the shared block intentionally does not paint.

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder } from '@angular/forms';
import type { FormArray, FormGroup } from '@angular/forms';
import { ConfirmService } from '@core/services/confirm';
import { ToastService } from '@core/services/toast';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { PersianDigitsPipe, formatDigits } from '@shared/pipes/persian-digits.pipe';

import { ProductVariantRow } from './product-variant-row';
import {
  MAX_VARIANTS,
  createVariantGroup,
  duplicateVariantGroup,
  sumVariantStock,
} from './variant-form';
import { syncVariantErrors, variantsRequiredError } from './variant-validators';

@Component({
  selector: 'app-product-variant-editor',
  imports: [EmptyState, PersianDigitsPipe, ProductVariantRow],
  templateUrl: './product-variant-editor.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductVariantEditor implements OnInit {
  /** The page-owned array. The editor never replaces it. */
  readonly variants = input.required<FormArray<FormGroup>>();

  /**
   * The product's base price. Read only when a NEW row is created (tc 4).
   *
   * Existing rows are never rewritten: a price the user typed is data, and a
   * base-price edit on another tab must not silently overwrite it.
   */
  readonly basePrice = input<number>(0);

  private readonly fb = inject(FormBuilder);

  private readonly confirm = inject(ConfirmService);

  private readonly toast = inject(ToastService);

  private readonly destroyRef = inject(DestroyRef);

  /**
   * Bumped after every array change so the computeds below have a dependency.
   * Starts at 0; the initial `refresh()` in `ngOnInit` makes it 1.
   */
  private readonly version = signal(0);

  /** Exposed for the template's ceiling message. */
  readonly maxVariants = MAX_VARIANTS;

  /** The live row list, in form order. */
  readonly rows = computed<FormGroup[]>(() => {
    this.version();
    // A fresh array, not `controls`: `FormArray.controls` is the SAME mutable
    // array, and `computed` uses `Object.is`, so returning it would look
    // unchanged and the `@for` would never re-render.
    return [...this.variants().controls];
  });

  readonly count = computed(() => this.rows().length);

  /**
   * A live total for the header. BO-F12 owns the authoritative inventory total;
   * this only previews what the rows currently say.
   */
  readonly totalStock = computed(() => {
    this.version();
    return sumVariantStock(this.variants());
  });

  ngOnInit(): void {
    this.variants()
      .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refresh());

    // A prefilled edit form (BO-F14) can arrive with duplicate SKUs from the
    // server; syncing once marks them before the user touches anything.
    this.refresh();
  }

  /**
   * Append a blank row, seeded with the current base price.
   *
   * TRACE: base price 2,100,000 → click «افزودن واریانت» → a row with
   * `{ sku: '', price: 2100000, stock: 0 }`. The array emits `valueChanges`,
   * `refresh()` runs, the count badge becomes ۲ and the new SKU input is the
   * next field the user sees.
   */
  add(): void {
    if (!this.canAdd()) {
      this.toast.warning(this.maxMessage);
      return;
    }

    this.variants().push(createVariantGroup(this.fb, { basePrice: this.basePrice() }));
  }

  /**
   * Copy a row directly below itself, with a free SKU.
   *
   * `insert(index + 1, …)` rather than `push`: the copy is a variation of the row
   * above it, and putting it at the end of a 20-row list would make the user hunt
   * for what just happened.
   */
  duplicate(index: number): void {
    if (!this.canAdd()) {
      this.toast.warning(this.maxMessage);
      return;
    }

    const source = this.variants().at(index);

    if (!source) {
      return;
    }

    this.variants().insert(index + 1, duplicateVariantGroup(this.fb, source, this.skus()));
  }

  /**
   * Ask, then remove (tc 2).
   *
   * The label prefers the SKU because that is what the user recognises in a list
   * of otherwise identical rows; the row number is the fallback for a blank row.
   *
   * TRACE — the user deletes the second row:
   *
   *   1. `ProductVariantRow` emits `remove(1)`; the editor calls
   *      `remove(1)` with the current array.
   *   2. `group = at(1)`, `sku = 'SONY-WH1000-BLK-2'`, label = that SKU.
   *   3. `confirm` resolves `false` -> return; the array is untouched.
   *   4. The user clicks delete again and accepts. `at(1) === group` is still
   *      true, so `removeAt(1)` runs and the toast reports the removal.
   *   5. `valueChanges` -> `refresh()` -> `version++`; `rows`, `count` and
   *      `totalStock` all recompute from the shorter array.
   */
  async remove(index: number): Promise<void> {
    const group = this.variants().at(index);

    if (!group) {
      return;
    }

    const sku = this.skuOf(group);
    const label = sku === '' ? `واریانت ${formatDigits(index + 1)}` : sku;

    const confirmed = await this.confirm.confirm({
      message: `آیا از حذف «${label}» مطمئن هستید؟`,
      header: 'حذف واریانت',
      acceptLabel: 'حذف',
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    // The dialog blocks the page, but an async answer can still outlive a
    // programmatic change. Only delete the row the user actually confirmed.
    if (this.variants().at(index) !== group) {
      return;
    }

    this.variants().removeAt(index);
    this.toast.info('واریانت از فرم حذف شد.');
  }

  /** The list-level message, shown only after the user tried to move on (tc 6). */
  listError(): string | null {
    return variantsRequiredError(this.variants());
  }

  /**
   * A getter, not a field: `formatDigits` is a runtime import shared with the
   * eager spec bundle, and a field initialiser could run before it is ready —
   * the same hazard `ProductCreate.shortDescriptionMax` documents.
   */
  get maxMessage(): string {
    return `حداکثر ${formatDigits(MAX_VARIANTS)} واریانت برای هر محصول مجاز است.`;
  }

  private canAdd(): boolean {
    return this.variants().length < MAX_VARIANTS;
  }

  private skus(): string[] {
    return this.variants().controls.map((group) => this.skuOf(group));
  }

  private skuOf(group: FormGroup): string {
    const value = group.controls['sku'].value;

    return typeof value === 'string' ? value.trim() : '';
  }

  /**
   * Recompute the cross-row errors and notify the template.
   *
   * `syncVariantErrors` writes through `setErrors`, which does not emit
   * `valueChanges`; there is no loop back into this subscription.
   */
  private refresh(): void {
    syncVariantErrors(this.variants());
    this.version.update((value) => value + 1);
  }
}
