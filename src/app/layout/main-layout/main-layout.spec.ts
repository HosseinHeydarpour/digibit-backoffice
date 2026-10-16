import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { MainLayout } from './main-layout';

describe('MainLayout', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainLayout],
      // MessageService is not `providedIn: 'root'` — the real app registers it
      // in app.config.ts. The TEMPORARY BO-B13 empty-state sample in this
      // shell's template has an action button wired to ToastService, which
      // injects MessageService, so the shell now needs it here too or it throws
      // NG0201 while creating. Delete this provider with the sample block.
      providers: [provideRouter([]), MessageService],
    }).compileComponents();
  });

  it('renders the shell regions', () => {
    const fixture = TestBed.createComponent(MainLayout);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('aside')).toBeTruthy();
    expect(el.querySelector('header')).toBeTruthy();
    expect(el.querySelector('main')).toBeTruthy();
    expect(el.querySelector('main router-outlet')).toBeTruthy();
  });

  it('pins the shell and scrolls only the content area', () => {
    const fixture = TestBed.createComponent(MainLayout);
    fixture.detectChanges();
    const outer: HTMLElement = fixture.nativeElement.querySelector('div');

    // h-screen + overflow-hidden on the shell is what keeps the sidebar and
    // header fixed; losing either makes the whole page scroll instead.
    expect(outer.className).toContain('h-screen');
    expect(outer.className).toContain('overflow-hidden');

    const main: HTMLElement = fixture.nativeElement.querySelector('main');
    expect(main.className).toContain('overflow-y-auto');
  });

  it('owns the desktop sidebar width on the aside, not the sidebar', () => {
    // The sidebar is reused inside the mobile drawer, where it must fill the
    // panel. A fixed width on the component left a gap whenever the
    // `w-[80%] sm:w-100` panel was wider than 288px, so the 288px lives here.
    const fixture = TestBed.createComponent(MainLayout);
    fixture.detectChanges();
    const aside: HTMLElement = fixture.nativeElement.querySelector('aside');

    expect(aside.classList.contains('w-72')).toBe(true);
    expect(aside.classList.contains('shrink-0')).toBe(true);
    // Without shrink-0 the main content's flex-1 could squeeze the sidebar.
  });

  it('lets the sidebar fill its container instead of pinning a width', () => {
    const fixture = TestBed.createComponent(MainLayout);
    fixture.detectChanges();

    // The classes sit on the sidebar's own root <div>, not on the <app-sidebar>
    // host element.
    const sidebarRoot: HTMLElement = fixture.nativeElement.querySelector('app-sidebar > div');

    expect(sidebarRoot.classList.contains('w-full')).toBe(true);
    expect(sidebarRoot.classList.contains('w-72')).toBe(false);
  });
});
