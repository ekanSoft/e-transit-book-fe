import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  linkedSignal,
  resource,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WorkspaceAccess } from '../../core/auth/workspace-access';
import { errorMessages } from '../../core/http/errors';
import { Button } from '../../shared/ui/button';
import { Errors } from '../../shared/ui/feedback';
import { LayoutApi } from '../vehicle-layouts/layout-api';
import {
  TripApi,
  tripStatuses,
  type TripCopyInput,
  type TripCopyResult,
  type TripSummary,
} from './trip-api';
import { TripCopyRow } from './trip-copy-row';
import { TripDateTime } from './trip-date-time';
import {
  isCalendarDate,
  routeLabel,
  shiftDays,
  showWat,
  tripReadErrors,
  watDate,
} from './trip-format';

const copyDateFormat = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'long',
  timeZone: 'Africa/Lagos',
});
const copyWeekdayFormat = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  timeZone: 'Africa/Lagos',
});

interface CopyChoice {
  included?: boolean;
  layout?: string;
}
interface CopyOutcome {
  input: TripCopyInput;
  result?: TripCopyResult;
}

@Component({
  selector: 'app-trip-copy',
  imports: [Button, Errors, RouterLink, TripCopyRow, TripDateTime],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './trip-copy.html',
  styleUrls: ['./trip-workspace.css', './trip-copy.css'],
  host: { '(window:beforeunload)': 'beforeUnload($event)' },
})
export class TripCopy {
  readonly access = inject(WorkspaceAccess);
  private readonly api = inject(TripApi);
  private readonly layouts = inject(LayoutApi);
  private readonly destroy = inject(DestroyRef);
  private readonly dateParam = inject(ActivatedRoute).snapshot.queryParamMap.get('departureDate');
  readonly sourceDate = new FormControl(
    this.dateParam && isCalendarDate(this.dateParam) ? this.dateParam : watDate(),
    { nonNullable: true },
  );
  readonly date = toSignal(this.sourceDate.valueChanges, { initialValue: this.sourceDate.value });
  private readonly context = computed(() =>
    this.access.canCopyTrips() ? this.access.tripScope() : undefined,
  );
  private readonly source = computed(() => {
    const date = this.date();
    const context = this.context();
    return context && isCalendarDate(date) ? { date, context } : undefined;
  });

  readonly timetable = resource({
    params: this.source,
    loader: ({ params, abortSignal }) => this.api.listDay(params.date, abortSignal),
  });
  readonly catalog = resource({
    params: () => (this.access.canViewLayouts() ? this.context() : undefined),
    loader: async () => (await this.layouts.list()).data,
  });
  readonly sourceTrips = computed(() =>
    (this.timetable.hasValue() ? this.timetable.value() : []).filter((trip) =>
      this.access.canManageTripFrom(trip.route?.originBranch?._id),
    ),
  );
  private readonly indexed = computed(
    () => new Map(this.sourceTrips().map((trip) => [trip._id, trip])),
  );
  readonly layoutOptions = computed(() => [
    { value: '', label: 'Keep source layout' },
    ...(this.catalog.hasValue() ? this.catalog.value() : [])
      .filter(({ status }) => status === 'ACTIVE')
      .map(({ _id, name }) => ({ value: _id, label: name })),
  ]);
  readonly sourceDateLabel = computed(() => {
    const date = this.source()?.date;
    return date ? copyDateFormat.format(new Date(date + 'T12:00:00+01:00')) : '';
  });
  readonly choices = computed(() => {
    const date = this.date();
    if (!isCalendarDate(date)) return [];
    return Array.from({ length: 7 }, (_, index) => {
      const offset = index + 1;
      const target = shiftDays(date + 'T12:00:00+01:00', offset);
      const targetDate = watDate(target);
      return {
        offset,
        date: targetDate,
        weekday: copyWeekdayFormat.format(target),
        dayNumber: Number(targetDate.slice(-2)),
        label: copyDateFormat.format(target),
      };
    });
  });
  readonly selectedSources = linkedSignal({
    source: this.source,
    computation: () => new Set<string>(),
  });
  readonly selectedDates = linkedSignal({
    source: this.source,
    computation: () => new Set<string>(),
  });
  private readonly perCopy = linkedSignal({
    source: this.source,
    computation: () => new Map<string, CopyChoice>(),
  });
  readonly selectedTrips = computed(() =>
    this.sourceTrips().filter(
      (trip) => this.selectedSources().has(trip._id) && !this.ineligible(trip),
    ),
  );
  readonly targets = computed(() =>
    this.choices().filter(({ date }) => this.selectedDates().has(date)),
  );
  readonly plan = computed<TripCopyInput>(() => ({
    fromDate: this.date(),
    days: this.targets().map(({ date }) => ({
      date,
      trips: this.selectedTrips().flatMap(({ _id }) => {
        const option = this.choice(date, _id);
        const layout = this.access.canViewLayouts() && option.layout;
        return option.included === false
          ? []
          : [layout ? { sourceTrip: _id, vehicleLayout: layout } : { sourceTrip: _id }];
      }),
    })),
  }));
  private readonly copyInput = computed<TripCopyInput>(() => {
    const plan = this.plan();
    return { ...plan, days: plan.days.filter((day) => day.trips.length > 0) };
  });
  readonly outcome = linkedSignal({
    source: this.source,
    computation: (): CopyOutcome | null => null,
  });
  readonly affected = resource({
    params: () => this.outcome()?.input,
    loader: ({ params, abortSignal }) =>
      Promise.all(
        params.days.map(async ({ date }) => ({
          date,
          trips: await this.api.listDay(date, abortSignal),
        })),
      ),
  });
  readonly messages = linkedSignal({ source: this.plan, computation: (): string[] => [] });
  readonly busy = signal(false);
  readonly hasCopies = computed(() => this.copyInput().days.length > 0);
  readonly preview = resource({
    params: () => {
      const context = this.context();
      return context && !this.outcome() && this.hasCopies()
        ? { context, plan: this.copyInput() }
        : undefined;
    },
    loader: async ({ params, abortSignal }) => {
      // Let quick changes to dates and departures settle before checking the plan.
      await new Promise<void>((resolve) => setTimeout(resolve, 250));
      abortSignal.throwIfAborted();
      return this.api.checkCopy(params.plan);
    },
  });
  readonly canSave = computed(() => {
    if (this.busy() || this.preview.isLoading() || !this.preview.hasValue()) return false;
    const preview = this.preview.value();
    return preview.tripCount > 0 && preview.problems.length === 0;
  });
  readonly statuses = tripStatuses;
  readonly routeLabel = routeLabel;
  readonly showWat = showWat;
  readonly errors = errorMessages;
  readonly copyErrors = (error: unknown) =>
    error instanceof HttpErrorResponse && error.status === 403
      ? ['This plan includes a trip outside your access, or your workspace permissions changed.']
      : tripReadErrors(error);

