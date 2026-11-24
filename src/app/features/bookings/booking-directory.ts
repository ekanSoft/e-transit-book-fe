import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
  resource,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WorkspaceAccess } from '../../core/auth/workspace-access';
import { errorMessages } from '../../core/http/errors';
import { Field } from '../../shared/forms/field';
import { Button } from '../../shared/ui/button';
import { DirectoryPager } from '../../shared/ui/directory-controls';
import { Errors } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/icon';
import { contactName, CustomerApi } from '../customers/customer-api';
import { fareLabel, routeLabel, showWat } from '../trips/trip-format';
import { WorkspaceData } from '../workspace/workspace-data';
import { BookingApi, bookingStatus, bookingStatuses, type BookingStatus } from './booking-api';

function recordId(value: string | null) {
  return value && /^[0-9a-f]{24}$/i.test(value) ? value : undefined;
}

@Component({
  selector: 'app-booking-directory',
  imports: [Button, DirectoryPager, Errors, Field, Icon, RouterLink],
  templateUrl: './booking-directory.html',
  styleUrl: '../trips/trip-workspace.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingDirectory {
  readonly access = inject(WorkspaceAccess);
  private readonly api = inject(BookingApi);
  private readonly workspace = inject(WorkspaceData);
  private readonly customers = inject(CustomerApi);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly customerId = computed(() => recordId(this.params().get('customer')));
  readonly tripId = computed(() => recordId(this.params().get('trip')));
  readonly status = new FormControl('', { nonNullable: true });
  private readonly statusValue = toSignal(this.status.valueChanges, { initialValue: '' });
  private readonly filters = computed(() => ({
    trip: this.tripId(),
    customer: this.customerId(),
    status: (this.statusValue() || undefined) as BookingStatus | undefined,
  }));
  readonly page = linkedSignal({ source: this.filters, computation: () => 1 });
  readonly statusOptions = [
    { value: '', label: 'All statuses' },
    ...Object.entries(bookingStatuses).map(([value, label]) => ({
      value,
      label: value === 'CANCELLED' ? 'Cancelled or missed' : label,
    })),
  ];
  readonly channel = { WALK_IN: 'Walk-in', ONLINE: 'Online' } as const;
  readonly name = contactName;
  readonly fare = fareLabel;
  readonly date = showWat;
  readonly statusLabel = bookingStatus;
  readonly errors = errorMessages;
  private readonly scope = computed(() =>
    this.access.canViewBookings() ? this.access.scope() : undefined,
  );
  readonly bookings = resource({
    params: () =>
      this.scope() ? { scope: this.scope(), ...this.filters(), page: this.page() } : undefined,
    loader: ({ params }) =>
      this.api.list({
        page: params.page,
        limit: 12,
        customer: params.customer,
        trip: params.trip,
        status: params.status,
      }),
  });
  readonly customer = resource({
    params: () => {
      const customer = this.customerId();
      return customer && this.scope() ? { customer, scope: this.scope() } : undefined;
    },
    loader: ({ params }) => this.customers.detail(params.customer),
  });
  private readonly routes = resource({
    params: this.scope,
    loader: async () => (await this.workspace.routes()).data,
  });
  private readonly routeNames = computed(
    () =>
      new Map(
        (this.routes.hasValue() ? this.routes.value() : []).map((route) => [
          route._id,
          routeLabel(route),
        ]),
      ),
  );

  constructor() {
    effect(() => {
      if (this.bookings.hasValue() && !this.bookings.isLoading()) {
        const { currentPage, totalPages } = this.bookings.value();
        if (currentPage > totalPages) this.page.set(totalPages);
      }
    });
  }

  journey(id: string) {
    return this.routeNames().get(id) ?? 'Route unavailable';
  }
}
