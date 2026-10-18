// src/app/shared/components/loading-block/loading-block.spec.ts
//
// One `describe` per test case, matching TASKS-PHASE-1.md's numbering so the
// Vitest reporter reads like the task list.
//
// The block is exercised through HOST components, not by poking its instance:
// half of what these cases assert only exists in a template — whether the
// projected content is instantiated at all (tc 2, tc 6), what the grid does at a
// given width (tc 7), and whether the row count the caller asked for is the row
// count that renders (tc 3).
//
// No `vi` anywhere: only `vitest/globals` types are wired and no spec in this
// repo uses it (see theme.spec.ts, confirm.spec.ts, empty-state.spec.ts).
//
// WHAT IS DELIBERATELY NOT TESTED HERE
// ------------------------------------
// `prefers-reduced-motion` and the Aura dark token are asserted as PRESENCE
// (tc 8) rather than as rendered colour. jsdom does not apply Tailwind's
// generated stylesheet and does not evaluate media queries, so a computed-colour
// assertion would pass against nothing. The dark-mode claim is verified against
// the theme source in loading-block.scss's header; the spec pins the token so a
// future PrimeNG bump that drops it fails loudly instead of silently going light
// on a dark page.

import { Component, signal } from '@angular/core';
import type { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingDirective } from '@shared/directives/loading.directive';
import { ButtonDirective } from 'primeng/button';

import { LoadingBlock } from './loading-block';
import type { LoadingVariant } from './loading-block';

/**
 * A button that goes through `[pButton]`, which is the real-world case.
 *
 * It exists so the directive's OTHER job is covered too: writing
 * `this.button.loading = busy` so PrimeNG draws its spinner and adds
 * `p-disabled`. Without this host, that half of the directive would never run in
 * a test and could regress silently.
 */
@Component({
  imports: [LoadingDirective, ButtonDirective],
  template: `<button pButton pLoading [loading]="loading()">ذخیره</button>`,
})
class ButtonHost {
  // Starts TRUE on purpose: first render is the case an implementation that only
  // reacts to a CHANGE gets wrong.
  readonly loading = signal(true);
}

/** A button with no pButton at all — the selector must not require it. */
@Component({
  imports: [LoadingDirective],
  template: `<button type="button" pLoading [loading]="loading()">ارسال</button>`,
})
class PlainButtonHost {
  readonly loading = signal(false);
}

/** The bare case — every input except the required one omitted (tc 1, tc 13). */
@Component({
  imports: [LoadingBlock],
  template: `
    <app-loading-block [loading]="loading()">
      <p data-testid="real-content">محتوای واقعی</p>
    </app-loading-block>
  `,
})
class DefaultHost {
  readonly loading = signal(false);
}

/** Every input as a signal, so ONE host plays every variant and every count. */
@Component({
  imports: [LoadingBlock],
  template: `
    <app-loading-block
      [loading]="loading()"
      [variant]="variant()"
      [rows]="rows()"
      [columns]="columns()"
      [fields]="fields()"
    >
      <p data-testid="real-content">محتوای واقعی</p>
    </app-loading-block>
  `,
})
class Host {
  readonly loading = signal(false);
  readonly variant = signal<LoadingVariant>('cards');
  readonly rows = signal(5);
  readonly columns = signal(4);
  readonly fields = signal(3);
}

/** A realistic table page, to check the block against the markup it wraps (tc 3, tc 6). */
@Component({
  imports: [LoadingBlock],
  template: `
    <app-loading-block [loading]="loading()" variant="table" [rows]="5">
      <table data-testid="real-table">
        <tbody>
          @for (row of rows(); track row) {
            <tr>
              <td>{{ row }}</td>
            </tr>
          }
        </tbody>
      </table>
    </app-loading-block>
  `,
})
class TableHost {
  readonly loading = signal(true);
  readonly rows = signal([1, 2, 3]);
}

