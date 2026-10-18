// src/app/shared/directives/loading.directive.ts
//
// WHAT THIS IS
// ------------
// The one place a button learns it is busy:
//
//   <button pButton pLoading [loading]="saving()" label="ذخیره" (click)="save()"></button>
//
// WHY IT EXISTS AT ALL — the gap in PrimeNG 21
// --------------------------------------------
// `[pButton]` does have a `loading` input, and on its own it is *nearly* enough.
// Verified against the installed build
// (node_modules/primeng/fesm2022/primeng-button.mjs:415-424):
//
//   getStyleClass() {
//     ...
//     if (this.loading) {
//       styleClass.push(INTERNAL_BUTTON_CLASSES.disabled /* 'p-disabled' */,
//                       INTERNAL_BUTTON_CLASSES.loading  /* 'p-button-loading' */);
//       ...
//     }
//   }
//
// and in @primeuix/styles/dist/base/index.mjs:
//
//   .p-disabled, .p-disabled * { cursor: default; pointer-events: none; user-select: none; }
//   .p-disabled, .p-component:disabled { opacity: dt('disabled.opacity'); }  /* 0.6 */
//
// So a pointer click is already swallowed and the button already dims. What is
// MISSING is the native attribute: the directive declares no `disabled` input
// (types/primeng-button.d.ts:254 lists twenty inputs; `disabled` is not one), and
// its only host bindings are `class.p-button-icon-only` / `class.p-button-text`.
// Therefore
//
//   * the button stays in the Tab order while it is working, and
//   * Enter / Space on it activate a click that `pointer-events` never sees.
//
// That is a real hole, not a technicality: a keyboard user submitting a form can
// fire the same request twice with no visual evidence anything is wrong. tc 5
// («دکمه در حالت لودینگ غیرفعال شود») is asking for exactly the attribute that
// closes it.
//
// PrimeNG's own COMPONENT gets this right — primeng-button.mjs:824 binds
// `[disabled]="disabled || loading || buttonProps?.disabled"` — which is the
// strongest available evidence that "loading implies disabled" is the intended
// contract and the directive is simply the leaner of the two APIs. This directive
// supplies the missing half rather than reimplementing the button.
//
// WHY AN ATTRIBUTE SELECTOR AND NOT A COMPONENT
// ---------------------------------------------
// `pButton` is a directive on a real `<button>`, so `disabled` is a genuine
// HTMLButtonElement property and `[disabled]` reaches it even though no input
// declares it. Wrapping this in a component would mean re-projecting children,
// re-declaring every `pButton` input, and losing the native element — all to add
// one attribute. The house rule from AGENTS.md applies: reach for a directive
// when the host is already the right element.
//
// WHY IT ALSO ACCEPTS A PLAIN BUTTON
// ----------------------------------
// The selector does not require `pButton` to be present. An unstyled button is
// perfectly capable of being busy, and duplicating this file for that case would
// be the only alternative. `[pButton]` stays optional and is detected with an
// `inject(..., { optional: true })` host query.
// ============================================================================

import { Directive, ElementRef, effect, inject, input } from '@angular/core';
import { ButtonDirective } from 'primeng/button';

/**
 * Marks a button as busy: a spinner appears, the button dims, and it stops being
 * clickable OR focusable until `loading` goes false.
 *
 * @example A form's submit button
 * ```html
 * <button pButton pLoading [loading]="saving()" label="ذخیرهٔ تغییرات" (click)="save()"></button>
 * ```
 */
@Directive({
  selector: '[pLoading]',
})
export class LoadingDirective {
  /**
   * Whether the work this button starts is currently running.
   *
   * Required rather than defaulting to `false`: a button whose busy state is
   * forgotten is a button that submits twice, and an omitted binding should be a
   * compile error rather than a silent `false`.
   */
  readonly loading = input.required<boolean>();

  /**
   * The host, typed to its real element rather than `HTMLElement`. `disabled` is
   * a property of `HTMLButtonElement` (and `HTMLInputElement`), and typing it
   * loosely would mean a cast at the write below — which is where a typo would
   * hide.
   */
  private readonly host = inject<ElementRef<HTMLButtonElement>>(ElementRef);

  /**
   * The PrimeNG directive, if the button opted into it.
   *
   * `optional: true` because `[pLoading]` must also work on a bare `<button>`.
   * Without `optional`, Angular throws NG0201 on a plain button, which would make
   * the selector's independence a lie.
   */
  private readonly button = inject(ButtonDirective, { optional: true, host: true });

  constructor() {
    // `effect` and not `ngOnChanges`: `loading` is a signal input, and the two
    // things written below (the directive's plain property, and a DOM attribute)
    // are both outside Angular's change detection for this host. An effect re-runs
    // whenever the signal changes — including the very first time, which is what
    // puts a button that mounts already-busy into the correct state.
    effect(() => {
      const busy = this.loading();

      // The directive's own `loading` is a plain getter/setter, not a signal, so
      // this write is invisible to Angular — but the setter itself calls
      // `updateIcon()` and `setStyleClass()` when the directive has initialised
      // (primeng-button.mjs:359), so the spinner and the `p-disabled` styling do
      // land. Writing it is what makes the visual half of tc 5 work
      // automatically, instead of every caller having to remember BOTH bindings.
      if (this.button) {
        this.button.loading = busy;
      }

      // THE LINE THIS DIRECTIVE EXISTS FOR. A real, native attribute:
      // - `disabled` on a <button> is not focusable and cannot be activated
      // - it is announced as "dimmed" / "unavailable" by screen readers, which
      //   `.p-disabled` — a styling class — can never be
      // - it removes the button from the tab order, so Tab skips past a button
      //   that would do nothing
      // It is set on the element, not through a binding, because no input
      // declares it (see the header): `[disabled]` in a template would work, but
      // only if the CALLER wrote it, and the whole point is that they should not
      // have to.
      this.host.nativeElement.disabled = busy;
    });
  }
}
