// src/app/features/products/product-variants/variant-validators.ts
//
// The variant editor's rules and error bookkeeping (BO-F10).
//
// WHY THIS FILE IS SEPARATE FROM THE COMPONENT
// --------------------------------------------
// Every rule below is a plain function over an `AbstractControl`. That means the
// spec can prove "a SKU of 65 characters fails" without mounting a component,
// and the row template only asks for a finished Persian sentence. The editor
// never inspects `control.errors` itself.
//
// THE CROSS-ROW PROBLEM
// ---------------------
// A SKU is unique per PRODUCT, not per row. Angular runs a validator only for
// the control that changed, so a control-level rule cannot refresh the SIBLING
// that now collides. Two pieces solve it:
//
//   * the SKU validator ALSO counts its siblings, so the marker is recreated
//     every time `formControlName` re-validates the row (registration, blur,
//     manual update). Without this, the directive's registration microtask —
//     which calls `updateValueAndValidity()` — would erase a marker that only
//     `setErrors` had written;
//   * `syncVariantErrors()` walks the whole array on every value change and
//     refreshes the rows Angular did not touch.
//
// The sync only writes through `setErrors`, which does not emit `valueChanges`,
// so it cannot feed itself.
//
// WHY DUPLICATES ARE COMPARED CASE-INSENSITIVELY
// ----------------------------------------------
// `abc-1` and `ABC-1` are the same warehouse code in every system this panel
// talks to. Comparing raw strings would let both rows save and only fail at the
// database constraint, which is the worst place to learn about it.
//
// WHY A BLANK ATTRIBUTE PAIR IS NOT AN ERROR
// ------------------------------------------
// «+ ویژگی» adds an empty row so the user has somewhere to type. Treating that
// placeholder as invalid would paint the form red the moment the button is
// pressed. A pair becomes required only when the user fills ONE half of it: a
// key with no value (or the reverse) is a half-written attribute, and that is a
// real mistake.

import { FormArray } from '@angular/forms';
import type { AbstractControl, ValidationErrors } from '@angular/forms';
import { formatDigits } from '@shared/pipes/persian-digits.pipe';

export const VARIANT_SKU_MAX = 64;
export const VARIANT_ATTRIBUTE_KEY_MAX = 32;
export const VARIANT_ATTRIBUTE_VALUE_MAX = 48;

/**
 * The one regex the SKU hint promises.
 *
 * Latin letters, digits, dot, underscore and hyphen. Deliberately no spaces and
 * no Persian letters: the SKU travels into barcode printers, warehouse exports
 * and URL filters, all of which treat a space as a separator.
 */
const SKU_PATTERN = /^[A-Za-z0-9._-]+$/;

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Trim + lowercase; empty for a non-string. Used only for comparisons. */
function key(value: unknown): string {
  return text(value).toLowerCase();
}

/**
 * SKU: required after trimming, at most 64 characters, ASCII punctuation only.
 *
 * TRACE: `variantSkuValidator(new FormControl('  SONY-100  '))` → null.
 * `'   '` → `{ required: true }`. `'sku 100'` → `{ pattern: true }`.
 *
 * The duplicate check is part of the validator on purpose. `formControlName`
 * registers with its `FormGroupDirective` inside a promise and then calls
 * `updateValueAndValidity()`, which re-runs every validator. If the duplicate
 * mark only lived in `syncVariantErrors` (a `setErrors` write), that microtask
 * would erase it on first render. Reading the sibling array here makes the mark
 * survive — and still lets `syncVariantErrors` refresh the OTHER row, whose
 * validator Angular will not run when this one changes.
 */
export function variantSkuValidator(control: AbstractControl): ValidationErrors | null {
  const value = text(control.value);
  const duplicate = hasDuplicateSku(control);

  let errors: ValidationErrors | null = null;

  if (value === '') {
    errors = { required: true };
  } else if (value.length > VARIANT_SKU_MAX) {
    errors = {
      maxlength: { requiredLength: VARIANT_SKU_MAX, actualLength: value.length },
    };
  } else if (!SKU_PATTERN.test(value)) {
    errors = { pattern: true };
  }

  if (!duplicate) {
    return errors;
  }

  return { ...(errors ?? {}), duplicateSku: true };
}

/**
 * True when another row in the same product carries the same SKU.
 *
 * `control.parent` is the variant group and `.parent` is the product's
 * `variants` array. The guard returns `false` for a control that is not attached
 * yet, which is what lets the pure spec call the validator with a bare
 * `FormControl`.
 *
 * It counts raw SKU strings rather than reading `valid`, so it can never recurse
 * into itself.
 */
