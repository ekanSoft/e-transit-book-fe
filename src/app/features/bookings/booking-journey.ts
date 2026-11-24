import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  output,
  resource,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { WorkspaceAccess } from '../../core/auth/workspace-access';
import { errorMessages } from '../../core/http/errors';
import { Field } from '../../shared/forms/field';
import { SearchableSelect } from '../../shared/forms/searchable-select';
import { Button } from '../../shared/ui/button';
import { DirectoryPager } from '../../shared/ui/directory-controls';
import { Errors } from '../../shared/ui/feedback';
import { TripApi } from '../trips/trip-api';
import {
  fareLabel,
  isCalendarDate,
  showWat,
  tripRouteChoiceLabel,
  watDate,
} from '../trips/trip-format';
import { WorkspaceData } from '../workspace/workspace-data';

@Component({
  selector: 'app-booking-journey',
  imports: [Button, DirectoryPager, Errors, Field, SearchableSelect],
  templateUrl: './booking-journey.html',
  styleUrl: './booking-journey.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingJourney {
  private readonly access = inject(WorkspaceAccess);
  private readonly workspace = inject(WorkspaceData);
  private readonly api = inject(TripApi);
  readonly chosen = output<string>();
  readonly route = new FormControl('', { nonNullable: true });
  readonly date = new FormControl(watDate(), { nonNullable: true });
  private readonly routeId = toSignal(this.route.valueChanges, { initialValue: this.route.value });
  private readonly day = toSignal(this.date.valueChanges, { initialValue: this.date.value });
  private readonly filters = computed(() => ({ route: this.routeId(), departureDate: this.day() }));
  readonly page = linkedSignal({ source: this.filters, computation: () => 1 });
  readonly errors = errorMessages;
  readonly departure = showWat;
  readonly fare = fareLabel;
  readonly routes = resource({
    params: () => (this.access.canBookSeats() ? this.access.tripScope() : undefined),
    loader: async () => (await this.workspace.routes()).data,
  });
  readonly options = computed(() =>
    (this.routes.hasValue() ? this.routes.value() : [])
      .filter((route) => this.access.canBookFrom(route.originBranch?._id))
      .map((route) => ({ value: route._id, label: tripRouteChoiceLabel(route) })),
  );
  readonly departures = resource({
    params: () => {
      const scope = this.access.canBookSeats() ? this.access.tripScope() : undefined;
      const filters = this.filters();
      return scope &&
        isCalendarDate(filters.departureDate) &&
        this.options().some(({ value }) => value === filters.route)
        ? { scope, ...filters, page: this.page() }
        : undefined;
    },
    loader: ({ params }) =>
      this.api.list({
        route: params.route,
        departureDate: params.departureDate,
        page: params.page,
        status: 'SCHEDULED',
        limit: 8,
      }),
  });

  choose(id: string) {
    if (
      this.departures.hasValue() &&
      this.departures
        .value()
        .content.some(
          (trip) =>
            trip._id === id &&
            trip.status === 'SCHEDULED' &&
            this.access.canBookFrom(trip.route?.originBranch?._id),
        )
    )
      this.chosen.emit(id);
  }
}
