// src/app/features/brands/brand-form/brand-logo.ts
//
// The pure logo rules (BO-G06).
//
// WHY THIS FILE EXISTS
// --------------------
// The dialog, its spec and the Storybook story all need the same size, the same
// three MIME types and the same Persian sentences. A second copy of «۱ مگابایت»
// in a template is how the hint and the validation start disagreeing.
//
// WHY TYPE IS CHECKED BEFORE SIZE
// -------------------------------
// A 2 MB PDF is not a logo. Reporting «حجمش زیاد است» would suggest that a
// smaller PDF is fine, which it is not.
//
// WHY THE ALT IS A FUNCTION
// -------------------------
// «سامسونگ — لوگو» is the accessibility contract (tc 10): the image belongs to
// the brand, and a nameless draft still gets a usable sentence instead of
// « — لوگو».

/** The server's hard limit; the client only makes the failure immediate. */
export const MAX_LOGO_SIZE = 1 * 1024 * 1024;

/** Exactly the three formats the media endpoint accepts. */
export const ACCEPTED_LOGO_TYPES = ['image/png', 'image/svg+xml', 'image/webp'] as const;

/** The `accept` attribute; one string because that is what an `<input>` reads. */
export const LOGO_ACCEPT = ACCEPTED_LOGO_TYPES.join(',');

/** The field hint, derived from the same numbers as the validation. */
export const LOGO_HINT = 'PNG، SVG یا WebP تا ۱ مگابایت';

/** Why `validateLogoFile` rejected a file. `null` means "accepted". */
export type LogoFileError = 'type' | 'size';

/**
 * TRACE — `validateLogoFile(new File([…], 'logo.pdf', { type: 'application/pdf' }))`
 * returns `'type'`; the form shows `logoErrorMessage` and no request is made.
 * A 1.2 MB WebP returns `'size'`; a 1 MB SVG returns `null` and becomes a preview.
 */
export function validateLogoFile(file: File): LogoFileError | null {
  if (!ACCEPTED_LOGO_TYPES.some((type) => type === file.type)) {
    return 'type';
  }

  if (file.size > MAX_LOGO_SIZE) {
    return 'size';
  }

  return null;
}

/** The Persian sentence for one rejected file — the message lives with the rule. */
export function logoErrorMessage(file: File, error: LogoFileError): string {
  if (error === 'type') {
    return `فقط فایل PNG، SVG یا WebP مجاز است. «${file.name}» را انتخاب کردید.`;
  }

  return `حجم فایل بیشتر از ۱ مگابایت است. («${file.name}»)`;
}

/**
 * The brand's image alt (tc 10).
 *
 * TRACE: `logoAlt('سامسونگ')` → `'سامسونگ — لوگو'`; `logoAlt('  ')` →
 * `'لوگوی برند'`. The em dash is deliberate: it separates the owner from the
 * role without reading like part of the name.
 */
export function logoAlt(name: string): string {
  const trimmed = name.trim();

  return trimmed === '' ? 'لوگوی برند' : `${trimmed} — لوگو`;
}
