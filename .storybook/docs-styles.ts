/**
 * Presentation for the hand-written docs pages.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The docs container (`.storybook/docs-container.ts`) already fixes the two
 * things Storybook cannot: the page direction and the docs theme. What it does
 * not fix is how the MDX itself is typeset. Storybook's docs stylesheet is a
 * neutral default, and three of its rules are actively wrong for a Persian,
 * bilingual catalogue:
 *
 * 1. **Physical offsets.** Storybook places the heading copy-link with
 *    `right: 100%; padding-right: 8px` and indents every list with
 *    `padding-left: 30px`. Both are physical, so in an RTL document the link
 *    floats in the *left* gutter and the list gets 30px of padding on the
 *    empty side while its bullets hang off the right edge. The overrides below
 *    restate both with logical properties, which is also the house rule in
 *    `AGENTS.md` — no physical `left` / `right`.
 * 2. **One type scale for two scripts.** Persian needs more line height and a
 *    heavier heading weight than the Latin default; Storybook's `h2` is 400
 *    weight at 24px with a hairline, which reads as a section *label* rather
 *    than a chapter. The scale below is the one the admin panel uses.
 * 3. **Neutral code and tables.** Storybook's code block is transparent, and
 *    its tables are unbounded and only as wide as their content. A docs page
 *    full of API signatures needs a surface, a border and a radius, so a code
 *    sample reads as a block and a table reads as part of the page.
 *
 * WHY THE CSS LIVES IN A TS FILE
 * ------------------------------
 * It is injected as a single `<style>` element by the docs container and is
 * scoped to `.docs-shell`, the wrapper that container renders. That keeps the
 * styling out of the application bundle, out of the story canvas, and out of
 * `angular.json` — importing a CSS file from `preview.ts` would need its own
 * module declaration and would load the rules for every story too. A docs-only
 * concern stays a docs-only file.
 *
 * COLOUR
 * ------
 * Every value below comes from the same palette as the app and the manager
 * theme (`src/styles/tailwind.css`, `.storybook/theme.ts`). The dark variant is
 * the panel's `background-dark` / `card-dark` pair, so a dark docs page and a
 * dark canvas are one continuous surface. Links use `primaryDark` on light and
 * a lightened brand on dark because the raw `#FF8229` does not meet contrast
 * for body text on white.
 */

