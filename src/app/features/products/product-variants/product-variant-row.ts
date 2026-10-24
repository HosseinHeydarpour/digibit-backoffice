// src/app/features/products/product-variants/product-variant-row.ts
//
// One variant row (BO-F10).
//
// WHY A COMPONENT PER ROW AND NOT ONE BIG TEMPLATE
// ------------------------------------------------
// A row owns a nested `FormArray` of attributes. If the editor inlined that
// markup, every attribute handler would need the row index to find the right
// group, and the editor's class would grow a second responsibility: editing one
// variant. Here the row receives its `FormGroup` and nothing else, so the
// editor only knows "add", "duplicate" and "remove".
//
// WHY THE GROUP IS AN INPUT RATHER THAN A CONTROL CONTAINER LOOKUP
// ---------------------------------------------------------------
// `[formGroup]="group()"` on the row's root gives the template a normal
// `formControlName` scope, and the attributes array resolves from it. The row
// does not need `formArrayName` + index plumbing, and it can be rendered in a
// story with a hand-built group.
//
// FOCUS AND `@for`
// ----------------
// The editor tracks the FormGroup OBJECT, not the index. Adding a row therefore
// creates one new DOM subtree and leaves the existing ones untouched, so the
// caret stays in the SKU field the user was editing (tc 9). Track by index would
// re-associate the wrong node when a row is inserted in the middle.
//
// WHY THE ROW DOES NOT DELETE ITSELF
// ----------------------------------
// Removal needs a confirmation dialog, and a dialog belongs to the editor (one
// service instance, one place to test). The row only emits `remove`; the editor
// asks, then calls `removeAt`. The same split keeps the row free of ToastService
// and makes its story trivial to mount.

import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import type { AbstractControl, FormGroup } from '@angular/forms';
import { PersianDigitsPipe } from '@shared/pipes/persian-digits.pipe';
import { TomanPipe } from '@shared/pipes/toman.pipe';
import { InputText } from 'primeng/inputtext';

import {
  VARIANT_ATTRIBUTE_SUGGESTIONS,
  attributeGroupsOf,
  createAttributeGroup,
} from './variant-form';
import {
  attributeError as attributePairError,
  variantImageError,
  variantPriceError,
  variantSkuError,
  variantStockError,
} from './variant-validators';

@Component({
  selector: 'app-product-variant-row',
  imports: [InputText, ReactiveFormsModule, PersianDigitsPipe, TomanPipe],
  templateUrl: './product-variant-row.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductVariantRow {
  /** The row's model. Owned by the editor's `FormArray`, never re-created here. */
  readonly group = input.required<FormGroup>();

  /** Zero-based position, used for labels and the `data-*` hooks. */
  readonly index = input.required<number>();

  /** The user asked to delete this row; the editor confirms and removes it. */
  readonly remove = output<void>();

  /** The user asked to copy this row; the editor inserts the copy. */
  readonly duplicate = output<void>();

  private readonly fb = inject(FormBuilder);

  /**
   * A detached array returned when the group is malformed.
   *
   * A stable instance matters: returning a new `FormArray` from a getter on every
   * change detection pass would make Angular re-render the attribute list
   * forever.
   */
  private readonly emptyAttributes = new FormArray<FormGroup>([]);

  /** The nested attribute array, or an empty one for a malformed group. */
  get attributes(): FormArray<FormGroup> {
    return attributeGroupsOf(this.group()) ?? this.emptyAttributes;
  }

  get sku(): AbstractControl {
    return this.group().controls['sku'];
  }

  get price(): AbstractControl {
    return this.group().controls['price'];
  }

  get stock(): AbstractControl {
    return this.group().controls['stock'];
  }

  get imageUrl(): AbstractControl {
    return this.group().controls['imageUrl'];
  }

  /** The header subtitle: the SKU, or a placeholder while the field is empty. */
  skuLabel(): string {
    const value = this.sku.value;

    return typeof value === 'string' && value.trim() !== '' ? value.trim() : 'بدون SKU';
  }

  /** A finite number for the stock badge and the summary. */
  stockValue(): number {
    const value = Number(this.stock.value);

    return Number.isFinite(value) ? value : 0;
  }

  /** A finite number for the formatted price hint. */
  priceValue(): number {
    const value = Number(this.price.value);

    return Number.isFinite(value) ? value : 0;
  }

  stockLabel(): string {
    return this.stockValue() > 0 ? 'موجود' : 'ناموجود';
  }

  /**
   * The thumbnail URL, or `null` while the field is empty or invalid.
   *
   * Reading `imageUrl.valid` prevents a broken image icon while the user is
   * halfway through typing a URL.
   */
  imagePreview(): string | null {
    const value = this.imageUrl.value;

    if (typeof value !== 'string' || value.trim() === '' || this.imageUrl.invalid) {
      return null;
    }

    return value.trim();
  }

  /** Suggestion chips whose key is not already used in THIS variant. */
  availableSuggestions(): readonly string[] {
    const used = new Set(
      this.attributes.controls.map((pair) => {
        const value = pair.get('key')?.value;

        return typeof value === 'string' ? value.trim() : '';
      }),
    );

    return VARIANT_ATTRIBUTE_SUGGESTIONS.filter((suggestion) => !used.has(suggestion));
  }

  /**
   * Add an attribute pair, optionally with the key already filled.
   *
   * TRACE — clicking «رنگ», then leaving the value empty:
   *
   *   1. `addAttribute('رنگ')` pushes `{ key: 'رنگ', value: '' }`.
   *   2. `attributePairValidator` on the pair returns `{ valueRequired: true }`.
   *   3. `attributeError(pair)` returns `null` while the pair is untouched, so
   *      the click does not paint the form red.
   *   4. The user tabs into the value input and leaves it. The control is
   *      touched, `group.touched` becomes true, and `attributeError` returns
   *      «مقدار ویژگی را وارد کنید.».
   *   5. Typing «مشکی» makes the pair valid; `variantAttributes()` will include
   *      `{ رنگ: 'مشکی' }` in the payload.
   */
  addAttribute(key = ''): void {
    this.attributes.push(createAttributeGroup(this.fb, { key }));
  }

  removeAttribute(index: number): void {
    if (index < 0 || index >= this.attributes.length) {
      return;
    }

    this.attributes.removeAt(index);
  }

  skuError(): string | null {
    return variantSkuError(this.sku);
  }

  priceError(): string | null {
    return variantPriceError(this.price);
  }

  stockError(): string | null {
    return variantStockError(this.stock);
  }

  imageError(): string | null {
    return variantImageError(this.imageUrl);
  }

  attributeError(pair: AbstractControl): string | null {
    return attributePairError(pair);
  }
}
