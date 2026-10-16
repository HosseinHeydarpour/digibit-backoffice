/**
 * One step in the breadcrumb trail.
 *
 * Real example — on `/products/12` the trail is:
 *   [{ label: 'محصولات', url: '/products' },
 *    { label: 'ویرایش محصول 12', url: '/products/12' }]
 */
export interface Breadcrumb {
  /** Persian text of the step, e.g. «محصولات». */
  readonly label: string;

  /**
   * Absolute URL the step points at, e.g. `/products/12`.
   * Every step but the last renders as a link to this URL; the last step is
   * the current page and is rendered as plain text.
   */
  readonly url: string;
}
