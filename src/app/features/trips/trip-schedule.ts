import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  resource,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { WorkspaceAccess } from '../../core/auth/workspace-access';
import { errorMessages } from '../../core/http/errors';
import { Field } from '../../shared/forms/field';
import { SearchableSelect } from '../../shared/forms/searchable-select';
import { applyServerValidation } from '../../shared/forms/server-validation';
import { capacity } from '../../shared/seat-map/seat-layout';
import { Button } from '../../shared/ui/button';
import { Errors, Notifications } from '../../shared/ui/feedback';
import { ManagementDialog } from '../../shared/ui/management-dialog';
import { LayoutApi } from '../vehicle-layouts/layout-api';
import { WorkspaceData } from '../workspace/workspace-data';
import { TripApi, type TripPricing } from './trip-api';
import { TripFares } from './trip-fares';
import {
  choiceControl,
  fareControl,
  seatNames,
  timeFields,
  validateTripTimes,
  watInstant,
} from './trip-fields';
import { fareLabel, routeLabel, routeLocation, showWat } from './trip-format';
import { TripScheduleDraft } from './trip-schedule-draft';

@Component({
  selector: 'app-trip-schedule',
  imports: [RouterLink, Button, Errors, Field, SearchableSelect, TripFares, ManagementDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './trip-schedule.html',
  styleUrls: ['./trip-workspace.css', './trip-schedule.css'],
  host: { '(window:beforeunload)': 'beforeUnload($event)' },
})
export class TripSchedule {
  private readonly access = inject(WorkspaceAccess);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly notify = inject(Notifications);
  private readonly api = inject(TripApi);
  private readonly workspace = inject(WorkspaceData);
  private readonly catalog = inject(LayoutApi);
  private readonly draft = inject(TripScheduleDraft);
  private readonly scope = this.access.scope();
  private readonly resume = this.draft.saved();
  private readonly heading = viewChild<ElementRef<HTMLElement>>('stepHeading');
  private readonly fares = viewChild(TripFares);

  readonly step = signal(this.resume?.step ?? 0);
  readonly steps = ['Journey & time', 'Layout & fares', 'Review & schedule'];
  readonly routeControl = choiceControl(this.resume?.route);
  readonly layoutControl = choiceControl(this.resume?.layout);
  readonly time = timeFields(this.resume?.departure, this.resume?.arrival);
  readonly baseFare = fareControl(this.resume?.fare);
  readonly overrides = signal<TripPricing['seatOverrides']>(this.resume?.overrides ?? []);
  readonly removed = signal<string[]>(this.resume?.removed ?? []);
  readonly busy = signal(false);
  readonly discard = signal(false);
  readonly messages = signal<string[]>([]);
  private saved = false;
  private resolveLeave?: (leave: boolean) => void;

  readonly routes = resource({
    params: () => (this.access.canScheduleTrip() ? this.access.scope() : undefined),
    loader: async () => (await this.workspace.routes()).data,
  });
  readonly layouts = resource({
    params: () => (this.access.canScheduleTrip() ? this.access.scope() : undefined),
    loader: async () => (await this.catalog.list()).data,
  });
  readonly activeRoutes = computed(() =>
    (this.routes.hasValue() ? this.routes.value() : []).filter(
      (route) => route.status === 'ACTIVE' && route.originBranch && route.destinationBranch,
    ),
  );
  readonly activeLayouts = computed(() =>
    (this.layouts.hasValue() ? this.layouts.value() : []).filter(
      (layout) => layout.status === 'ACTIVE',
    ),
  );
  readonly routeOptions = computed(() =>
    this.activeRoutes().map((route) => ({
      value: route._id,
      label: [routeLabel(route), routeLocation(route)].filter(Boolean).join(' · '),
    })),
  );
  readonly layoutOptions = computed(() =>
    this.activeLayouts().map((layout) => ({
      value: layout._id,
      label: layout.name + ' · ' + capacity(layout.seatLayout) + ' seats',
    })),
  );
  private readonly routeId = toSignal(this.routeControl.valueChanges, {
    initialValue: this.routeControl.value,
  });
  private readonly layoutId = toSignal(this.layoutControl.valueChanges, {
    initialValue: this.layoutControl.value,
  });
  readonly route = computed(() =>
    this.activeRoutes().find((route) => route._id === this.routeId()),
  );
  readonly layout = computed(() =>
    this.activeLayouts().find((layout) => layout._id === this.layoutId()),
  );
  readonly routeLabel = routeLabel;
  readonly routeLocation = routeLocation;
  readonly showWat = showWat;
  readonly capacity = capacity;
  readonly fare = fareLabel;
  readonly errors = errorMessages;
  readonly hasRoutes = computed(() => this.routes.hasValue() && this.routes.value().length > 0);
  readonly hasLayouts = computed(() => this.layouts.hasValue() && this.layouts.value().length > 0);

  constructor() {
    this.layoutControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.reviewOverrides(this.layout()));
    this.destroy.onDestroy(() => this.resolveLeave?.(true));
  }

  private reviewOverrides(layout: ReturnType<typeof this.layout>) {
    if (!layout) return;
    const names = seatNames(layout.seatLayout);
    const kept: TripPricing['seatOverrides'] = [];
    const dropped: string[] = [];
    for (const item of this.overrides()) {
      const label = names.get(item.seatNumber.toLowerCase());
      if (label) kept.push({ ...item, seatNumber: label });
      else dropped.push(item.seatNumber);
    }
    this.overrides.set(kept);
    if (dropped.length) this.removed.update((labels) => [...new Set([...labels, ...dropped])]);
  }

  get departure() {
    return watInstant(this.time.controls.departureTime.value);
  }

  get arrival() {
    return watInstant(this.time.controls.estimatedArrivalTime.value) || null;
  }

  go(step: number) {
    this.step.set(step);
    afterNextRender(() => this.heading()?.nativeElement.focus(), { injector: this.injector });
  }

  private journeyValid() {
    const validTime = validateTripTimes(this.time, this.departure, this.arrival, true);
    if (!this.route()) {
      this.routeControl.setErrors({ server: 'Choose an active route.' });
      this.routeControl.markAsTouched();
    }
    return !!this.route() && this.routeControl.valid && validTime;
  }

  private layoutValid() {
    if (!this.layout()) {
      this.layoutControl.setErrors({ server: 'Choose an active vehicle layout.' });
      this.layoutControl.markAsTouched();
    } else {
      this.reviewOverrides(this.layout());
    }
    this.baseFare.markAsTouched();
    const pendingPriceValid = this.fares()?.validatePending() ?? true;
    return !!this.layout() && this.layoutControl.valid && this.baseFare.valid && pendingPriceValid;
  }

  next() {
    this.messages.set([]);
    if (this.step() === 0 && this.journeyValid()) this.go(1);
    else if (this.step() === 1 && this.layoutValid()) this.go(2);
  }

  async submit() {
    if (
      this.step() !== 2 ||
      this.busy() ||
      this.saved ||
      !this.access.canScheduleTrip() ||
      this.scope !== this.access.scope() ||
      this.routes.isLoading() ||
      this.layouts.isLoading()
    )
      return;
    if (!this.journeyValid()) return this.go(0);
    if (!this.layoutValid()) return this.go(1);
    this.messages.set([]);
    this.busy.set(true);
    try {
      const saved = await this.api.create({
        route: this.routeControl.value,
        vehicleLayout: this.layoutControl.value,
        departureTime: this.departure,
        estimatedArrivalTime: this.arrival,
        pricing: { baseFare: Number(this.baseFare.value), seatOverrides: this.overrides() },
      });
      if (this.destroy.destroyed || this.scope !== this.access.scope()) return;
      this.saved = true;
      this.draft.saved.set(null);
      this.notify.show('Trip scheduled.');
      await this.router.navigate(['/app/trips', saved._id]);
    } catch (error) {
      if (this.destroy.destroyed || this.scope !== this.access.scope()) return;
      const { departureTime, estimatedArrivalTime } = this.time.controls;
      this.messages.set(
        applyServerValidation(
          error,
          {
            route: this.routeControl,
            vehicleLayout: this.layoutControl,
            departureTime,
            estimatedArrivalTime,
            'departure time': departureTime,
            'estimated arrival time': estimatedArrivalTime,
            'base fare': this.baseFare,
          },
          {
            'Route is inactive': { field: 'route' },
            'Vehicle layout is inactive': { field: 'vehicleLayout' },
            'Route not found': { field: 'route' },
            'Vehicle layout not found': { field: 'vehicleLayout' },
          },
        ),
      );
      if (this.routeControl.invalid || this.time.invalid) this.go(0);
      else if (this.layoutControl.invalid || this.baseFare.invalid) this.go(1);
    } finally {
      this.busy.set(false);
    }
  }

  private currentDraft() {
    return {
      step: this.step(),
      route: this.routeControl.value,
      layout: this.layoutControl.value,
      departure: this.time.controls.departureTime.value,
      arrival: this.time.controls.estimatedArrivalTime.value,
      fare: this.baseFare.value,
      overrides: this.overrides(),
      removed: this.removed(),
    };
  }

  private dirty() {
    const draft = this.currentDraft();
    return (
      !this.saved &&
      !!(
        draft.route ||
        draft.layout ||
        draft.departure ||
        draft.arrival ||
        draft.fare ||
        draft.overrides.length ||
        this.fares()?.seatFare.dirty
      )
    );
  }

  beforeUnload(event: BeforeUnloadEvent) {
    if (this.dirty()) event.preventDefault();
  }

  leave(url: string) {
    if (this.scope !== this.access.scope() || !this.dirty()) return true;
    if (this.busy()) return false;
    const path = url.split(/[?#]/, 1)[0];
    if (
      ['/app/routes', '/app/vehicle-layouts', '/app/vehicle-layouts/new'].includes(path) &&
      url.includes('from=trip-schedule')
    ) {
      if (!(this.fares()?.validatePending() ?? true)) return false;
      this.draft.saved.set(this.currentDraft());
      return true;
    }
    this.resolveLeave?.(false);
    this.discard.set(true);
    return new Promise<boolean>((resolve) => {
      this.resolveLeave = resolve;
    });
  }

  finishLeave(leave: boolean) {
    this.discard.set(false);
    if (leave) this.draft.saved.set(null);
    this.resolveLeave?.(leave);
    this.resolveLeave = undefined;
  }
}