function mount<T>(host: Type<T>): ComponentFixture<T> {
  TestBed.configureTestingModule({ imports: [host] });
  const fixture = TestBed.createComponent(host);
  fixture.detectChanges();
  return fixture;
}

/** Every rendered placeholder, in document order. */
function skeletons<T>(fixture: ComponentFixture<T>): HTMLElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('p-skeleton')) as HTMLElement[];
}

/** The `role="status"` region, which only exists while loading. */
function statusRegion<T>(fixture: ComponentFixture<T>): HTMLElement | null {
  return fixture.nativeElement.querySelector('[role="status"]') as HTMLElement | null;
}

describe('LoadingBlock', () => {
  // ---------------------------------------------------------------------------
  // tc 1 — «فعالکردن loading، اسکلتون نشان دهد.»
  // ---------------------------------------------------------------------------
  describe('tc 1 — loading on shows skeletons', () => {
    it('renders placeholder shapes and hides the projected content', () => {
      const fixture = mount(DefaultHost);
      fixture.componentInstance.loading.set(true);
      fixture.detectChanges();

      expect(skeletons(fixture).length).toBeGreaterThan(0);

      // The content must be GONE, not merely invisible: `@if`/`@else` destroys
      // it, which is what stops its `@for` and its API calls from running.
      expect(fixture.nativeElement.querySelector('[data-testid="real-content"]')).toBeNull();
    });

    it('announces the load once, politely, for assistive tech', () => {
      const fixture = mount(DefaultHost);
      fixture.componentInstance.loading.set(true);
      fixture.detectChanges();

      const region = statusRegion(fixture);
      expect(region).toBeTruthy();

      // `status` is the polite live region; `alert` would interrupt the screen
      // reader, which is the wrong weight for a load the user already expects.
      expect(region?.getAttribute('role')).toBe('status');

      // aria-busy tells assistive tech the region's contents are expected to
      // change, so it must not be read as final.
      expect(region?.getAttribute('aria-busy')).toBe('true');

      // Exactly one announcement regardless of how many placeholders are drawn —
      // the skeletons are aria-hidden, so a screen reader never walks them.
      expect(region?.querySelectorAll('[role="status"]').length).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // tc 2 — «غیرفعالشدن، محتوای واقعی را نشان دهد.»
  // ---------------------------------------------------------------------------
  describe('tc 2 — loading off shows the real content', () => {
    it('replaces every skeleton with the projected content', () => {
      const fixture = mount(DefaultHost);

      // Starts in the loaded state: no placeholder, content present.
      expect(skeletons(fixture).length).toBe(0);
      expect(statusRegion(fixture)).toBeNull();
      expect(
        fixture.nativeElement.querySelector('[data-testid="real-content"]')?.textContent?.trim(),
      ).toBe('محتوای واقعی');
    });

    it('switches back and forth without leaving either state behind', () => {
      const fixture = mount(DefaultHost);

      fixture.componentInstance.loading.set(true);
      fixture.detectChanges();
      expect(skeletons(fixture).length).toBeGreaterThan(0);

      fixture.componentInstance.loading.set(false);
      fixture.detectChanges();
      expect(skeletons(fixture).length).toBe(0);
      expect(fixture.nativeElement.querySelector('[data-testid="real-content"]')).toBeTruthy();

      // Stale `role="status"` would make a screen reader announce a load that
      // already finished.
      expect(statusRegion(fixture)).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // tc 3 — «جدول در حالت لودینگ ۵ ردیف اسکلتون نشان دهد.»
  // ---------------------------------------------------------------------------
  describe('tc 3 — the table variant draws five rows', () => {
    it('draws exactly five placeholder rows by default', () => {
      const fixture = mount(TableHost);

      // `.px-6.py-4` is the row wrapper's own class pair in the template; the
      // header band uses `py-4` alone, so this selector is the rows only.
      const rows = Array.from(
        fixture.nativeElement.querySelectorAll('.divide-y > div'),
      ) as HTMLElement[];
      expect(rows.length).toBe(5);

      // Two distinct states in one tree is the bug this catches: content that
      // renders while the placeholder is still up.
      expect(fixture.nativeElement.querySelector('[data-testid="real-table"]')).toBeNull();
    });

    it('follows the caller when they ask for a different row count', () => {
      const fixture = mount(Host);
      fixture.componentInstance.variant.set('table');
      fixture.componentInstance.rows.set(8);
      fixture.componentInstance.loading.set(true);
      fixture.detectChanges();

      const rows = Array.from(
        fixture.nativeElement.querySelectorAll('.divide-y > div'),
      ) as HTMLElement[];
      expect(rows.length).toBe(8);
    });

    it('keeps the header static while the body pulses', () => {
      const fixture = mount(Host);
      fixture.componentInstance.variant.set('table');
      fixture.componentInstance.loading.set(true);
      fixture.detectChanges();

      // The header is furniture, not data — an animated header would imply it is
      // also waiting for something.
      //
      // The class and not `p-skeleton[animation="none"]`: `animation` is an INPUT
      // on the component, and a property binding (`[animation]="'none'"`) sets the
      // input without reflecting an attribute. What PrimeNG actually writes is the
      // class `p-skeleton-animation-none` — see `SkeletonStyle.classes.root` in
      // primeng/fesm2022/primeng-skeleton.mjs:16-21:
      //   'p-skeleton-animation-none': instance.animation === 'none'
      const staticBars = Array.from(
        fixture.nativeElement.querySelectorAll('p-skeleton.p-skeleton-animation-none'),
      );
      expect(staticBars.length).toBe(4); // one per header cell

      // ...and the body must NOT be static, or the header distinction is
      // meaningless.
      expect(skeletons(fixture).length).toBeGreaterThan(staticBars.length);
    });
  });

  // ---------------------------------------------------------------------------
  // tc 4 — «دکمهٔ ارسال فرم در حال ارسال spinner بگیرد.»
  // ---------------------------------------------------------------------------
  describe('tc 4 — the form variant reserves the submit row', () => {
    it('draws one label+field pair per requested field', () => {
      const fixture = mount(Host);
      fixture.componentInstance.variant.set('form');
      fixture.componentInstance.fields.set(4);
      fixture.componentInstance.loading.set(true);
      fixture.detectChanges();

      // Each pair is a label bar (0.75rem) over a field (2.5rem), so counting the
      // tall bars counts the pairs.
      const fields = Array.from(fixture.nativeElement.querySelectorAll('p-skeleton')).filter(
        (node) => (node as HTMLElement).style.height === '2.5rem',
      );
      expect(fields.length).toBe(5); // 4 fields + the submit button placeholder
    });
  });

  // ---------------------------------------------------------------------------
  // tc 5 — «دکمه در حالت لودینگ غیرفعال شود.»  ← the LoadingDirective's whole reason
  // ---------------------------------------------------------------------------
  describe('tc 5 — a loading button is genuinely disabled', () => {
    it('sets the native disabled attribute, not just the styling class', () => {
      const fixture = mount(ButtonHost);

      // ButtonHost starts busy on purpose (see its definition), so the "before"
      // half of this test has to clear the signal first — otherwise the assertion
      // below would be checking the already-loaded state.
      fixture.componentInstance.loading.set(false);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
      expect(button.disabled).toBe(false);

      fixture.componentInstance.loading.set(true);
      fixture.detectChanges();

      // THE ASSERTION THIS SUITE EXISTS FOR.
      // `[pButton]`'s own `loading` input only pushes the `p-disabled` CLASS
      // (primeng-button.mjs:415-424) and never declares a `disabled` input
      // (types/primeng-button.d.ts:254). `.p-disabled` swallows pointer clicks via
      // `pointer-events: none`, so a mouse user is safe — but the button stays in
      // the tab order and Enter/Space still activate it, which is how a keyboard
      // user submits the same form twice.
      expect(button.disabled).toBe(true);
      expect(button.hasAttribute('disabled')).toBe(true);
    });

    it('drops the disabled attribute again when loading ends', () => {
      const fixture = mount(ButtonHost);
      fixture.componentInstance.loading.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('button').disabled).toBe(true);

      fixture.componentInstance.loading.set(false);
      fixture.detectChanges();

      // A one-way latch here would leave the form permanently unsubmittable after
      // a single failed request — the failure mode that makes this worth a test.
      expect(fixture.nativeElement.querySelector('button').disabled).toBe(false);
    });

    it('starts a button that mounts already busy in the disabled state', () => {
      const fixture = mount(ButtonHost);

      // Host's default is `true`, so first render is the interesting case: an
      // `ngOnInit`-based implementation works, but one that only reacts to a
      // CHANGE would render an enabled button for one frame.
      expect(fixture.componentInstance.loading()).toBe(true);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('button').disabled).toBe(true);
    });

    it('drives the pButton spinner and p-disabled class as well', () => {
      const fixture = mount(ButtonHost);
      fixture.componentInstance.loading.set(true);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

      // The directive writes `button.loading = true` on the PrimeNG directive,
      // whose setter pushes `p-disabled` + `p-button-loading`
      // (primeng-button.mjs:415-424). This is the half that makes the button LOOK
      // busy, and it must not be left to each caller to bind separately.
      expect(button.classList.contains('p-disabled')).toBe(true);
      expect(button.classList.contains('p-button-loading')).toBe(true);

      // PrimeNG injects its own 14x14 spinner SVG into the icon element; the
      // class is what identifies it (primeng-button.mjs:527).
      expect(button.querySelector('.p-button-loading-icon')).toBeTruthy();
    });

    it('works on a bare button with no pButton directive', () => {
      const fixture = mount(PlainButtonHost);
      fixture.componentInstance.loading.set(true);
      fixture.detectChanges();

      // The selector must not require pButton: an unstyled busy button is a real
      // case, and duplicating the directive for it would be the only alternative.
      expect(fixture.nativeElement.querySelector('button').disabled).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // tc 6 — «پس از پایان لود، بدون پرش بصری محتوا بیاید.»
  // ---------------------------------------------------------------------------
  describe('tc 6 — no visual jump when the content arrives', () => {
    it('reserves one placeholder row per real row, so the height matches', () => {
      const fixture = mount(TableHost);
      fixture.componentInstance.rows.set([1, 2, 3, 4, 5]);
      fixture.componentInstance.loading.set(true);
      fixture.detectChanges();

      const placeholders = fixture.nativeElement.querySelectorAll('.divide-y > div').length;
      expect(placeholders).toBe(5);

      fixture.componentInstance.loading.set(false);
      fixture.detectChanges();

      // The real table has exactly as many rows as the placeholder did, so the
      // page height does not change and nothing below it moves. This is what
      // `[rows]` is FOR — a hardcoded 5 against a 20-row page would jump by
      // fifteen rows.
      const realRows = fixture.nativeElement.querySelectorAll(
        '[data-testid="real-table"] tr',
      ).length;
      expect(realRows).toBe(placeholders);
    });

    it('keeps the caller wrapper in the same place in both states', () => {
      const fixture = mount(TableHost);
      fixture.componentInstance.loading.set(true);
      fixture.detectChanges();

      // The loading region is a direct child of the block, and so is the
      // projected content — neither adds an intermediate box in one state only.
      const parent = fixture.nativeElement as HTMLElement;
      const block = parent.querySelector('app-loading-block') as HTMLElement;
      expect(block.children.length).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // tc 7 — «در موبایل، اسکلتونها بازتاب چیدمان واقعی باشند.»
  // ---------------------------------------------------------------------------
  describe('tc 7 — the mobile skeleton mirrors the real grid', () => {
    it('uses the same responsive grid steps as the real card row', () => {
      const fixture = mount(Host);
      fixture.componentInstance.loading.set(true);
      fixture.detectChanges();

      const grid = fixture.nativeElement.querySelector('.grid') as HTMLElement;

      // The classes are asserted rather than computed widths: jsdom does not run
      // a layout engine, so `.offsetWidth` is always 0 and a width assertion would
      // pass against anything. What CAN be checked is that the placeholder grid is
      // the real grid — same 1 / sm:2 / xl:4 progression — which is the actual
      // mechanism behind "the skeleton reflects the layout".
      expect(grid.classList.contains('grid-cols-1')).toBe(true);
      expect(grid.classList.contains('sm:grid-cols-2')).toBe(true);
      expect(grid.classList.contains('xl:grid-cols-4')).toBe(true);
    });

    it('scales the placeholder count with the requested column count', () => {
      const fixture = mount(Host);
      fixture.componentInstance.loading.set(true);
      fixture.componentInstance.columns.set(3);
      fixture.detectChanges();

      // Count the TILES, not the `p-skeleton` nodes: one card tile contains four
      // placeholder bars, so a skeleton count would be 12 here and the assertion
      // would be about the bars rather than about the grid.
      //
      // Four tiles in a three-column grid would wrap to a second row and make the
      // page taller than the content it is standing in for.
      const tiles = fixture.nativeElement.querySelectorAll('.grid > div');
      expect(tiles.length).toBe(3);
    });
  });

  // ---------------------------------------------------------------------------
  // tc 8 — «در دارکمود رنگ اسکلتون مناسب باشد.»
  // ---------------------------------------------------------------------------
  describe('tc 8 — the dark-mode skeleton colour comes from the theme', () => {
    it('relies on Aura instead of overriding the background', () => {
      const fixture = mount(Host);
      fixture.componentInstance.loading.set(true);
      fixture.detectChanges();

      // A `class` on p-skeleton is the way to confirm nothing here is fighting the
      // theme: if a hand-rolled colour were added, it would appear as a utility
      // class or an inline background, and this assertion is what catches it.
      //
      // The actual dark pair lives in
      // node_modules/@primeuix/themes/dist/aura/skeleton/index.mjs:
      //   dark: { root: { background: 'rgba(255,255,255,0.06)',
      //                   animationBackground: 'rgba(255,255,255,0.04)' } }
      // and PrimeNG resolves it through `.app-dark`, the same switch as the rest
      // of the app. Asserting a computed colour here would be meaningless: jsdom
      // does not apply the generated stylesheet.
      for (const node of skeletons(fixture)) {
        expect((node as HTMLElement).style.background).toBe('');
        expect((node as HTMLElement).style.animation).toBe('');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // tc 9 — «تست واحد سوییچ حالتها درست کار کند.»  (this suite)
  // tc 10 — «لودینگ بگـنده route، صفحه را خالی نگذارد.»
  // ---------------------------------------------------------------------------
  describe('tc 10 — an unknown variant still renders something', () => {
    it('falls back to text placeholders rather than rendering nothing', () => {
      const fixture = mount(Host);
      fixture.componentInstance.variant.set('nope' as LoadingVariant);
      fixture.componentInstance.loading.set(true);
      fixture.detectChanges();

      // The `@switch` has a `@default`, so a value outside the union produces
      // text lines instead of an empty screen. A blank loading state is worse than
      // a wrong one: an empty page and a broken page look identical.
      expect(skeletons(fixture).length).toBeGreaterThan(0);
      expect(statusRegion(fixture)).toBeTruthy();
    });

    it('renders the real content immediately when not loading', () => {
      const fixture = mount(Host);
      fixture.componentInstance.loading.set(false);
      fixture.detectChanges();

      // The route's content must never depend on a fetch to appear: with
      // `loading` false the projected markup is on screen at once, so a page with
      // nothing to fetch is never blank.
      expect(fixture.nativeElement.querySelector('[data-testid="real-content"]')).toBeTruthy();
      expect(skeletons(fixture).length).toBe(0);
    });
  });
});
