/**
 * A single choice for a p-select / p-dropdown / p-multiselect.
 *
 * `label` is what the user sees (Persian), `value` is what the API wants.
 * Deliberately generic so `SelectOption<number>` works for IDs and
 * `SelectOption<string>` for enum codes.
 */
export interface SelectOption<T = string> {
  label: string;
  value: T;
  /** Present when the option must be hidden from a role (e.g. disabled category). */
  disabled?: boolean;
}

/** Helper for building options from an enum-like union. */
export function toOptions<T extends string>(
  values: readonly T[],
  labels: Record<T, string>,
): SelectOption<T>[] {
  return values.map((value) => ({ label: labels[value], value }));
}