function hasDuplicateSku(control: AbstractControl): boolean {
  const sku = key(control.value);

  if (sku === '') {
    return false;
  }

  const array = control.parent?.parent;

  if (!(array instanceof FormArray)) {
    return false;
  }

  let count = 0;

  for (const group of array.controls) {
    if (key(group.get('sku')?.value) === sku) {
      count += 1;
    }
  }

  return count > 1;
}

/**
 * Price: required, numeric, strictly positive.
 *
 * A variant price of zero is not a giveaway; it is an unfinished row. The base
 * product price uses the same rule in `product-validators.ts`, so the form never
 * contains two different definitions of "free".
 */
export function variantPriceValidator(control: AbstractControl): ValidationErrors | null {
  if (control.value === null || control.value === undefined || control.value === '') {
    return { required: true };
  }

  const value = Number(control.value);

  if (!Number.isFinite(value)) {
    return { number: true };
  }

  return value > 0 ? null : { positive: true };
}

/**
 * Stock: required, a whole number, zero allowed, negative rejected.
 *
 * `3.5` units cannot be shipped, so the integer check is separate from the
 * negative check: they need different sentences («عدد صحیح» vs «منفی»).
 */
export function variantStockValidator(control: AbstractControl): ValidationErrors | null {
  if (control.value === null || control.value === undefined || control.value === '') {
    return { required: true };
  }

  const value = Number(control.value);

  if (!Number.isFinite(value)) {
    return { number: true };
  }

  if (!Number.isInteger(value)) {
    return { integer: true };
  }

  return value >= 0 ? null : { negative: true };
}

/**
 * Variant image: optional, but when present it must be an http(s) URL or an
 * absolute site path.
 *
 * The alternative — accepting anything — would send `javascript:` or a typo to
 * the API and only fail when the gallery tries to render it. The field is
 * optional because BO-F11 owns uploads and a row may legitimately have no image.
 */
export function variantImageUrlValidator(control: AbstractControl): ValidationErrors | null {
  const value = text(control.value);

  if (value === '') {
    return null;
  }

  if (/^https?:\/\/\S+$/i.test(value) || /^\/\S+$/.test(value)) {
    return null;
  }

  return { pattern: true };
}

/** Attribute key: optional on its own, bounded so a label cannot become a novel. */
export function attributeKeyValidator(control: AbstractControl): ValidationErrors | null {
  const value = text(control.value);

  let errors: ValidationErrors | null = null;

  if (value.length > VARIANT_ATTRIBUTE_KEY_MAX) {
    errors = {
      maxlength: {
        requiredLength: VARIANT_ATTRIBUTE_KEY_MAX,
        actualLength: value.length,
      },
    };
  }

  if (!hasDuplicateAttributeKey(control)) {
    return errors;
  }

  return { ...(errors ?? {}), duplicateKey: true };
}

/**
 * True when a sibling pair in the SAME variant uses the same key.
 *
 * Same reason as `hasDuplicateSku`: the `formControlName` registration
 * microtask re-runs this validator, and a marker written only by
 * `syncDuplicateAttributeErrors` would not survive it.
 */
function hasDuplicateAttributeKey(control: AbstractControl): boolean {
  const attributeKey = key(control.value);

  if (attributeKey === '') {
    return false;
  }

  const array = control.parent?.parent;

  if (!(array instanceof FormArray)) {
    return false;
  }

  let count = 0;

  for (const pair of array.controls) {
    if (key(pair.get('key')?.value) === attributeKey) {
      count += 1;
    }
  }

  return count > 1;
}

/** Attribute value: same bound as the key, no other rule. */
export function attributeValueValidator(control: AbstractControl): ValidationErrors | null {
  const value = text(control.value);

  if (value.length > VARIANT_ATTRIBUTE_VALUE_MAX) {
    return {
      maxlength: {
        requiredLength: VARIANT_ATTRIBUTE_VALUE_MAX,
        actualLength: value.length,
      },
    };
  }

  return null;
}

/**
 * The pair rule: both halves empty → fine (a placeholder row), one half filled →
 * the missing half is required.
 *
 * It lives on the pair's FormGroup because it needs BOTH controls, and it reads
 * the trimmed values so a key of three spaces counts as empty.
 */
