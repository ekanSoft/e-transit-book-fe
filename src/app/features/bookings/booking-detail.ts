import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  linkedSignal,
  resource,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WorkspaceAccess } from '../../core/auth/workspace-access';
import { errorMessages } from '../../core/http/errors';
import { Button } from '../../shared/ui/button';
import { Errors, Notifications } from '../../shared/ui/feedback';
import { ManagementDialog } from '../../shared/ui/management-dialog';
import { TripApi } from '../trips/trip-api';
import { routeLabel, showWat } from '../trips/trip-format';
import { WorkspaceData } from '../workspace/workspace-data';
import { BookingApi, type Booking } from './booking-api';
import { BookingTicket } from './booking-ticket';

@Component({
  selector: 'app-booking-detail',
  imports: [BookingTicket, Button, Errors, ManagementDialog, RouterLink],
  templateUrl: './booking-detail.html',
  styleUrl: '../trips/trip-workspace.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingDetail {
  readonly access = inject(WorkspaceAccess);
  private readonly api = inject(BookingApi);
  private readonly trips = inject(TripApi);
  private readonly workspace = inject(WorkspaceData);
  private readonly notifications = inject(Notifications);
  private readonly destroy = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly query = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly ticket = computed(() => this.params().get('ticket'));
  readonly fromManifest = computed(() => this.query().get('from') === 'manifest');
  readonly fromCustomer = computed(() => this.query().get('from') === 'customer');
  private readonly scope = computed(() =>
    this.access.canViewBookings() ? this.access.scope() : undefined,
  );
  private readonly request = computed(() => {
    const scope = this.scope();
    const id = this.params().get('id');
    const ticket = this.ticket();
    return scope && (id || ticket) ? { scope, id, ticket } : undefined;
  });
  readonly record = resource({
    params: this.request,
    loader: ({ params }) =>
      params.id ? this.api.detail(params.id) : this.api.ticket(params.ticket!),
  });
  private readonly routes = resource({
    params: this.scope,
    loader: async () => (await this.workspace.routes()).data,
  });
  readonly journey = computed(() => {
    const id = this.record.hasValue() ? this.record.value().route : undefined;
    const route = this.routes.hasValue()
      ? this.routes.value().find((route) => route._id === id)
      : undefined;
    return route ? routeLabel(route) : '';
  });
  readonly busy = signal(false);
  readonly cancellation = linkedSignal({
    source: this.request,
    computation: (): HTMLElement | undefined => undefined,
  });
  readonly messages = linkedSignal({ source: this.request, computation: (): string[] => [] });
  readonly errors = errorMessages;
  readonly showWat = showWat;
  readonly channel = { WALK_IN: 'Walk-in', ONLINE: 'Online' } as const;
  readonly ticketMissing = computed(() => {
    const error = this.record.error();
    return !!this.ticket() && error instanceof HttpErrorResponse && error.status === 404;
  });

  canCheckIn(booking: Booking) {
    return booking.status === 'CONFIRMED' && this.canManage(booking);
  }

  canCancel(booking: Booking) {
    return (
      (booking.status === 'CONFIRMED' || booking.status === 'CHECKED_IN') && this.canManage(booking)
    );
  }

  canReuse(booking: Booking) {
    return booking.status === 'CANCELLED' && !booking.reusedBy && this.access.canBookSeats();
  }

  private canManage(booking: Booking) {
    return booking.trip?.status === 'SCHEDULED' && this.access.canManageBookingFrom(booking.branch);
  }

  openCancellation(booking: Booking, trigger: HTMLElement) {
    if (this.canCancel(booking) && !this.busy() && !this.record.isLoading()) {
      this.messages.set([]);
      this.cancellation.set(trigger);
    }
  }

  async update(action: 'check-in' | 'cancel') {
    const request = this.request();
    const booking = this.record.hasValue() ? this.record.value() : null;
    if (!booking || !request || this.busy() || this.record.isLoading()) return;
    if (
      action === 'check-in'
        ? !this.canCheckIn(booking)
        : !this.cancellation() || !this.canCancel(booking)
    )
      return;
    this.busy.set(true);
    this.messages.set([]);
    try {
      const saved =
        action === 'check-in'
          ? await this.api.checkIn(booking.ticket)
          : await this.api.cancel(booking._id);
      if (this.destroy.destroyed || this.request() !== request) return;
      this.record.set({ ...saved, trip: booking.trip });
      if (booking.trip) this.trips.bookingChanged(booking.trip._id);
      this.notifications.show(
        action === 'check-in'
          ? 'Passenger checked in.'
          : 'Booking cancelled. The seat was released.',
      );
      afterNextRender(
        { write: () => this.heading()?.nativeElement.focus() },
        { injector: this.injector },
      );
    } catch (error) {
      if (!this.destroy.destroyed && this.request() === request)
        this.messages.set(errorMessages(error));
    } finally {
      if (!this.destroy.destroyed && this.request() === request) {
        this.cancellation.set(undefined);
        this.record.reload();
      }
      this.busy.set(false);
    }
  }
}
