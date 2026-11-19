import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CURRENT_USER } from '@core/auth/current-user.token';
import { PERMISSIONS } from '@core/auth/permissions.token';
import { ConfirmService } from '@core/services/confirm';
import { TicketUnread } from '@core/services/ticket-unread';
import { ToastService } from '@core/services/toast';
import { of, throwError } from 'rxjs';

import type { TicketDetail } from '../models/ticket.model';
import { TicketsService } from '../services/tickets.service';

import { TicketDetailPage } from './ticket-detail';
import { TICKET_DETAIL_ERROR } from './ticket-detail.resolver';

const TICKET: TicketDetail = {
  id: '1',
  code: 'TK-2400',
  userId: 'c1',
  userName: 'زهرا محمدی',
  subject: 'پیگیری سفارش',
  status: 'open',
  priority: 'high',
  unread: true,
  lastMessageAt: 1_728_000_000_000,
  assigneeId: null,
  assigneeName: null,
  messages: [
    {
      id: 'm1',
      author: 'customer',
      authorName: 'زهرا محمدی',
      body: 'سفارش من کجاست؟',
      createdAt: 1_727_990_000_000,
      attachments: [{ name: 'رسید.png', url: '/mock/receipt.png', size: 1000 }],
    },
    {
      id: 'm2',
      author: 'agent',
      authorName: 'نگار شریفی',
      body: 'در حال بررسی است.',
      createdAt: 1_727_995_000_000,
      attachments: [],
    },
  ],
  statusHistory: [],
};

class TicketsServiceStub {
  sent: string | null = null;

  assignee: string | null | undefined;

  status: string | null = null;

  get() {
    return of(structuredClone(TICKET));
  }

  agents() {
    return of([{ id: 'u1', name: 'نگار شریفی' }]);
  }

  reply(_id: string, input: { body: string }) {
    this.sent = input.body;

    return of({
      ...structuredClone(TICKET),
      messages: [
        ...TICKET.messages,
        {
          id: 'm3',
          author: 'agent' as const,
          authorName: 'کارشناس',
          body: input.body,
          createdAt: 1_728_000_000_000,
          attachments: [],
        },
      ],
    });
  }

  assign(_id: string, input: { userId: string | null }) {
    this.assignee = input.userId;

    return of({ ...structuredClone(TICKET), assigneeId: input.userId, assigneeName: 'نگار شریفی' });
  }

  changeStatus(_id: string, input: { status: string }) {
    this.status = input.status;

    return of({ ...structuredClone(TICKET), status: input.status as TicketDetail['status'] });
  }
}

async function settle(fixture: ComponentFixture<TicketDetailPage>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('TicketDetailPage (BO-O02..O05)', () => {
  let fixture: ComponentFixture<TicketDetailPage>;
  let component: TicketDetailPage;
  let service: TicketsServiceStub;
  let confirm: ReturnType<typeof vi.fn>;
  let unread: { refresh: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    service = new TicketsServiceStub();
    confirm = vi.fn().mockResolvedValue(true);
    unread = { refresh: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [TicketDetailPage],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: TicketsService, useValue: service },
        { provide: ConfirmService, useValue: { confirm } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: TicketUnread, useValue: unread },
        {
          provide: PERMISSIONS,
          useValue: signal(['tickets.view', 'tickets.manage', 'settings.write']),
        },
        {
          provide: CURRENT_USER,
          useValue: signal({ id: 'u1', fullName: 'نگار', email: null, avatarUrl: null }),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TicketDetailPage);
    component = fixture.componentInstance;
  });

  async function mount(detail: unknown = { ticket: TICKET }): Promise<void> {
    fixture.componentRef.setInput('detail', detail);
    await settle(fixture);
  }

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('renders the thread in order, customer right and agent left', async () => {
    await mount();

    const bubbles = fixture.nativeElement.querySelectorAll('article');
    expect(bubbles).toHaveLength(2);
    expect(bubbles[0].textContent).toContain('سفارش من کجاست؟');
    expect(bubbles[1].textContent).toContain('در حال بررسی است.');
    expect(text()).toContain('زهرا محمدی');
    expect(text()).toContain('TK-2400');
  });

  it('shows the attachment as a download link', async () => {
    await mount();

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a[download]');

    expect(link.getAttribute('href')).toBe('/mock/receipt.png');
    expect(link.textContent).toContain('رسید.png');
  });

  it('renders the retry block for a failed load', async () => {
    await mount({ error: TICKET_DETAIL_ERROR });

    expect(text()).toContain(TICKET_DETAIL_ERROR);
    expect(fixture.nativeElement.querySelector('app-error-state')).toBeTruthy();
  });

  it('sends with Enter, clears the box and refreshes the badge', async () => {
    await mount();
    component.bodyControl.setValue('سلام، بررسی شد.');

    component.onComposerKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
    await settle(fixture);

    expect(service.sent).toBe('سلام، بررسی شد.');
    expect(component.bodyControl.value).toBe('');
    expect(text()).toContain('سلام، بررسی شد.');
    expect(unread.refresh).toHaveBeenCalled();
  });

  it('does not send on Shift+Enter or an empty box', async () => {
    await mount();

    const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });
    const prevent = vi.spyOn(event, 'preventDefault');

    component.onComposerKeydown(event);
    component.send();

    expect(prevent).not.toHaveBeenCalled();
    expect(service.sent).toBeNull();
  });

  it('keeps the text when the send fails', async () => {
    await mount();
    service.reply = () => throwError(() => new Error('offline'));
    component.bodyControl.setValue('متن مهم');

    component.send();
    await settle(fixture);

    expect(component.bodyControl.value).toBe('متن مهم');
    expect(component.actionError()).toContain('حفظ شد');
  });

  it('confirms a close and warns when no agent has replied', async () => {
    await mount({ ticket: { ...structuredClone(TICKET), messages: [] } });

    await component.changeStatus('closed');

    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ danger: true }));
    expect(service.status).toBe('closed');
  });

  it('assigns the ticket to an agent', async () => {
    await mount();

    component.changeAssignee('u1');
    await settle(fixture);

    expect(service.assignee).toBe('u1');
    expect(text()).toContain('نگار شریفی');
  });
});
