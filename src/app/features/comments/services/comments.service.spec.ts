import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';

import { CommentsService } from './comments.service';

const URL = `${environment.API_BASE_URL}/reviews`;

describe('CommentsService (BO-N05)', () => {
  let service: CommentsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(CommentsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list() sends only the filters that are set', () => {
    service
      .list({
        status: 'pending',
        productId: '',
        rating: null,
        query: ' ارسال ',
        page: 2,
        pageSize: 10,
      })
      .subscribe();

    const request = http.expectOne((req) => req.url === URL);

    expect(request.request.params.get('status')).toBe('pending');
    expect(request.request.params.get('query')).toBe('ارسال');
    expect(request.request.params.has('productId')).toBe(false);
    expect(request.request.params.has('rating')).toBe(false);
    expect(request.request.params.get('page')).toBe('2');
    request.flush({ data: [], meta: { total: 0, page: 2, pageSize: 10 }, message: '' });
  });

  it('list() flattens the envelope into a Page', () => {
    let total = 0;

    service
      .list({ status: '', productId: '', rating: null, query: '', page: 1, pageSize: 10 })
      .subscribe((page) => (total = page.total));

    http
      .expectOne((req) => req.url === URL)
      .flush({
        data: [],
        meta: { total: 7, page: 1, pageSize: 10 },
        message: '',
      });

    expect(total).toBe(7);
  });

  it('pendingCount() asks for one row and reads meta.total', () => {
    let count = 0;

    service.pendingCount().subscribe((value) => (count = value));

    const request = http.expectOne((req) => req.url === URL);

    expect(request.request.params.get('status')).toBe('pending');
    expect(request.request.params.get('pageSize')).toBe('1');
    request.flush({ data: [], meta: { total: 6, page: 1, pageSize: 1 }, message: '' });

    expect(count).toBe(6);
  });

  it('moderate() patches the decision and returns the updated row', () => {
    let status = '';

    service
      .moderate('3', { approved: false, note: 'تبلیغ' })
      .subscribe((row) => (status = row.status));

    const request = http.expectOne(`${URL}/3/approve`);

    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ approved: false, note: 'تبلیغ' });
    request.flush({
      data: { id: '3', status: 'rejected' },
      message: 'نظر بررسی شد.',
    });

    expect(status).toBe('rejected');
  });

  it('products() maps the lookup page to select options', () => {
    let labels: string[] = [];

    service.products().subscribe((options) => (labels = options.map((option) => option.label)));

    http
      .expectOne((req) => req.url === `${environment.API_BASE_URL}/products`)
      .flush({
        data: [{ id: 'p1', name: 'هدفون' }],
        meta: { total: 1, page: 1, pageSize: 100 },
        message: '',
      });

    expect(labels).toEqual(['هدفون']);
  });
});
