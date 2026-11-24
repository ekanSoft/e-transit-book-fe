import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  linkedSignal,
  resource,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { WorkspaceAccess } from '../../core/auth/workspace-access';
import { errorMessages } from '../../core/http/errors';
import { SeatMap } from '../../shared/seat-map/seat-map';
import { capacity } from '../../shared/seat-map/seat-layout';
import { Button } from '../../shared/ui/button';
import { Errors, Notifications } from '../../shared/ui/feedback';
import { ManagementDialog } from '../../shared/ui/management-dialog';
import { TripApi, tripStatuses, type NextTripStatus, type UpdateTrip } from './trip-api';
import { TripEditDialog } from './trip-edit-dialog';
import { fareLabel, routeLabel, routeLocation, showWat, tripReadErrors } from './trip-format';
import { TripLayoutDialog } from './trip-layout-dialog';

const statusActions = {
  DEPARTED: {
    label: 'Mark departed',
    description:
      'Confirmed passengers who have not checked in will move to the missed passengers list.',
  },
  COMPLETED: {
    label: 'Mark completed',
    description: 'This closes the trip and makes its status final.',
  },
  CANCELLED: {
    label: 'Cancel trip',
    description: 'Only trips with zero booked seats can be cancelled. Cancellation is final.',
  },
} satisfies Record<NextTripStatus, { label: string; description: string }>;
type TripAction = 'edit' | 'layout' | NextTripStatus;

@Component({
  selector: 'app-trip-detail',
  imports: [
    RouterLink,
    Button,
    Errors,
    SeatMap,
    ManagementDialog,
    TripEditDialog,
    TripLayoutDialog,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './trip-detail.html',
  styleUrl: './trip-workspace.css',
})
export class TripDetail {
  readonly access = inject(WorkspaceAccess);
  private readonly api = inject(TripApi);
  private readonly destroy = inject(DestroyRef);
  private readonly notify = inject(Notifications);
  private readonly id = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('id'))),
  );
  readonly request = computed(() => {
    const id = this.id();
    const scope = this.access.tripScope();
    return scope && id ? { id, scope } : undefined;
  });
  readonly detail = resource({
    params: this.request,
    loader: ({ params }) => this.api.detail(params.id),
  });
  readonly booked = resource({
    params: computed(() => (this.detail.hasValue() ? this.request() : undefined)),
    loader: ({ params }) => this.api.bookedSeats(params.id),
  });
  readonly bookedLabels = computed(
    () =>
      new Set(
        this.booked.hasValue() ? this.booked.value().map((label) => label.toLowerCase()) : [],
      ),
  );
  readonly canManage = computed(() => {
    const trip = this.detail.hasValue() ? this.detail.value() : undefined;
    return !!trip?.route && this.access.canManageTripFrom(trip.route.originBranch?._id);
  });
  readonly action = linkedSignal({
    source: this.request,
    computation: (): TripAction | null => null,
  });
  readonly busy = linkedSignal({ source: this.request, computation: () => false });
  readonly messages = linkedSignal({ source: this.request, computation: (): string[] => [] });
  readonly reviewMessage = linkedSignal({ source: this.request, computation: () => '' });
  readonly removedPrices = linkedSignal({ source: this.request, computation: (): string[] => [] });
  readonly statusAction = computed(() => {
    const action = this.action();
    return action && action !== 'edit' && action !== 'layout' ? statusActions[action] : null;
  });
  readonly overrideFares = computed(
    () =>
      new Map(
        this.detail.hasValue()
          ? this.detail
              .value()
              .pricing.seatOverrides.map(({ seatNumber, fare }) => [seatNumber.toLowerCase(), fare])
          : [],
      ),
  );
  readonly routeLabel = routeLabel;
  readonly routeLocation = routeLocation;
  readonly showWat = showWat;
  readonly fare = fareLabel;
  readonly capacity = capacity;
  readonly statuses = tripStatuses;
  readonly errors = tripReadErrors;

  constructor() {
    effect(() => {
      if (this.api.lastBookingChange()?.trip !== this.id() || !this.id()) return;
      this.detail.reload();
      this.booked.reload();
    });
  }

  open(action: TripAction) {
    if (this.detail.isLoading() || !this.canManage() || this.busy()) return;
    this.messages.set([]);
    this.reviewMessage.set('');
    if (action === 'layout') this.booked.reload();
    this.action.set(action);
  }

  close() {
    if (!this.busy()) this.action.set(null);
  }

  edit(body: UpdateTrip) {
    return this.commit('edit', async (id) => {
      await this.api.update(id, body);
      return 'Trip updated.';
    });
  }

  replace(layout: string) {
    const request = this.request();
    return this.commit('layout', async (id) => {
      const saved = await this.api.changeLayout(id, layout);
      if (!this.destroy.destroyed && this.request() === request) {
        this.removedPrices.set(saved.removedSeatPrices);
      }
      return 'Vehicle layout changed.';
    });
  }

  changeStatus() {
    const trip = this.detail.hasValue() ? this.detail.value() : null;
    const action = this.action();
    if (!trip || !action || action === 'edit' || action === 'layout') return;
    if (action === 'CANCELLED' && trip.bookedSeatCount > 0) return;
    return this.commit(action, async (id) => {
      const saved = await this.api.changeStatus(id, action);
      return 'Trip marked ' + tripStatuses[saved.status].toLowerCase() + '.';
    });
  }

  private async commit(action: TripAction, send: (id: string) => Promise<string>) {
    const request = this.request();
    const trip = this.detail.hasValue() ? this.detail.value() : null;
    if (
      !request ||
      !trip ||
      this.action() !== action ||
      this.busy() ||
      this.detail.isLoading() ||
      !this.canManage()
    )
      return;
    if (action === 'COMPLETED' ? trip.status !== 'DEPARTED' : trip.status !== 'SCHEDULED') return;
    if (action === 'layout' && !this.access.canReplaceTripLayout(trip.route?.originBranch?._id))
      return;
    this.busy.set(true);
    this.messages.set([]);
    const current = () => !this.destroy.destroyed && this.request() === request;
    try {
      const message = await send(request.id);
      if (!current()) return;
      this.notify.show(message);
      this.action.set(null);
      this.refresh();
    } catch (error) {
      if (!current()) return;
      if (
        error instanceof HttpErrorResponse &&
        (error.status === 0 ||
          error.status >= 500 ||
          [403, 404, 409].includes(error.status) ||
          action === 'CANCELLED')
      ) {
        this.action.set(null);
        this.reviewMessage.set(
          error.status === 409
            ? 'This trip changed while you were working. Review the refreshed details before trying again.'
            : [403, 404].includes(error.status)
              ? tripReadErrors(error)[0]
              : action === 'CANCELLED' && error.status === 400
                ? 'The trip could not be cancelled. Review its current status and booked seats.'
                : 'The update could not be confirmed. Review the refreshed trip before trying again.',
        );
        this.refresh();
      } else {
        this.messages.set(errorMessages(error));
        if (action === 'layout') this.booked.reload();
      }
    } finally {
      if (current()) this.busy.set(false);
    }
  }

  private refresh() {
    this.detail.reload();
    this.booked.reload();
  }
}