export const DOCS_STYLES = `
.docs-shell {
  --docs-bg: #f1f5f9;
  --docs-surface: #ffffff;
  --docs-border: #e2e8f0;
  --docs-border-strong: #cbd5e1;
  --docs-text: #334155;
  --docs-heading: #0f172a;
  --docs-muted: #64748b;
  --docs-accent: #ff8229;
  --docs-link: #b76122;
  --docs-code-bg: #f8fafc;
  --docs-code-border: #e2e8f0;
  --docs-inline-bg: #eef2f7;
  --docs-inline-border: #dbe3ec;
  --docs-head-row: #f1f5f9;
  --docs-zebra: #f8fafc;
  --docs-shadow: 0 1px 2px rgb(15 23 42 / 0.04), 0 24px 48px -24px rgb(15 23 42 / 0.16);
  --docs-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, 'Liberation Mono', monospace;
}

.docs-shell--dark {
  --docs-bg: #0b1220;
  --docs-surface: #111c2e;
  --docs-border: #24324a;
  --docs-border-strong: #334155;
  --docs-text: #cbd5e1;
  --docs-heading: #f8fafc;
  --docs-muted: #94a3b8;
  --docs-accent: #ff9847;
  --docs-link: #ffb27a;
  --docs-code-bg: #0b1526;
  --docs-code-border: #22304a;
  --docs-inline-bg: #1b2942;
  --docs-inline-border: #2b3a55;
  --docs-head-row: #16233a;
  --docs-zebra: #16233a;
  --docs-shadow: 0 1px 2px rgb(0 0 0 / 0.4), 0 24px 48px -24px rgb(0 0 0 / 0.6);
}

/* ---------------------------------------------------------------- page shell */

.docs-shell .sbdocs-wrapper {
  background: var(--docs-bg);
  padding: 40px 32px 80px;
}

.docs-shell .sbdocs-content {
  max-width: 1080px;
  padding: 48px 56px 64px;
  background: var(--docs-surface);
  border: 1px solid var(--docs-border);
  border-radius: 20px;
  box-shadow: var(--docs-shadow);
  color: var(--docs-text);
  font-family: 'Payda', 'Yekan Bakh', Tahoma, system-ui, sans-serif;
  font-size: 15px;
  line-height: 1.95;
}

/* ------------------------------------------------------------------- heading */

.docs-shell .sbdocs-content h1,
.docs-shell .sbdocs-content h2,
.docs-shell .sbdocs-content h3,
.docs-shell .sbdocs-content h4,
.docs-shell .sbdocs-content h5,
.docs-shell .sbdocs-content h6 {
  color: var(--docs-heading);
  font-family: inherit;
  font-weight: 700;
  letter-spacing: -0.005em;
}

.docs-shell .sbdocs-content h1 {
  font-size: 34px;
  line-height: 1.4;
  margin: 0 0 12px;
}

.docs-shell .sbdocs-content h2 {
  position: relative;
  font-size: 22px;
  line-height: 1.55;
  margin: 44px 0 16px;
  padding: 0 0 10px;
  border-bottom: 1px solid var(--docs-border);
}

.docs-shell .sbdocs-content h2::after {
  content: '';
  position: absolute;
  inset-inline-start: 0;
  bottom: -1px;
  width: 54px;
  height: 3px;
  border-radius: 3px;
  background: var(--docs-accent);
}

.docs-shell .sbdocs-content h3 {
  font-size: 17px;
  line-height: 1.6;
  margin: 30px 0 10px;
}

.docs-shell .sbdocs-content h4 {
  font-size: 15px;
  line-height: 1.7;
  margin: 24px 0 8px;
}

/* --------------------------------------------------------------- copy blocks */

.docs-shell .sbdocs-content p {
  margin: 14px 0;
  font-size: 15px;
  line-height: 1.95;
  color: var(--docs-text);
}

.docs-shell .sbdocs-content strong {
  color: var(--docs-heading);
  font-weight: 700;
}

.docs-shell .sbdocs-content ul,
.docs-shell .sbdocs-content ol {
  margin: 16px 0;
  padding: 0;
  padding-inline-start: 1.7rem;
}

.docs-shell .sbdocs-content li {
  margin: 6px 0;
  font-size: 15px;
  line-height: 1.9;
  color: var(--docs-text);
}

.docs-shell .sbdocs-content li > p {
  margin: 6px 0;
}

.docs-shell .sbdocs-content li::marker {
  color: var(--docs-accent);
  font-weight: 700;
}

.docs-shell .sbdocs-content blockquote {
  margin: 20px 0;
  padding: 14px 18px;
  border: 0;
  border-inline-start: 3px solid var(--docs-accent);
  border-radius: 12px;
  background: var(--docs-code-bg);
  color: var(--docs-muted);
}

.docs-shell .sbdocs-content blockquote > :first-of-type {
  margin-top: 0;
}

.docs-shell .sbdocs-content blockquote > :last-child {
  margin-bottom: 0;
}

.docs-shell .sbdocs-content a {
  color: var(--docs-link);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

.docs-shell .sbdocs-content a:hover {
  color: var(--docs-accent);
}

/*
 * The heading copy-link is absolutely positioned by Storybook with a physical
 * right offset. The logical inset-inline-start / inset-inline-end pair resolves
 * to the same side in LTR (so the link still hangs in the gutter) and flips to
 * the right-hand gutter in RTL, which is where the heading text actually
 * starts. The physical declaration it replaces is overridden because both map
 * to the same resolved property and this selector is more specific.
 */
.docs-shell .sbdocs-content :is(h1, h2, h3, h4, h5, h6) > span > span {
  inset-inline-start: auto;
  inset-inline-end: 100%;
  padding: 0;
  padding-inline-end: 8px;
}

.docs-shell .sbdocs-content :is(h1, h2, h3, h4, h5, h6) a {
  color: inherit;
  text-decoration: none;
}

.docs-shell .sbdocs-content hr {
  margin: 36px 0;
  height: 1px;
  border: 0;
  background: var(--docs-border);
}

.docs-shell .sbdocs-content img {
  max-width: 100%;
  height: auto;
  border: 1px solid var(--docs-border);
  border-radius: 12px;
}

/* -------------------------------------------------------------------- tables */

.docs-shell .sbdocs-content table {
  width: 100%;
  margin: 20px 0;
  font-size: 13.5px;
  line-height: 1.8;
  border: 1px solid var(--docs-border);
  border-collapse: separate;
  border-spacing: 0;
  border-radius: 12px;
  overflow: hidden;
}

/* Storybook paints every row and stripes even ones; the card does its own. */
.docs-shell .sbdocs-content table tr {
  border: 0;
  background: transparent;
}

.docs-shell .sbdocs-content table thead tr {
  background: var(--docs-head-row);
}

.docs-shell .sbdocs-content table tbody tr:nth-of-type(2n) {
  background: var(--docs-zebra);
}

.docs-shell .sbdocs-content table th {
  padding: 11px 14px;
  border: 0;
  border-bottom: 1px solid var(--docs-border);
  color: var(--docs-heading);
  font-size: 12.5px;
  font-weight: 700;
  text-align: start;
  vertical-align: middle;
}

.docs-shell .sbdocs-content table td {
  padding: 11px 14px;
  border: 0;
  border-bottom: 1px solid var(--docs-border);
  color: var(--docs-text);
  vertical-align: top;
}

.docs-shell .sbdocs-content table tbody tr:last-child td {
  border-bottom: 0;
}

/* --------------------------------------------------------------------- code */

/*
 * Storybook lays a fenced block out as a flex row: the code and, beside it, a
 * 45px column holding the Copy button. Styling only the pre element therefore gives
 * a bordered box that stops short of the button. The surface moves to the
 * wrapper so the sample and its control are one block, and the Copy button
 * becomes a small chip at the visual end of that block.
 */
.docs-shell .sbdocs-content .docblock-source {
  display: flex;
  align-items: stretch;
  margin: 20px 0;
  background: var(--docs-code-bg);
  border: 1px solid var(--docs-code-border);
  border-radius: 12px;
  overflow: hidden;
}

.docs-shell .sbdocs-content .docblock-source > div:last-child:not(:first-child) {
  display: flex;
  align-items: flex-start;
  padding: 10px;
}

.docs-shell .sbdocs-content .docblock-source button {
  margin: 0;
  padding: 3px 10px;
  border: 1px solid var(--docs-code-border);
  border-radius: 8px;
  background: var(--docs-surface);
  color: var(--docs-muted);
  font-family: inherit;
  font-size: 11.5px;
  line-height: 1.6;
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease;
}

.docs-shell .sbdocs-content .docblock-source button:hover {
  color: var(--docs-accent);
  border-color: var(--docs-accent);
}

/*
 * The direction here is deliberate and unconditional: a code sample is LTR even
 * on an RTL page, otherwise operators, indentation and punctuation are
 * re-ordered by the bidi algorithm. An English block already carries
 * dir="ltr"; a Persian paragraph around a sample must not be able to pull the
 * sample with it.
 */
.docs-shell .sbdocs-content pre.prismjs {
  direction: ltr;
  text-align: start;
  flex: 1 1 auto;
  min-width: 0;
  margin: 20px 0;
  padding: 18px 20px;
  background: var(--docs-code-bg);
  border: 1px solid var(--docs-code-border);
  border-radius: 12px;
  font-family: var(--docs-mono);
  font-size: 13px;
  line-height: 1.7;
  tab-size: 2;
  overflow-x: auto;
  white-space: pre;
}

.docs-shell .sbdocs-content .docblock-source pre.prismjs {
  margin: 0;
  background: transparent;
  border: 0;
  border-radius: 0;
}

.docs-shell .sbdocs-content pre.prismjs > div {
  direction: ltr;
  text-align: start;
}

.docs-shell .sbdocs-content :not(pre) > code {
  direction: ltr;
  unicode-bidi: isolate;
  padding: 2px 6px;
  margin: 0 2px;
  border: 1px solid var(--docs-inline-border);
  border-radius: 6px;
  background: var(--docs-inline-bg);
  color: var(--docs-heading);
  font-family: var(--docs-mono);
  font-size: 0.86em;
  font-weight: 500;
  white-space: nowrap;
}

/* ---------------------------------------------------------- narrow viewport */

@media (max-width: 900px) {
  .docs-shell .sbdocs-wrapper {
    padding: 16px 12px 48px;
  }

  .docs-shell .sbdocs-content {
    padding: 28px 22px 40px;
    border-radius: 14px;
  }

  .docs-shell .sbdocs-content h1 {
    font-size: 27px;
  }

  .docs-shell .sbdocs-content h2 {
    margin-top: 34px;
    font-size: 20px;
  }

  /*
   * A four-column API table cannot honestly shrink to a phone. Rather than let
   * it spill out of the card, the table becomes its own horizontal scroller;
   * the page itself never scrolls sideways.
   */
  .docs-shell .sbdocs-content table {
    display: block;
    overflow-x: auto;
    white-space: nowrap;
    -webkit-overflow-scrolling: touch;
  }
}
`;
