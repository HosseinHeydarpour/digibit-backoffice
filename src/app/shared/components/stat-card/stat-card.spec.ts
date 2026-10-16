// src/app/shared/components/stat-card/stat-card.spec.ts
//
// One `describe` per task is the house pattern (see breadcrumb.spec.ts). Each
// test names the test case it proves, so `npm test` output maps 1:1 onto
// TASKS-PHASE-1.md and a reviewer never has to guess which case a test covers.
//
// The card is exercised through small HOST components rather than by poking the
// component instance, because some of the cases can only be observed through a
// template: whether the tile is marked actionable (tc 10), what it looks like
// inside the page's grid (tc 6), and whether the projected footer link lands
// where the reference puts it.
//
// `ReferenceCardsHost` is the one to read first: it renders the four summary
// cards of the design reference with the reference's own sample data, so
// `npm test` re-checks the reproduction on every run.

import { Component, signal } from '@angular/core';
import type { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatCard } from './stat-card';
import type { Tone, Trend } from './stat-card';

/**
 * The read-only tile: every optional input is a signal, so ONE host can play
 * every scenario, and (cardClick) is deliberately left unbound.
 */
@Component({
  imports: [StatCard],
  template: `
    <app-stat-card
      [value]="value()"
      [label]="label()"
      [unit]="unit()"
      [icon]="icon()"
      [tone]="tone()"
      [trend]="trend()"
      [trendPercent]="trendPercent()"
      [footerText]="footerText()"
      [progress]="progress()"
      [progressText]="progressText()"
    />
  `,
})
class Host {
  readonly value = signal('۱۲۴');
  readonly label = signal('کل فروش');
  readonly unit = signal<string | undefined>(undefined);
  readonly icon = signal<string | undefined>(undefined);
  readonly tone = signal<Tone>('neutral');
  readonly trend = signal<Trend>('neutral');
  readonly trendPercent = signal<string | undefined>(undefined);
  readonly footerText = signal<string | undefined>(undefined);
  readonly progress = signal<number | undefined>(undefined);
  readonly progressText = signal<string | undefined>(undefined);
}

/** The same tile marked actionable, with a listener attached (tc 10). */
@Component({
  imports: [StatCard],
  template: `<app-stat-card
    [actionable]="true"
    value="۳۸"
    label="سفارشات جدید"
    (cardClick)="clicks = clicks + 1"
  />`,
})
class ClickHost {
  clicks = 0;
}

/**
 * The documented dashboard layout. The PAGE owns the grid — the card only has to
 * fill whatever cell it is given, which is what makes the mobile layout single
 * column (tc 6).
 */
@Component({
  imports: [StatCard],
  template: `
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      @for (tile of tiles; track tile) {
        <app-stat-card [value]="tile" [label]="tile" />
      }
    </div>
  `,
})
class GridHost {
  readonly tiles = ['۱', '۲', '۳', '۴'];
}

/**
 * A tile whose footer is the caller's own link — the reference's cards 2 and 3.
 * Note there is no `footerText`: the footer has to appear for the projected
 * content alone.
 */
@Component({
  imports: [StatCard],
  template: `
    <app-stat-card value="۲۸" unit="کاربر" label="کاربران جدید" icon="pi pi-users" tone="positive">
      <a
        href="#"
        class="text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
        >مشاهده همه</a
      >
    </app-stat-card>
  `,
})
class LinkHost {}

/**
 * The design reference's four summary cards, with its sample data, in its grid.
 * This is the reproduction under test (arino admin-panel-index.html:481-561).
 */
