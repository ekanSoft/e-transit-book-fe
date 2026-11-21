import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { WorkspaceAccess } from '../../core/auth/workspace-access';
import { LayoutApi, type VehicleLayout } from './layout-api';
import { presets } from './seat-presets';

describe('vehicle layout HTTP contract', () => {
  const path = environment.apiBaseUrl + '/vehicle-layouts';
  const layout: VehicleLayout = {
    _id: 'id',
    name: 'Example',
    type: 'BUS',
    seatLayout: presets[3].grid,
    status: 'ACTIVE',
    capacity: 14,
  };
  const scope = signal({ business: 'first', token: 'first-token' });
  let api: LayoutApi;
  let http: HttpTestingController;

  beforeEach(() => {
    scope.set({ business: 'first', token: 'first-token' });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: WorkspaceAccess, useValue: { scope, canViewLayouts: signal(true) } },
      ],
    });
    api = TestBed.inject(LayoutApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('shares the full catalog and reuses its seat grid for detail', async () => {
    const first = api.list();
    const second = api.list();
    const detail = api.detail(layout._id);
    http.expectOne({ method: 'GET', url: path }).flush({ data: [layout] });
    expect((await first).data).toEqual([layout]);
    expect((await second).data).toEqual([layout]);
    expect((await detail).data).toEqual(layout);
    expect((await api.detail(layout._id)).data.seatLayout).toEqual(layout.seatLayout);
    http.expectNone(path + '/id');
  });

  it('uses and shares the by-ID request on a cold or missing record', async () => {
    const first = api.detail(layout._id);
    const second = api.detail(layout._id);
    http.expectOne({ method: 'GET', url: path + '/id' }).flush({ data: layout });
    expect((await first).data).toEqual(layout);
    expect((await second).data).toEqual(layout);

    const list = api.list();
    http.expectOne({ method: 'GET', url: path }).flush({ data: [layout] });
    await list;
    const missing = api.detail('missing');
    const rejected = expect(missing).rejects.toMatchObject({ status: 404 });
    const request = await vi.waitFor(() =>
      http.expectOne({ method: 'GET', url: path + '/missing' }),
    );
    request.flush(null, {
      status: 404,
      statusText: 'Not Found',
    });
    await rejected;
  });

  it('invalidates the catalog and reuses the full write response after each mutation', async () => {
    const body = { name: layout.name, type: layout.type, seatLayout: layout.seatLayout };
    const edited = { ...layout, name: 'Changed' };
    const cases = [
      [() => api.create(body), 'POST', path, body, layout],
      [
        () => api.update('id', { name: edited.name }),
        'PATCH',
        path + '/id',
        { name: edited.name },
        edited,
      ],
      [
        () => api.toggle('id'),
        'PATCH',
        path + '/id/toggle-status',
        null,
        { ...edited, status: 'INACTIVE' },
      ],
    ] as const;
    const initial = api.list();
    http.expectOne({ method: 'GET', url: path }).flush({ data: [] });
    await initial;
    for (const [send, method, url, payload, saved] of cases) {
      const pending = send();
      const req = http.expectOne({ method, url });
      expect(req.request.body).toEqual(payload);
      req.flush({ data: saved });
      await pending;
      expect((await api.detail('id')).data).toEqual(saved);
      http.expectNone(path + '/id');

      const refreshed = api.list();
      http.expectOne({ method: 'GET', url: path }).flush({ data: [saved] });
      expect((await refreshed).data).toEqual([saved]);
    }
  });

  it('keeps late catalog responses and fallback reads out of the next business', async () => {
    const first = api.list();
    const firstRequest = http.expectOne(path);
    const rejected = expect(api.detail('missing')).rejects.toThrow('workspace changed');

    scope.set({ business: 'second', token: 'second-token' });
    const second = api.list();
    const other = { ...layout, name: 'Second business' };
    http.expectOne(path).flush({ data: [other] });
    firstRequest.flush({ data: [layout] });

    await first;
    await rejected;
    expect((await second).data).toEqual([other]);
    expect((await api.detail('id')).data).toEqual(other);
    http.expectNone(path + '/missing');
  });
});
