import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  resource,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WorkspaceAccess } from '../../core/auth/workspace-access';
import { errorMessages } from '../../core/http/errors';
import { Button } from '../../shared/ui/button';
import { DirectoryPager } from '../../shared/ui/directory-controls';
import { Errors, Notifications } from '../../shared/ui/feedback';
import { normalizeNigerianPhone } from '../../shared/utilities/phone';
import { BookingApi, bookingStatus } from '../bookings/booking-api';
import { fareLabel, showWat } from '../trips/trip-format';
import { contactName, CustomerApi } from './customer-api';
import { CustomerForm } from './customer-form';

@Component({
  selector: 'app-customer-detail',
  imports: [Button, CustomerForm, DirectoryPager, Errors, RouterLink],
  templateUrl: './customer-detail.html',
  styleUrl: '../trips/trip-workspace.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerDetail {
  readonly access = inject(WorkspaceAccess);
  private readonly api = inject(CustomerApi);
  private readonly bookingApi = inject(BookingApi);
  private readonly notifications = inject(Notifications);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly id = computed(() => this.params().get('id') ?? '');
  readonly edit = linkedSignal({
    source: this.id,
    computation: (): HTMLElement | undefined => undefined,
  });
  readonly page = linkedSignal({ source: this.id, computation: () => 1 });
  readonly name = contactName;
  readonly phone = normalizeNigerianPhone;
  readonly status = bookingStatus;
  readonly date = showWat;
  readonly fare = fareLabel;
  readonly errors = errorMessages;
  readonly customer = resource({
    params: () =>
      this.access.canViewBookings() ? { scope: this.access.scope(), id: this.id() } : undefined,
    loader: ({ params }) => this.api.detail(params.id),
  });
  readonly history = resource({
    params: () =>
      this.customer.hasValue() && this.access.canViewBookings()
        ? { scope: this.access.scope(), customer: this.customer.value()._id, page: this.page() }
        : undefined,
    loader: ({ params }) =>
      this.bookingApi.list({ customer: params.customer, page: params.page, limit: 12 }),
  });

  saved() {
    this.edit.set(undefined);
    this.notifications.show('Customer updated.');
    this.customer.reload();
  }
}
