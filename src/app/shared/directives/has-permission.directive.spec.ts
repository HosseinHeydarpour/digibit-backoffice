import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PERMISSIONS } from '@core/auth/permissions.token';

import { HasPermissionDirective } from './has-permission.directive';

@Component({
  standalone: true,
  imports: [HasPermissionDirective],
  template: `
    <button *appHasPermission="required" id="action">اقدام</button>
    <div *appHasPermission="many" id="block">بخش</div>
  `,
})
class Host {
  readonly required: string | readonly string[] = 'products.create';

  readonly many: readonly string[] = ['orders.view', 'products.create'];
}

describe('HasPermissionDirective (BO-D08)', () => {
  let fixture: ComponentFixture<Host>;
  let permissions: ReturnType<typeof signal<readonly string[]>>;

  async function mount(grants: readonly string[]): Promise<void> {
    permissions = signal(grants);

    TestBed.overrideProvider(PERMISSIONS, { useValue: permissions });

    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [{ provide: PERMISSIONS, useValue: permissions }],
    }).compileComponents();

    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  }

  it('hides the element from the DOM without the grant', async () => {
    await mount([]);

    expect(fixture.nativeElement.querySelector('#action')).toBeNull();
  });

  it('renders it with the grant', async () => {
    await mount(['products.create']);

    expect(fixture.nativeElement.querySelector('#action')).toBeTruthy();
  });

  it('treats an array as OR', async () => {
    await mount(['orders.view']);

    expect(fixture.nativeElement.querySelector('#block')).toBeTruthy();
  });

  it('re-renders when the permission signal changes', async () => {
    await mount([]);
    expect(fixture.nativeElement.querySelector('#action')).toBeNull();

    permissions.set(['products.create']);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#action')).toBeTruthy();
  });

  it('works on a non-button element', async () => {
    await mount(['orders.view']);

    expect(fixture.nativeElement.querySelector('div#block')).toBeTruthy();
  });
});
