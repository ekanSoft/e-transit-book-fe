import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { WorkspaceAccess } from '../../core/auth/workspace-access';
import { errorMessages } from '../../core/http/errors';
import { Field } from '../../shared/forms/field';
import { Button } from '../../shared/ui/button';
import { DirectoryPager } from '../../shared/ui/directory-controls';
import { Errors } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/icon';
import { WorkspaceData } from '../workspace/workspace-data';
import { TripApi, tripStatuses, type TripQuery } from './trip-api';
import {
  readTripQuery,
  tripDefaultIsToday,
  tripQueryParams,
} from './trip-directory-filters';
import {
  fareLabel,
  routeLabel,
  routeLocation,
  routeLocationLabel,
  showWat,
  watDate,
} from './trip-format';

@Component({
  selector: 'app-trip-directory',
  imports: [RouterLink, Field, Button, DirectoryPager, Errors, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './trip-directory.html',
  styleUrl: './trip-directory.css',
  host: { '(document:keydown.escape)': 'copyHelpDismissed.set(true)' },
})
export class TripDirectory {
  readonly access = inject(WorkspaceAccess);
  protected readonly copyHelpDismissed = signal(false);
  private readonly api = inject(TripApi);
  private readonly workspace = inject(WorkspaceData);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly routeFilter = new FormControl('', { nonNullable: true });
  readonly statusFilter = new FormControl('', { nonNullable: true });
  readonly dateFilter = new FormControl('', { nonNullable: true });
  readonly sizeFilter = new FormControl('10', { nonNullable: true });
  readonly query = signal<TripQuery>({ page: 1, limit: 10, departureDate: '' });
  readonly defaultIsToday = computed(() => tripDefaultIsToday(this.access.employee()?.role));
  readonly todaySelected = computed(() => this.query().departureDate === watDate());
  readonly statuses = [
    { value: '', label: 'All statuses' },
    ...Object.entries(tripStatuses).map(([value, label]) => ({ value, label })),
  ];
  readonly sizes = [10, 25, 50].map((size) => ({ value: String(size), label: String(size) }));
  readonly trips = resource({
    params: () => {
      const scope = this.access.tripScope();
      return scope ? { scope, query: this.query() } : undefined;
    },
    loader: ({ params }) => this.api.list(params.query),
  });
  readonly routes = resource({
    params: this.access.tripScope,
    loader: async () => (await this.workspace.routes()).data,
  });
  readonly routeOptions = computed(() => [
    { value: '', label: 'All routes' },
    ...(this.routes.hasValue() ? this.routes.value() : [])
      .filter((route) => this.access.canReadTripFrom(route.originBranch?._id))
      .map((route) => ({
        value: route._id,
        label: routeLocationLabel(route) + (route.status === 'INACTIVE' ? ' · Inactive' : ''),
      })),
  ]);
  readonly page = computed(() => (this.trips.hasValue() ? this.trips.value() : undefined));
  readonly statusLabels = tripStatuses;
  readonly showWat = showWat;
  readonly fare = fareLabel;
  readonly routeLabel = routeLabel;
  readonly routeLocation = routeLocation;
  readonly errors = errorMessages;
  private fromUrl = false;

  constructor() {
    this.routeFilter.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((route) => this.filter({ route: route || undefined }));
    this.statusFilter.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((status) => this.filter({ status: status || undefined }));
    this.dateFilter.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((departureDate) => this.filter({ departureDate }));
    this.sizeFilter.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((limit) => this.filter({ limit: Number(limit) }));
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      if (!params.has('departureDate') && this.defaultIsToday()) {
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { departureDate: watDate() },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
        return;
      }
      this.applyFromUrl(params);
    });
  }

  private applyFromUrl(params: ParamMap) {
    this.fromUrl = true;
    const query = readTripQuery(params, this.defaultIsToday());
    this.routeFilter.setValue(query.route ?? '', { emitEvent: false });
    this.statusFilter.setValue(query.status ?? '', { emitEvent: false });
    this.dateFilter.setValue(query.departureDate ?? '', { emitEvent: false });
    this.sizeFilter.setValue(String(query.limit), { emitEvent: false });
    this.query.set(query);
    this.fromUrl = false;
  }

  filter(change: Partial<TripQuery>) {
    const next = this.normalize({ ...this.query(), page: 1, ...change });
    this.query.set(next);
    if (!this.fromUrl) this.syncUrl(next);
  }

  pageChange(page: number) {
    const next = this.normalize({ ...this.query(), page });
    this.query.set(next);
    if (!this.fromUrl) this.syncUrl(next);
  }

  private normalize(query: TripQuery & { route?: string; status?: string }): TripQuery {
    return {
      page: query.page,
      limit: query.limit,
      departureDate: query.departureDate ?? '',
      ...(query.route ? { route: query.route } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
  }

  private syncUrl(query: TripQuery) {
    const tree = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: tripQueryParams(query, this.defaultIsToday()),
    });
    const target = this.router.serializeUrl(tree);
    if (target === this.router.url) return;
    void this.router.navigateByUrl(target, { replaceUrl: true });
  }

  today() {
    this.dateFilter.setValue(watDate());
  }
}