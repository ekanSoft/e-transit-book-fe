import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { LayoutApi, type LayoutInput } from './layout-api';
import { presets } from './seat-presets';

describe('vehicle layout HTTP contract', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('sends only supported filters and writes', async () => {
    const http = TestBed.inject(HttpTestingController),
      api = TestBed.inject(LayoutApi);
    const path = environment.apiBaseUrl + '/vehicle-layouts';
    const query = { page: 2, limit: 10, search: 'A & B', type: 'OTHER', status: 'INACTIVE' };
    const body: LayoutInput = { name: 'Example', type: 'BUS', seatLayout: presets[3].grid };
    const cases = [
      [
        api.list(query),
        'GET',
        path + '?page=2&limit=10&search=A+%26+B&type=OTHER&status=INACTIVE',
        null,
      ],
      [
        api.list({ ...query, page: 1, search: '', type: '', status: '' }),
        'GET',
        path + '?page=1&limit=10',
        null,
      ],
      [api.detail('id'), 'GET', path + '/id', null],
      [api.create(body), 'POST', path, body],
      [api.update('id', { name: 'Changed' }), 'PATCH', path + '/id', { name: 'Changed' }],
      [api.toggle('id'), 'PATCH', path + '/id/toggle-status', null],
    ] as const;
    for (const [pending, method, url, payload] of cases) {
      const req = http.expectOne({ method, url });
      expect(req.request.body).toEqual(payload);
      req.flush({ success: true, data: {} });
      await pending;
    }
  });
});