export function attributePairValidator(group: AbstractControl): ValidationErrors | null {
  const keyValue = text(group.get('key')?.value);
  const valueValue = text(group.get('value')?.value);

  if (keyValue === '' && valueValue === '') {
    return null;
  }

  if (keyValue === '') {
    return { keyRequired: true };
  }

  if (valueValue === '') {
    return { valueRequired: true };
  }

  return null;
}

/**
 * The product needs at least one variant (tc 6).
 *
 * Angular's `Validators.required` does NOT catch this: a `FormArray` is an
 * object, and an empty array is "present" as far as it is concerned. This
 * validator checks `length`, which is the actual question.
 */
export function atLeastOneVariantValidator(control: AbstractControl): ValidationErrors | null {
  return control instanceof FormArray && control.length === 0 ? { requiredVariants: true } : null;
}

/**
 * Write or clear one key without destroying the others.
 *
 * The early return is not an optimisation detail, it is what keeps the editor
 * from calling `setErrors` on every keystroke of every row: when the answer has
 * not changed, the control's status does not change, and no extra change
 * detection round is scheduled.
 */
function setError(control: AbstractControl, errorKey: string, present: boolean): void {
  if (control.hasError(errorKey) === present) {
    return;
  }

  const errors = { ...(control.errors ?? {}) };

  if (present) {
    errors[errorKey] = true;
  } else {
    delete errors[errorKey];
  }

  control.setErrors(Object.keys(errors).length > 0 ? errors : null);
}

/**
 * Flag every SKU that appears on more than one row.
 *
 * TRACE — two rows, then a fix:
 *
 *   1. Row 1 has `SONY-100`, row 2 has `SONY-100`.
 *   2. `counts` = { 'sony-100': 2 }.
 *   3. Both SKU controls get `{ duplicateSku: true }`; the row template shows
 *      «این SKU در ردیف دیگری هم استفاده شده است.» under both (tc 3).
 *   4. The user edits row 2 to `SONY-101`; the next `valueChanges` rebuilds the
 *      map, both counts are 1, and the key is removed from both controls.
 */
export function syncDuplicateSkuErrors(variants: FormArray): void {
  const counts = new Map<string, number>();

  for (const group of variants.controls) {
    const sku = key(group.get('sku')?.value);

    if (sku !== '') {
      counts.set(sku, (counts.get(sku) ?? 0) + 1);
    }
  }

  for (const group of variants.controls) {
    const control = group.get('sku');

    if (!control) {
      continue;
    }

    const sku = key(control.value);
    setError(control, 'duplicateSku', sku !== '' && (counts.get(sku) ?? 0) > 1);
  }
}

/**
 * Flag a repeated attribute key inside ONE variant.
 *
 * `{ رنگ: 'مشکی', رنگ: 'سفید' }` cannot exist: the payload is a record, so the
 * second value would silently overwrite the first. Catching it here keeps the
 * object that reaches `CreateProductDto` honest.
 */
export function syncDuplicateAttributeErrors(attributes: FormArray): void {
  const counts = new Map<string, number>();

  for (const pair of attributes.controls) {
    const attributeKey = key(pair.get('key')?.value);

    if (attributeKey !== '') {
      counts.set(attributeKey, (counts.get(attributeKey) ?? 0) + 1);
    }
  }

  for (const pair of attributes.controls) {
    const control = pair.get('key');

    if (!control) {
      continue;
    }

    const attributeKey = key(control.value);
    setError(control, 'duplicateKey', attributeKey !== '' && (counts.get(attributeKey) ?? 0) > 1);
  }
}

/**
 * The single entry point the editor calls after every array change.
 *
 * It walks the whole array rather than the edited row: a SKU edit in row 3 can
 * make row 7 a duplicate, and only a full pass notices that.
 */
export function syncVariantErrors(variants: FormArray): void {
  syncDuplicateSkuErrors(variants);

  for (const group of variants.controls) {
    const attributes = group.get('attributes');

    if (attributes instanceof FormArray) {
      syncDuplicateAttributeErrors(attributes);
    }
  }
}

/**
 * First visible SKU message, or `null`.
 *
 * `duplicateSku` is shown even before the control is touched: the error was
 * caused by ANOTHER row, and hiding it until the user happens to blur this one
 * would leave a form that looks valid while it is not (tc 3). Everything else
 * obeys the touched rule from BO-F08 (tc 9 there).
 */