@Component({
  imports: [StatCard],
  template: `
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      <app-stat-card
        value="۴۲٬۸۵۰٬۰۰۰"
        unit="تومان"
        label="فروش امروز"
        icon="pi pi-dollar"
        tone="neutral"
        footerText="افزایش ۱۲٪ نسبت به دیروز"
        trend="up"
        trendPercent="۱۲٪"
      />
      <app-stat-card
        value="۲۸"
        unit="کاربر"
        label="کاربران جدید"
        icon="pi pi-users"
        tone="positive"
        footerText="۱۵ کاربر فعال امروز"
      >
        <a
          href="#"
          class="text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
          >مشاهده همه</a
        >
      </app-stat-card>
      <app-stat-card
        value="۱۴۷"
        unit="محصول"
        label="تعداد محصولات"
        icon="pi pi-box"
        tone="negative"
        footerText="۱۳ محصول جدید اضافه شد"
      >
        <a
          href="#"
          class="text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
          >مشاهده همه</a
        >
      </app-stat-card>
      <app-stat-card
        value="۳۸"
        unit="سفارش"
        label="سفارشات جدید"
        icon="pi pi-shopping-bag"
        tone="warning"
        footerText="سطح عالی"
        [progress]="85"
        progressText="۸۵٪ تحویل شده"
      />
    </div>
  `,
})
class ReferenceCardsHost {}

function mount<T>(host: Type<T>): ComponentFixture<T> {
  TestBed.configureTestingModule({ imports: [host] });
  const fixture = TestBed.createComponent(host);
  fixture.detectChanges();
  return fixture;
}

function card<T>(fixture: ComponentFixture<T>): HTMLElement {
  return fixture.nativeElement.querySelector('article') as HTMLElement;
}

/** The icon bubble — the only `div.rounded-xl` the card renders. */
function bubble<T>(fixture: ComponentFixture<T>): HTMLElement | null {
  return card(fixture).querySelector('div.rounded-xl');
}

/** The footer strip: the bar variant or the text/pill row, whichever rendered. */
function footer<T>(fixture: ComponentFixture<T>): HTMLElement {
  return card(fixture).querySelector('[data-stat-footer]') as HTMLElement;
}

function paragraphs<T>(fixture: ComponentFixture<T>): HTMLParagraphElement[] {
  return Array.from(card(fixture).querySelectorAll('p'));
}

/** Class names that paint text in a palette colour (as opposed to `text-sm`). */
const TEXT_COLOUR = /^text-(?:white|gray-|green-|red-|yellow-|primary)/;

