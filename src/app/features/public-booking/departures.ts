import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Attempts, holdActive } from './attempts';
import { Field } from '../../shared/forms/field';
import { journey, terminalPlace, PublicStore, type PublicRoute } from './public-store';
import { fareLabel, isCalendarDate, showWat, watDate } from '../trips/trip-format';

import { vehicleType, type Departure } from './trip';
function choices(routes: PublicRoute[], branch: (route: PublicRoute) => PublicRoute['originBranch']) {
  const seen = new Map<string, string>();
  for (const route of routes) {
    const place = branch(route);
    if (place?._id && !seen.has(place._id)) seen.set(place._id, terminalPlace(place));
  }
  return [...seen].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
}
@Component({
  imports: [Field, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './departures.html',
  styleUrl: './departures.css',
})
export class Departures {
  readonly store = inject(PublicStore);
  readonly attempts = inject(Attempts);
  readonly holdActive = holdActive;
  private readonly router = inject(Router);
  private readonly location = inject(ActivatedRoute);
  readonly origin = new FormControl('', { nonNullable: true });
  readonly destination = new FormControl({ value: '', disabled: true }, { nonNullable: true });
  readonly start = new FormControl(watDate(), { nonNullable: true });
  readonly end = new FormControl('', { nonNullable: true });
  readonly range = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly result = signal<Departure[] | null>(null);
  private readonly originId = signal('');
  private readonly pendingRoute = signal('');
  private readonly conflictingDates = signal(false);
  private readonly searchTick = signal(0);
  readonly origins = computed(() => choices(this.store.profile()?.routes ?? [], (r) => r.originBranch));
  readonly destinations = computed(() =>
    choices(
      (this.store.profile()?.routes ?? []).filter((r) => r.originBranch?._id === this.originId()),
      (r) => r.destinationBranch,
    ),
  );
  readonly label = signal('');
  readonly showWat = showWat;
  readonly fare = fareLabel;
  readonly vehicleType = vehicleType;
  readonly today = watDate;
  private version = 0;
  constructor() {
    this.origin.valueChanges.pipe(takeUntilDestroyed()).subscribe((id) => this.onOrigin(id));
    this.destination.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.syncRoute());
    this.location.queryParamMap.pipe(takeUntilDestroyed()).subscribe((q) => {
      this.version++;
      this.result.set(null);
      this.error.set('');
      this.loading.set(false);
      if (!q.has('route')) {
        this.pendingRoute.set('');
        this.conflictingDates.set(false);
        this.searchTick.update((n) => n + 1);
        return;
      }
      this.start.setValue(q.get('departureDate') ?? q.get('from') ?? '');
      this.end.setValue(q.get('to') ?? '');
      this.range.set(q.has('from') || q.has('to'));
      this.conflictingDates.set(q.has('departureDate') && this.range());
      this.pendingRoute.set(q.get('route')!);
      if (this.conflictingDates()) this.error.set('Choose one travel date or a date range.');
      this.searchTick.update((n) => n + 1);
    });
    effect(() => {
      this.searchTick();
      this.store.profile()?.routes;
      if (this.conflictingDates()) return;
      untracked(() => this.restore());
    });
  }
  private routes() {
    return this.store.profile()?.routes ?? [];
  }
  private matched() {
    return this.routes().find(
      (r) => r.originBranch?._id === this.origin.value && r.destinationBranch?._id === this.destination.value,
    );
  }
  private onOrigin(id: string) {
    this.originId.set(id);
    const allowed = new Set(
      this.routes()
        .filter((r) => r.originBranch?._id === id)
        .map((r) => r.destinationBranch?._id),
    );
    if (!allowed.has(this.destination.value)) this.destination.setValue('');
    if (id) this.destination.enable({ emitEvent: false });
    else this.destination.disable({ emitEvent: false });
    this.syncRoute();
  }
  private syncRoute() {
    this.route = this.matched()?._id ?? '';
  }
  private route = '';
  private restore() {
    const routeId = this.pendingRoute();
    if (!routeId || !this.routes().length) return;
    const match = this.routes().find((r) => r._id === routeId);
    if (!match?.originBranch?._id || !match.destinationBranch?._id) {
      this.error.set('Select a departure terminal, a destination, and a travel date.');
      return;
    }
    if (this.origin.value !== match.originBranch._id) this.origin.setValue(match.originBranch._id);
    if (this.destination.value !== match.destinationBranch._id)
      this.destination.setValue(match.destinationBranch._id);
    this.route = match._id;
    void this.load();
  }
  private params() {
    return {
      route: this.route,
      ...(this.range()
        ? { from: this.start.value, to: this.end.value }
        : { departureDate: this.start.value }),
    };
  }
  private valid() {
    return (
      !!this.matched() &&
      isCalendarDate(this.start.value) &&
      this.start.value >= watDate() &&
      (!this.range() || (isCalendarDate(this.end.value) && this.end.value >= this.start.value))
    );
  }
  toggleRange() {
    const next = !this.range();
    this.range.set(next);
    if (next && !this.end.value) this.end.setValue(this.start.value);
    if (!next) this.end.setValue('');
    this.result.set(null);
  }
  search() {
    if (!this.valid()) {
      this.error.set('Select where you are leaving from, where you are going, and a travel date from today.');
      return;
    }
    const tree = this.router.createUrlTree([], {
      relativeTo: this.location,
      queryParams: this.params(),
    });
    if (this.router.serializeUrl(tree) === this.router.url) void this.load();
    else void this.router.navigateByUrl(tree);
  }

  async load() {
    const version = ++this.version;
    this.result.set(null);
    this.error.set('');
    if (!this.valid()) {
      this.error.set('Select a departure terminal, a destination, and a travel date.');
      return;
    }
    this.loading.set(true);
    this.route = this.matched()!._id;
    this.label.set(journey(this.matched()!));
    try {
      const { data } = await this.store.api.get<Departure[]>(
        this.store.path + '/trips?' + new URLSearchParams(this.params()),
      );
      if (version === this.version) this.result.set(data);
    } catch {
      if (version === this.version)
        this.error.set('Departures could not be loaded. Search again to retry.');
    } finally {
      if (version === this.version) this.loading.set(false);
    }
  }
}