export function variantSkuError(control: AbstractControl | null | undefined): string | null {
  if (!control?.errors) {
    return null;
  }

  if (control.hasError('duplicateSku')) {
    return 'این SKU در ردیف دیگری هم استفاده شده است.';
  }

  if (!control.touched) {
    return null;
  }

  if (typeof control.errors['server'] === 'string') {
    return control.errors['server'];
  }

  if (control.hasError('required')) {
    return 'کد SKU این واریانت الزامی است.';
  }

  if (control.hasError('pattern')) {
    return 'کد SKU فقط می‌تواند شامل حروف انگلیسی، عدد، نقطه، خط تیره و زیرخط باشد.';
  }

  if (control.hasError('maxlength')) {
    return `کد SKU نباید بیش‌تر از ${formatDigits(VARIANT_SKU_MAX)} کاراکتر باشد.`;
  }

  return 'کد SKU معتبر نیست.';
}

/** First visible price message, or `null`. */
export function variantPriceError(control: AbstractControl | null | undefined): string | null {
  if (!control?.errors || !control.touched) {
    return null;
  }

  if (typeof control.errors['server'] === 'string') {
    return control.errors['server'];
  }

  if (control.hasError('required')) {
    return 'قیمت این واریانت الزامی است.';
  }

  if (control.hasError('positive')) {
    return 'قیمت واریانت باید بزرگ‌تر از صفر باشد.';
  }

  if (control.hasError('number')) {
    return 'یک عدد معتبر وارد کنید.';
  }

  return 'قیمت واردشده معتبر نیست.';
}

/** First visible stock message, or `null`. */
export function variantStockError(control: AbstractControl | null | undefined): string | null {
  if (!control?.errors || !control.touched) {
    return null;
  }

  if (typeof control.errors['server'] === 'string') {
    return control.errors['server'];
  }

  if (control.hasError('required')) {
    return 'موجودی این واریانت الزامی است.';
  }

  if (control.hasError('integer')) {
    return 'موجودی باید عدد صحیح باشد.';
  }

  if (control.hasError('negative')) {
    return 'موجودی نمی‌تواند منفی باشد.';
  }

  if (control.hasError('number')) {
    return 'یک عدد معتبر وارد کنید.';
  }

  return 'موجودی واردشده معتبر نیست.';
}

/** First visible image-URL message, or `null`. */
export function variantImageError(control: AbstractControl | null | undefined): string | null {
  if (!control?.errors || !control.touched) {
    return null;
  }

  if (control.hasError('pattern')) {
    return 'آدرس تصویر باید با http:// یا https:// یا / شروع شود.';
  }

  return 'آدرس تصویر معتبر نیست.';
}

/**
 * First visible message for one attribute pair, or `null`.
 *
 * The pair's own errors (`keyRequired`/`valueRequired`) live on the GROUP, while
 * `duplicateKey` and `maxlength` live on the inner controls. This function is the
 * one place that knows both, so the template can call it with the pair only.
 */
export function attributeError(group: AbstractControl | null | undefined): string | null {
  if (!group) {
    return null;
  }

  const keyControl = group.get('key');
  const valueControl = group.get('value');

  if (keyControl?.hasError('duplicateKey')) {
    return 'این ویژگی در همین واریانت تکرار شده است.';
  }

  const touched = group.touched || keyControl?.touched === true || valueControl?.touched === true;

  if (!touched) {
    return null;
  }

  if (group.hasError('keyRequired')) {
    return 'نام ویژگی را وارد کنید.';
  }

  if (group.hasError('valueRequired')) {
    return 'مقدار ویژگی را وارد کنید.';
  }

  if (keyControl?.hasError('maxlength')) {
    return `نام ویژگی نباید بیش‌تر از ${formatDigits(VARIANT_ATTRIBUTE_KEY_MAX)} کاراکتر باشد.`;
  }

  if (valueControl?.hasError('maxlength')) {
    return `مقدار ویژگی نباید بیش‌تر از ${formatDigits(VARIANT_ATTRIBUTE_VALUE_MAX)} کاراکتر باشد.`;
  }

  return null;
}

/**
 * The list-level message shown above the rows when the last row is deleted or
 * the user tries to leave the tab with no variants (tc 6).
 *
 * It reads the touched flag on purpose: an untouched empty form explains itself
 * through the empty state, and a red banner on first paint would be noise.
 */
export function variantsRequiredError(variants: FormArray): string | null {
  return variants.hasError('requiredVariants') && variants.touched
    ? 'حداقل یک واریانت باید تعریف شود.'
    : null;
}
