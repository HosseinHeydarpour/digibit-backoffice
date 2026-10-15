import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MainLayout } from './main-layout';

describe('MainLayout', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainLayout],
      providers: [provideRouter([])],
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
});