  ineligible(trip: TripSummary) {
    if (trip.status === 'CANCELLED') return 'Cancelled trips cannot be copied.';
    if (trip.route?.status !== 'ACTIVE') return 'The route must be active.';
    return '';
  }

  toggleSource(id: string, selected: boolean) {
    this.toggle(this.selectedSources, id, selected);
  }

  toggleDate(date: string, selected: boolean) {
    this.toggle(this.selectedDates, date, selected);
  }

  selectAllDates() {
    this.selectedDates.set(new Set(this.choices().map(({ date }) => date)));
  }

  clearDates() {
    this.selectedDates.set(new Set());
  }

  private toggle(selection: typeof this.selectedSources, item: string, selected: boolean) {
    const next = new Set(selection());
    if (selected) next.add(item);
    else next.delete(item);
    selection.set(next);
  }

  choice(date: string, id: string) {
    return this.perCopy().get(date + '/' + id) ?? {};
  }

  changeChoice(date: string, id: string, change: CopyChoice) {
    const next = new Map(this.perCopy());
    next.set(date + '/' + id, { ...this.choice(date, id), ...change });
    this.perCopy.set(next);
  }

  copyLabel(date: string, id: string, from = this.date()) {
    const trip = this.indexed().get(id);
    if (!trip) return date + ' · Trip ' + id;
    const offset = (Date.parse(date) - Date.parse(from)) / 86_400_000;
    return (
      routeLabel(trip.route) + ' · ' + showWat(shiftDays(trip.departureTime, offset).toISOString())
    );
  }

  async submit() {
    const source = this.source();
    const plan = this.copyInput();
    if (!source || !this.canSave()) return;
    this.busy.set(true);
    this.messages.set([]);
    const current = () =>
      !this.destroy.destroyed && source === this.source() && plan === this.copyInput();
    try {
      const result = await this.api.saveCopy(plan);
      if (current()) this.outcome.set({ input: plan, result });
    } catch (error) {
      if (!current()) return;
      if (!(error instanceof HttpErrorResponse) || error.status === 0 || error.status >= 500) {
        this.outcome.set({ input: plan });
      } else {
        this.messages.set(this.copyErrors(error));
        this.preview.reload();
      }
    } finally {
      if (!this.destroy.destroyed) this.busy.set(false);
    }
  }

  reviewComplete() {
    if (this.affected.hasValue()) this.outcome.set(null);
  }

  leave() {
    return !this.busy() || !this.context();
  }

  beforeUnload(event: BeforeUnloadEvent) {
    if (!this.leave()) event.preventDefault();
  }
}
