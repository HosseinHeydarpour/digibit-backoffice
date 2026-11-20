import { readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

/**
 * BO-P10: axe against the running app, not only Storybook.
 *
 * `axe-core` is already installed with the Storybook a11y addon, so this does
 * not add a dependency. Only serious/critical findings fail: the task is a
 * gate for real barriers, not a count of every advisory note.
 */
const AXE = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');

const PAGES = ['/dashboard', '/profile'];

for (const path of PAGES) {
  test(`${path} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await page.addScriptTag({ content: AXE });

    const violations = await page.evaluate(async () => {
      const axe = (
        window as unknown as {
          axe: {
            run: (
              context: Document,
              options: { runOnly: string[] },
            ) => Promise<{
              violations: Array<{ id: string; help: string; impact: string; nodes: unknown[] }>;
            }>;
          };
        }
      ).axe;

      const result = await axe.run(document, {
        runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
      });

      return result.violations
        .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
        .map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length})`);
    });

    expect(violations).toEqual([]);
  });
}
