/**
 * The three slots a banner can live in (BO-L01).
 *
 * Shared because BOTH the banner feature and the mock fixture need the closed
 * set: a typo in a fixture would otherwise be a string the UI never matches.
 * The Persian labels stay in the feature (`banner-labels.ts`).
 */
export type BannerPosition = 'home-top' | 'home-middle' | 'sidebar';