describe('StatCard', () => {
  it('renders the value and the label with the reference type scale (tc 1)', () => {
    const fixture = mount(Host);
    const element = card(fixture);

    expect(element.textContent).toContain('کل فروش');
    expect(element.textContent).toContain('۱۲۴');

    // The sizes are part of the contract, not taste: a muted sm label above a
    // 2xl value is what makes a row of tiles scannable.
    const [label, value] = paragraphs(fixture);
    expect(label.classList.contains('text-sm')).toBe(true);
    expect(label.classList.contains('text-gray-500')).toBe(true);
    expect(value.classList.contains('text-2xl')).toBe(true);
    expect(value.classList.contains('font-bold')).toBe(true);
    expect(value.classList.contains('dark:text-white')).toBe(true);
  });

  it('renders the icon it is given, in the reference bubble (tc 2)', () => {
    const fixture = mount(Host);
    fixture.componentInstance.icon.set('pi pi-shopping-cart');
    fixture.detectChanges();

    const glyph = card(fixture).querySelector('i');
    expect(glyph?.classList.contains('pi-shopping-cart')).toBe(true);

    // Decorative: the label already says what the number is, so announcing the
    // glyph again would only add noise for a screen reader.
    expect(glyph?.getAttribute('aria-hidden')).toBe('true');

    // The reference gets a 48x48 square out of `p-3` around a 24x24 SVG; a font
    // glyph has no intrinsic box, so the size is pinned explicitly.
    expect(bubble(fixture)?.classList.contains('h-12')).toBe(true);
    expect(bubble(fixture)?.classList.contains('w-12')).toBe(true);
    expect(bubble(fixture)?.classList.contains('rounded-xl')).toBe(true);

    // No icon → no bubble at all (not an empty circle).
    fixture.componentInstance.icon.set(undefined);
    fixture.detectChanges();
    expect(bubble(fixture)).toBeNull();
  });

  it('paints the bubble green for positive and red for negative (tc 3)', () => {
    const fixture = mount(Host);
    fixture.componentInstance.icon.set('pi pi-box');

    fixture.componentInstance.tone.set('positive');
    fixture.detectChanges();
    expect(bubble(fixture)?.classList.contains('bg-green-100')).toBe(true);
    expect(bubble(fixture)?.classList.contains('text-green-600')).toBe(true);
    expect(bubble(fixture)?.classList.contains('dark:bg-green-900/30')).toBe(true);
    expect(bubble(fixture)?.classList.contains('dark:text-green-400')).toBe(true);

    fixture.componentInstance.tone.set('negative');
    fixture.detectChanges();
    expect(bubble(fixture)?.classList.contains('bg-red-100')).toBe(true);
    expect(bubble(fixture)?.classList.contains('text-red-600')).toBe(true);

    // `neutral` is the brand orange, `warning` the fourth accent the reference's
    // own dashboard uses for new orders.
    fixture.componentInstance.tone.set('neutral');
    fixture.detectChanges();
    expect(bubble(fixture)?.classList.contains('bg-primary-100')).toBe(true);
    expect(bubble(fixture)?.classList.contains('text-primary-600')).toBe(true);

    fixture.componentInstance.tone.set('warning');
    fixture.detectChanges();
    expect(bubble(fixture)?.classList.contains('bg-yellow-100')).toBe(true);
    expect(bubble(fixture)?.classList.contains('text-yellow-600')).toBe(true);
  });

  it('prints a pre-formatted value verbatim, with its unit beside it (tc 4)', () => {
    const fixture = mount(Host);
    fixture.componentInstance.value.set('۴۲٬۸۵۰٬۰۰۰');
    fixture.componentInstance.unit.set('تومان');
    fixture.detectChanges();

    // The card must not touch the string. Persian digits and the thousands
    // separator arrive ready-made (BO-B16 owns the formatting); a card that
    // "helpfully" reformatted here would fight the pipe that already did.
    const [, value] = paragraphs(fixture);
    expect(value.textContent?.trim()).toBe('۴۲٬۸۵۰٬۰۰۰ تومان');

    // The gap between the number and the unit is the reference's own literal
    // space, collapsed from this template's newline — so the span stays exactly
    // `class="text-sm"` and carries no margin of our own.
    const unit = value.querySelector('span');
    expect(unit?.textContent).toBe('تومان');
    expect(Array.from(unit?.classList ?? [])).toEqual(['text-sm']);
  });

  it('renders with only the required inputs, and no empty footer band (tc 5)', () => {
    const fixture = mount(Host);
    const element = card(fixture);

    expect(bubble(fixture)).toBeNull();
    expect(element.querySelector('i')).toBeNull();
    expect(paragraphs(fixture)).toHaveLength(2); // the label and the value, nothing else

    // The footer element still exists — Angular needs a static place for the
    // projected content — but it holds nothing, so `:empty` hides it and no
    // stray border appears above nothing.
    const band = footer(fixture);
    expect(band.querySelectorAll('*')).toHaveLength(0);
    expect(band.textContent?.trim()).toBe('');
    expect(band.classList.contains('empty:hidden')).toBe(true);
  });

  it('fills its grid cell so the page decides the column count (tc 6)', () => {
    const fixture = mount(GridHost);
    const cards = Array.from(fixture.nativeElement.querySelectorAll('article')) as HTMLElement[];

    // Four tiles, each claiming the full width of its cell. The column count — 1
    // on a phone, 4 on a wide screen — comes from the grid in the PAGE, which is
    // the reference's own grid (line 482). A card with a fixed width would break
    // that layout; one that says `w-full` cannot.
    expect(cards).toHaveLength(4);
    for (const element of cards) {
      expect(element.classList.contains('w-full')).toBe(true);
    }

    const grid = fixture.nativeElement.querySelector('.grid') as HTMLElement;
    for (const name of ['grid-cols-1', 'sm:grid-cols-2', 'xl:grid-cols-4', 'gap-6']) {
      expect(grid.classList.contains(name)).toBe(true);
    }
  });

  it('gives every coloured text a dark-mode counterpart (tc 7)', () => {
    const fixture = mount(ReferenceCardsHost);

    // The cheap guard against the classic dark-theme bug: a `text-gray-500` with
    // no `dark:` sibling is invisible-ish on the dark card. Collected first so a
    // failure names the offending element instead of just the assertion.
    const offenders = (Array.from(fixture.nativeElement.querySelectorAll('*')) as HTMLElement[])
      .filter((element) => {
        const classes = Array.from(element.classList);
        return classes.some((name) => TEXT_COLOUR.test(name));
      })
      .filter((element) => !Array.from(element.classList).some((name) => name.startsWith('dark:')))
      .map((element) => element.outerHTML);

    expect(offenders).toEqual([]);
  });

  it('renders the reference dashboard’s four sample cards (tc 8)', () => {
    const fixture = mount(ReferenceCardsHost);
    const cards = Array.from(fixture.nativeElement.querySelectorAll('article')) as HTMLElement[];
    const [sales, users, products, orders] = cards;

    expect(cards).toHaveLength(4);

    // Card 1 — فروش امروز: brand bubble, trend sentence, green up pill.
    expect(sales.textContent).toContain('فروش امروز');
    expect(sales.textContent).toContain('۴۲٬۸۵۰٬۰۰۰');
    expect(sales.textContent).toContain('تومان');
    expect(sales.textContent).toContain('افزایش ۱۲٪ نسبت به دیروز');
    expect(sales.querySelector('.pi-arrow-up')).not.toBeNull();
    expect(sales.querySelector('.bg-green-100')).not.toBeNull();

    // Card 2 — کاربران جدید: green bubble, and the page's own link.
    expect(users.textContent).toContain('کاربران جدید');
    expect(users.querySelector('div.rounded-xl')?.classList.contains('bg-green-100')).toBe(true);
    expect(users.querySelector('a')?.textContent?.trim()).toBe('مشاهده همه');

    // Card 3 — تعداد محصولات: red bubble, same link.
    expect(products.textContent).toContain('تعداد محصولات');
    expect(products.querySelector('div.rounded-xl')?.classList.contains('bg-red-100')).toBe(true);
    expect(products.querySelector('a')).not.toBeNull();

    // Card 4 — سفارشات جدید: the progress variant at 85%, tone-coloured label.
    expect(orders.textContent).toContain('سفارشات جدید');
    const fill = orders.querySelector('[data-stat-footer] div[style]') as HTMLElement;
    expect(fill.style.width).toBe('85%');
    expect(fill.classList.contains('bg-yellow-500')).toBe(true);
    const label = Array.from(orders.querySelectorAll('span')).find(
      (span) => span.textContent?.trim() === '۸۵٪ تحویل شده',
    );
    expect(label?.classList.contains('text-yellow-600')).toBe(true);
  });

  it('points the trend arrow the way the number moved (tc 9)', () => {
    const fixture = mount(Host);
    fixture.componentInstance.trendPercent.set('۱۲٪');

    fixture.componentInstance.trend.set('up');
    fixture.detectChanges();
    expect(card(fixture).querySelector('.pi-arrow-up')).not.toBeNull();
    expect(card(fixture).querySelector('.pi-arrow-down')).toBeNull();
    expect(
      footer(fixture).querySelector('span.rounded-full')?.classList.contains('bg-green-100'),
    ).toBe(true);

    fixture.componentInstance.trend.set('down');
    fixture.detectChanges();
    expect(card(fixture).querySelector('.pi-arrow-down')).not.toBeNull();
    expect(card(fixture).querySelector('.pi-arrow-up')).toBeNull();
    expect(
      footer(fixture).querySelector('span.rounded-full')?.classList.contains('bg-red-100'),
    ).toBe(true);

    // A neutral trend is a grey pill with no arrow: there is no direction to
    // point at, and an arrow would be a lie.
    fixture.componentInstance.trend.set('neutral');
    fixture.detectChanges();
    expect(card(fixture).querySelector('i')).toBeNull();
    expect(
      footer(fixture).querySelector('span.rounded-full')?.classList.contains('bg-gray-100'),
    ).toBe(true);
  });

  it('emits cardClick on click and on Enter (tc 10)', () => {
    const fixture = mount(ClickHost);
    const element = card(fixture);

    element.click();
    expect(fixture.componentInstance.clicks).toBe(1);

    // The card advertises role="button", so it must answer Enter like a button
    // does — and Space, which the template maps to the same handler.
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(fixture.componentInstance.clicks).toBe(2);
  });

  it('stays inert when nobody listens for the click (tc 10)', () => {
    const fixture = mount(Host);
    const element = card(fixture);

    expect(element.hasAttribute('data-actionable')).toBe(false);
    expect(element.classList.contains('cursor-pointer')).toBe(false);
    expect(element.getAttribute('role')).toBeNull();
    expect(element.getAttribute('tabindex')).toBeNull();

    // And a stray click is harmless rather than a no-op-looking button.
    element.click();
  });

  it('shows the progress variant instead of the text row when progress is set', () => {
    const fixture = mount(Host);
    fixture.componentInstance.footerText.set('سطح عالی');
    fixture.componentInstance.progress.set(60);
    fixture.componentInstance.progressText.set('۶۰٪ تحویل شده');
    fixture.componentInstance.trendPercent.set('۱۲٪');
    fixture.detectChanges();

    const band = footer(fixture);
    expect(band.textContent).toContain('سطح عالی');
    expect(band.textContent).toContain('۶۰٪ تحویل شده');

    const fill = band.querySelector('div[style]') as HTMLElement;
    expect(fill.style.width).toBe('60%');
    expect(fill.classList.contains('bg-primary-500')).toBe(true);

    // The two footer shapes are exclusive: a pill cannot sit in the bar row.
    expect(band.querySelector('span.rounded-full')).toBeNull();
  });

  it('clamps the progress bar to its track', () => {
    const fixture = mount(Host);

    // A number outside 0-100 is a caller bug, but it must not draw a bar that
    // overflows its track or a negative width.
    fixture.componentInstance.progress.set(150);
    fixture.detectChanges();
    expect((footer(fixture).querySelector('div[style]') as HTMLElement).style.width).toBe('100%');

    fixture.componentInstance.progress.set(-20);
    fixture.detectChanges();
    expect((footer(fixture).querySelector('div[style]') as HTMLElement).style.width).toBe('0%');

    // 0 is a real value: an empty bar, not a missing one.
    fixture.componentInstance.progress.set(0);
    fixture.detectChanges();
    expect(footer(fixture)).not.toBeNull();
  });

  it('lets the page project its own footer link', () => {
    const fixture = mount(LinkHost);

    // This is what makes cards 2 and 3 reproducible: the tile owns the footer
    // and the pill, the PAGE owns navigation.
    const link = footer(fixture).querySelector('a');
    expect(link?.textContent?.trim()).toBe('مشاهده همه');
    expect(link?.classList.contains('text-primary-600')).toBe(true);

    // No `footerText` here — the footer still shows, because it hides itself
    // only when it is genuinely empty.
    expect(footer(fixture).textContent?.trim()).toBe('مشاهده همه');
  });

  it('keeps the reference’s card surface', () => {
    const fixture = mount(Host);

    // Pinned deliberately: this list IS the design reference (line 483). If a
    // change to this component makes one of these classes disappear, the card
    // has stopped looking like the template and this test says so.
    for (const name of [
      'rounded-xl',
      'border',
      'border-gray-200',
      'bg-white',
      'p-6',
      'shadow-md',
      'dark:border-gray-700',
      'dark:bg-gray-800',
      'dark:shadow-gray-700',
    ]) {
      expect(card(fixture).classList.contains(name)).toBe(true);
    }
  });
});
