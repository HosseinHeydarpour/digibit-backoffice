import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';

import type { CategoryNode } from '../models/category.model';

import { CategoriesService } from './categories.service';

const NODE: CategoryNode = {
  id: 'pcat-stationery',
  parentId: null,
  name: 'لوازم تحریر',
  slug: 'stationery',
  icon: 'pi pi-pen-to-square',
  order: 1,
  isActive: true,
  description: '',
  productCount: 12,
  children: [],
};

describe('CategoriesService status toggle (BO-G07)', () => {
  let service: CategoriesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(CategoriesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('PATCHes /categories/:id/status with the new flag and returns the node', () => {
    let answer: CategoryNode | undefined;

    service.setActive(NODE.id, false).subscribe((node) => (answer = node));

    const request = httpMock.expectOne(`${environment.API_BASE_URL}/categories/${NODE.id}/status`);

    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ isActive: false });

    request.flush({ data: { ...NODE, isActive: false }, message: 'دسته غیرفعال شد.' });

    expect(answer?.isActive).toBe(false);
  });
});
