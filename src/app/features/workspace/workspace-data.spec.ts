import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { Branch, Route, WorkspaceData } from './workspace-data';

describe('workspace list contracts', () => {
  let api: WorkspaceData;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(WorkspaceData);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the entire terminal list and finds the primary terminal by its flag', async () => {
    const primary: Branch = { _id: 'primary', name: 'Ikeja Central', primeBranch: true };
    const terminals: Branch[] = [{ _id: 'newer', name: 'Marina' }, primary];
    const all = api.allBranches();
    http
      .expectOne({ method: 'GET', url: environment.apiBaseUrl + '/branch' })
      .flush({ data: terminals });
    expect(await all).toEqual(terminals);

    const result = api.primaryBranch();
    http
      .expectOne({ method: 'GET', url: environment.apiBaseUrl + '/branch' })
      .flush({ data: terminals });
    expect(await result).toEqual(primary);
  });

  it('accepts empty terminal and populated route arrays without pagination', async () => {
    const primary = api.primaryBranch();
    http.expectOne({ method: 'GET', url: environment.apiBaseUrl + '/branch' }).flush({ data: [] });
    expect(await primary).toBeNull();

    const routes: Route[] = [
      {
        _id: 'route',
        originBranch: { _id: 'origin', name: 'Marina' },
        destinationBranch: null,
        status: 'INACTIVE',
      },
    ];
    const result = api.routes();
    http
      .expectOne({ method: 'GET', url: environment.apiBaseUrl + '/routes' })
      .flush({ data: routes });
    expect((await result).data).toEqual(routes);
  });
});
