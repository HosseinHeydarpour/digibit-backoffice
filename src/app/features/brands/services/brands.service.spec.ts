import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';

import { BrandsService } from './brands.service';

describe('BrandsService logo upload (BO-G06)', () => {
  let service: BrandsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(BrandsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('posts the file under `file`, without a manual Content-Type, and maps the URL', () => {
    const file = new File([new Uint8Array(4)], 'logo.png', { type: 'image/png' });
    let url = '';

    service.uploadLogo(file).subscribe((answer) => (url = answer));

    const request = httpMock.expectOne(`${environment.API_BASE_URL}/media`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body instanceof FormData).toBe(true);
    expect((request.request.body as FormData).get('file')).toBe(file);
    // Angular adds the multipart boundary itself; a manual header would break it.
    expect(request.request.headers.has('Content-Type')).toBe(false);

    request.flush({ data: { url: 'https://cdn.test/logo.png' }, message: '' });

    expect(url).toBe('https://cdn.test/logo.png');
  });
});
