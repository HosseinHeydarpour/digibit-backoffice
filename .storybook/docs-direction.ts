/**
 * Reading direction for the bilingual docs pages.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The docs pages are written twice — Persian first, English second — and every
 * page therefore mixes two scripts. RTL is the right default for the page, but
 * it is the wrong direction for the English half: a Latin paragraph in an RTL
 * block is right-aligned, its list markers and table columns are mirrored, and
 * a reader has to hunt for the start of every line. Nobody notices a single
 * sentence; a page where half the paragraphs start on the wrong side is exactly
 * what "the docs do not look right" means.
 *
 * The fix cannot live in the MDX. There are ten pages and hundreds of blocks,
 * and a hand-written `dir` on each one would be forgotten the first time a page
 * is edited. Instead the docs container calls `watchDocsDirection` once and
 * every block is oriented from its own text:
 *
 *   - a block with no Persian letters and some Latin ones is LTR,
 *   - a block dominated by Latin (`latin > rtl * 3`) is LTR,
 *   - everything else stays RTL.
 *
 * Headings are the exception. The Persian half of a heading carries English
 * terms (`کاربرد / Use case — when to open Storybook`), so the Latin letters can
 * outnumber the Persian ones while the title is still Persian-first. For a
 * heading, the presence of *any* Persian letter keeps it RTL; only an
 * entirely-English heading flips.
 *
 * WHY A MUTATION OBSERVER
 * -----------------------
 * The docs container renders first and Storybook mounts the MDX page inside
 * it, so at container mount there may be nothing to orient yet. The same
 * observer also covers a docs page navigated to from the sidebar, where the
 * container is not remounted and the content is swapped underneath it.
 *
 * The pass is synchronous on purpose. Batching it into `requestAnimationFrame`
 * looks tidier for a React render that produces many mutations, but rAF does
 * not run while the preview document is hidden — a docs page opened in a
 * background tab, or driven by a screenshot tool, would render every English
 * block on the wrong side and only correct itself once somebody looked at it.
 * The work is a single `querySelectorAll` over the docs content, so doing it
 * inline is cheap and deterministic.
 *
 * WHAT IS DELIBERATELY NOT TOUCHED
 * --------------------------------
 * - An element that already carries an authored `dir` keeps it. The marker
 *   attribute is how this module tells its own decision from an author's.
 * - Story canvases embedded in an autodocs page: those are live Angular
 *   components whose direction belongs to the preview decorator, not to the
 *   surrounding docs text.
 * - `pre` / `code`: the stylesheet forces code to LTR unconditionally, because
 *   a bidi re-ordering of code is never correct.
 */

const PERSIAN_LETTER = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/g;
const LATIN_LETTER = /[A-Za-z]/g;

export type BlockDirection = 'rtl' | 'ltr';

/** How a block's own text should be laid out. Pure, so it is easy to reason about. */
export function resolveBlockDirection(
  text: string,
  kind: 'heading' | 'block' = 'block',
): BlockDirection {
  const persian = text.match(PERSIAN_LETTER)?.length ?? 0;
  const latin = text.match(LATIN_LETTER)?.length ?? 0;

  if (persian === 0) return latin > 0 ? 'ltr' : 'rtl';
  if (kind === 'heading') return 'rtl';
  return latin > persian * 3 ? 'ltr' : 'rtl';
}

/**
 * Blocks whose text can be classified. Table cells inherit their table's
 * direction, and `h1` is deliberately absent: it is the page title, not a
 * language block, so it stays on the page's own reading side (right on the
 * shipping RTL configuration) even when the title is an English name such as
 * "ConfirmService".
 */
const BLOCK_SELECTOR = 'p, li, blockquote, table, h2, h3, h4, h5, h6, figcaption';

const STORY_CANVAS_SELECTOR = '.docs-story, .sb-story, [id^="story--"]';

const DIRECTION_MARKER = 'docsDirection';

/**
 * Orients every text block inside `root` that this module has not authored
 * over. Idempotent: an element already pointing the right way is left alone,
 * so the observer cannot churn the DOM.
 *
 * `pageDirection` is the Direction toolbar's choice. The bilingual pass is for
 * the shipping RTL configuration; the LTR option is a diagnostic that exists so
 * a reviewer can see the whole page as it would lay out LTR, and keeping half of
 * it RTL would defeat that. In LTR mode the blocks this module owns are reset to
 * inherit again rather than being forced to one side.
 */
export function orientDocsBlocks(root: ParentNode, pageDirection: BlockDirection = 'rtl'): void {
  for (const element of root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)) {
    // Live components belong to the preview, not to the docs text.
    if (element.closest(STORY_CANVAS_SELECTOR)) continue;

    if (pageDirection === 'ltr') {
      if (element.dataset[DIRECTION_MARKER] === 'auto') {
        element.removeAttribute('dir');
        element.removeAttribute('data-docs-direction');
      }
      continue;
    }

    const authored = element.hasAttribute('dir') && element.dataset[DIRECTION_MARKER] !== 'auto';
    if (authored) continue;

    const heading = /^H[1-6]$/.test(element.tagName);
    const direction = resolveBlockDirection(
      element.textContent ?? '',
      heading ? 'heading' : 'block',
    );

    if (element.getAttribute('dir') !== direction) element.setAttribute('dir', direction);
    element.dataset[DIRECTION_MARKER] = 'auto';
  }
}

/** The Direction toolbar's current choice, read off the wrapper the container owns. */
function pageDirection(): BlockDirection {
  return document.querySelector('.docs-shell')?.getAttribute('dir') === 'ltr' ? 'ltr' : 'rtl';
}

/** Re-orients the current docs page, if there is one. */
export function refreshDocsDirection(): void {
  const content = document.querySelector('.sbdocs-content');
  if (content) orientDocsBlocks(content, pageDirection());
}

/**
 * Applies `refreshDocsDirection` now and after every later docs render.
 *
 * Two observers, because there are two different events: the content mounts or
 * changes (body children / text), and the Direction toolbar flips (the `dir`
 * attribute on `.docs-shell`). Attribute changes are not observed on the body —
 * setting `dir` on a block here would otherwise re-enter the observer.
 *
 * Returns a disposer so the container can stop observing on unmount. The style
 * is the same as a React effect: one subscription, cleaned up once.
 */
export function watchDocsDirection(target: Node = document.body): () => void {
  const contentObserver = new MutationObserver(refreshDocsDirection);
  contentObserver.observe(target, { childList: true, subtree: true, characterData: true });

  const shell = document.querySelector('.docs-shell');
  const shellObserver = new MutationObserver(refreshDocsDirection);
  if (shell) shellObserver.observe(shell, { attributes: true, attributeFilter: ['dir'] });

  refreshDocsDirection();

  return () => {
    contentObserver.disconnect();
    shellObserver.disconnect();
  };
}
