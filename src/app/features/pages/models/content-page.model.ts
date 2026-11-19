// src/app/features/pages/models/content-page.model.ts
//
// Types only. The four slugs are FIXED by the site (about/contact/terms/faq);
// the editor changes their content, never their identity.

export interface ContentPage {
  /** Fixed route key: `about`, `contact`, `terms`, `faq`. */
  readonly slug: string;
  readonly title: string;
  readonly body: string;
  readonly metaTitle: string;
  readonly metaDescription: string;
  /** UTC milliseconds of the last save. */
  readonly updatedAt: number;
}

/** What the editor sends; the slug and timestamp stay server-owned. */
export interface ContentPageInput {
  readonly title: string;
  readonly body: string;
  readonly metaTitle: string;
  readonly metaDescription: string;
}
