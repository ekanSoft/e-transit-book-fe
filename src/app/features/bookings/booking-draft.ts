import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  resource,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WorkspaceAccess } from '../../core/auth/workspace-access';
import { errorMessages } from '../../core/http/errors';
import { Field } from '../../shared/forms/field';
import { focusInvalid, requiredText } from '../../shared/forms/validators';
import type { SeatPosition } from '../../shared/seat-map/seat-layout';
import { SeatMap } from '../../shared/seat-map/seat-map';
import { Button } from '../../shared/ui/button';
import { Errors } from '../../shared/ui/feedback';
import { ManagementDialog } from '../../shared/ui/management-dialog';
import { nigerianCustomerPhone, normalizeNigerianPhone } from '../../shared/utilities/phone';
import { contactName, CustomerApi, type Contact, type Customer } from '../customers/customer-api';
import { CustomerLookup } from '../customers/customer-lookup';
import { TripApi, type Trip } from '../trips/trip-api';
import { choiceControl, fareControl, fareHint, isFare, seatNames } from '../trips/trip-fields';
import { fareLabel, routeLabel, showWat, tripReadErrors } from '../trips/trip-format';
import type { PaymentMethod } from '../workspace/workspace-data';
import { BookingApi, type Booking, type BookingInput, type BookingReceipt } from './booking-api';
import { BookingJourney } from './booking-journey';
import { BookingTicket, paymentLabels } from './booking-ticket';

type Availability = { trip: Trip; booked: ReadonlySet<string> };
type ReuseSource = { booking: Booking; customer?: Customer };
type SaleAttempt = { body: BookingInput; customer: string; operator: string; startedAt: number };
const paymentFlags = {
  CASH: 'allowCashPayment',
  TRANSFER: 'allowTransferPayment',
  POS: 'allowPosPayment',
} as const;
const paymentMethods = ['CASH', 'TRANSFER', 'POS'] as const;

export function seatFare(trip: Pick<Trip, 'pricing'>, seat: string) {
  return (
    trip.pricing.seatOverrides.find(
      ({ seatNumber }) => seatNumber.toLowerCase() === seat.toLowerCase(),
    )?.fare ?? trip.pricing.baseFare
  );
}

function availableSeat({ trip, booked }: Availability, seat: string) {
  const label = seat.toLowerCase();
  return !booked.has(label) ? seatNames(trip.seatLayoutSnapshot).get(label) : undefined;
}

@Component({
  selector: 'app-booking-draft',
  imports: [
    BookingJourney,
    BookingTicket,
    Button,
    CustomerLookup,
    Errors,
    Field,
    ManagementDialog,
    ReactiveFormsModule,
    RouterLink,
    SeatMap,
  ],
  templateUrl: './booking-draft.html',
  styleUrls: ['./booking-draft.css', '../trips/trip-workspace.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:beforeunload)': 'beforeUnload($event)' },
})
export class BookingDraft {
  readonly access = inject(WorkspaceAccess);
  private readonly bookingApi = inject(BookingApi);
  private readonly customerApi = inject(CustomerApi);
  private readonly tripApi = inject(TripApi);
  private readonly destroy = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly route = inject(ActivatedRoute);
  private readonly scope = this.access.scope();
  private readonly heading = viewChild<ElementRef<HTMLElement>>('stepHeading');
  private resolveLeave?: (allowed: boolean) => void;
  private prefilledReuse = false;
  readonly reuseId = this.route.snapshot.paramMap.get('id');
  readonly originTrip = this.route.snapshot.queryParamMap.get('trip') ?? '';
  readonly tripId = signal(this.originTrip);
  readonly step = signal<1 | 2 | 3>(1);
  readonly progress = ['Trip & seat', 'Customer & contact', 'Payment & review'];
  readonly position = signal<SeatPosition | null>(null);
  readonly seat = signal('');
  readonly customer = signal<Customer | null>(null);
  readonly phone = inject(FormBuilder).nonNullable.control('', [
    Validators.required,
    nigerianCustomerPhone,
  ]);
  private readonly phoneValue = toSignal(this.phone.valueChanges, { initialValue: '' });
  readonly selectedCustomer = computed(() => {
    const customer = this.customer();
    return customer &&
      normalizeNigerianPhone(customer.phoneNumber) === normalizeNigerianPhone(this.phoneValue())
      ? customer
      : null;
  });
  readonly contact = inject(FormBuilder).nonNullable.group({
    firstName: ['', requiredText(Number.MAX_SAFE_INTEGER)],
    lastName: ['', requiredText(Number.MAX_SAFE_INTEGER)],
    phoneNumber: ['', requiredText(Number.MAX_SAFE_INTEGER)],
    email: ['', Validators.email],
    bloodgroup: [''],
  });
  readonly method = choiceControl();
  readonly reusePayment = choiceControl();
  readonly amount = fareControl();
  readonly fareHint = fareHint;
  private readonly reusePaymentValue = toSignal(this.reusePayment.valueChanges, {
    initialValue: '',
  });
  private readonly amountValue = toSignal(this.amount.valueChanges, { initialValue: '' });
  readonly isAdditionalPayment = computed(() => this.reusePaymentValue() === 'paid');
  readonly paymentModes = [
    { value: 'free', label: 'No additional payment' },
    { value: 'paid', label: 'Record additional payment' },
  ];
  readonly additionalAmount = computed(() =>
    this.isAdditionalPayment() && isFare(this.amountValue())
      ? Number(this.amountValue())
      : undefined,
  );
  private readonly methodValue = toSignal(this.method.valueChanges, { initialValue: '' });
  readonly methodLabel = computed(
    () => this.paymentOptions().find(({ value }) => value === this.methodValue())?.label,
  );
  readonly saving = signal(false);
  readonly discard = signal(false);
  readonly errors = signal<string[]>([]);
  readonly contactError = signal('');
  readonly notice = signal('');
  readonly receipt = signal<{ data: BookingReceipt; trip: Trip } | null>(null);
  readonly uncertain = signal<SaleAttempt | null>(null);
  readonly recovered = signal<Booking | null>(null);
  readonly showWat = showWat;
  readonly routeLabel = routeLabel;
  readonly name = contactName;
  readonly fareLabel = fareLabel;
  readonly apiErrors = errorMessages;
  readonly tripErrors = tripReadErrors;
  readonly previous = resource({
    params: () =>
      this.reuseId && this.active() && this.access.canViewBookings() ? this.reuseId : undefined,
    loader: ({ params, abortSignal }) => this.readPrevious(params, abortSignal),
  });
  readonly readyToPay = computed(() =>
    this.reuseId
      ? this.reusePaymentValue() === 'free' ||
        (!!this.methodLabel() && this.additionalAmount() !== undefined)
      : !!this.methodLabel(),
  );
  readonly availability = resource({
    params: () => {
      const id = this.tripId();
      return this.active() && this.access.canBookSeats() && id ? { id } : undefined;
    },
    loader: ({ params, abortSignal }) => this.readAvailability(params.id, abortSignal),
  });
  readonly business = resource({
    params: () => (this.active() && this.access.canViewBookings() ? this.scope : undefined),
    loader: () => this.bookingApi.business(),
  });
  readonly paymentOptions = computed(() => {
    const settings = this.business.hasValue() ? this.business.value().settings : undefined;
    return paymentMethods
      .filter((method) => settings?.[paymentFlags[method]] !== false)
      .map((method) => ({ value: method, label: paymentLabels[method] }));
  });
  readonly allowed = computed(
    () =>
      this.access.canBookSeats() &&
      (!this.business.hasValue() ||
        (this.business.value().accountStatus === 'ACTIVE' &&
          this.business.value().settings?.allowStaffBooking !== false)),
  );
  readonly effectiveFare = computed(() =>
    this.availability.hasValue() && this.seat()
      ? seatFare(this.availability.value().trip, this.seat())
      : undefined,
  );
  readonly seatDescriptions = computed(() => {
    if (!this.availability.hasValue()) return new Map<string, string>();
    const { trip, booked } = this.availability.value();
    return new Map(
      [...seatNames(trip.seatLayoutSnapshot).values()].map((label) => [
        label,
        booked.has(label.toLowerCase())
          ? 'booked'
          : 'available, ' + fareLabel(seatFare(trip, label)),
      ]),
    );
  });

  constructor() {
    this.phone.valueChanges.pipe(takeUntilDestroyed()).subscribe((phone) => {
      const customer = this.customer();
      if (
        customer &&
        normalizeNigerianPhone(customer.phoneNumber) !== normalizeNigerianPhone(phone)
      ) {
        this.customer.set(null);
      }
    });
    effect(() => {
      if (this.prefilledReuse || !this.previous.hasValue()) return;
      const { booking } = this.previous.value();
      this.prefilledReuse = true;
      if (booking.nextOfKin) {
        this.contact.patchValue({
          ...booking.nextOfKin,
          email: booking.nextOfKin.email ?? '',
          phoneNumber: normalizeNigerianPhone(booking.nextOfKin.phoneNumber),
        });
      }
      if (booking.bloodgroup) this.contact.controls.bloodgroup.setValue(booking.bloodgroup);
    });
  }

  private active() {
    return !!this.scope && this.scope === this.access.scope() && !this.destroy.destroyed;
  }

  private async readPrevious(id: string, abortSignal?: AbortSignal): Promise<ReuseSource> {
    const booking = await this.bookingApi.detail(id);
    abortSignal?.throwIfAborted();
    if (!this.active()) throw new Error('Workspace changed.');
    if (booking.status !== 'CANCELLED' || booking.reusedBy) return { booking };
    return { booking, customer: await this.customerApi.detail(booking.customer) };
  }

  private async readAvailability(id: string, abortSignal?: AbortSignal): Promise<Availability> {
    const trip = await this.tripApi.detail(id);
    abortSignal?.throwIfAborted();
    if (
      !this.active() ||
      !this.access.canReadTripFrom(trip.route?.originBranch?._id) ||
      !trip.route?.originBranch
    ) {
      throw new Error('This departure is unavailable in your workspace.');
    }
    const booked = await this.tripApi.bookedSeats(id);
    return { trip, booked: new Set(booked.map((label) => label.toLowerCase())) };
  }

  chooseTrip(id: string) {
    if (this.saving() || this.uncertain() || !this.allowed()) return;
    this.tripId.set(id);
    this.clearSeat();
    this.errors.set([]);
    this.notice.set('');
    this.focusStep();
  }

  selectSeat(position: SeatPosition) {
    if (this.saving() || this.uncertain() || !this.allowed() || !this.availability.hasValue())
      return;
    const availability = this.availability.value();
    const cell = availability.trip.seatLayoutSnapshot.rows.find(({ row }) => row === position.row)
      ?.cells[position.column];
    if (
      availability.trip.status !== 'SCHEDULED' ||
      cell?.type !== 'SEAT' ||
      !availableSeat(availability, cell.seatNumber)
    )
      return;
    this.position.set(position);
    this.seat.set(cell.seatNumber);
  }

  nextFromSeat() {
    if (
      this.seat() &&
      this.availability.hasValue() &&
      !this.availability.isLoading() &&
      this.availability.value().trip.status === 'SCHEDULED' &&
      availableSeat(this.availability.value(), this.seat())
    )
      this.setStep(2);
  }

  nextFromContact(form: HTMLFormElement) {
    if (!this.reuseId && !this.selectedCustomer()) {
      this.contactError.set('Enter a customer to continue.');
      form.ownerDocument.getElementById('booking-customer-phone')?.focus();
      return;
    }
    this.contactError.set('');
    this.contact.markAllAsTouched();
    if (this.contact.invalid) {
      focusInvalid(form);
      return;
    }
    this.setStep(3);
  }

  setStep(step: 1 | 2 | 3) {
    if (this.saving() || this.uncertain()) return;
    this.step.set(step);
    this.focusStep();
  }

  private focusStep() {
    afterNextRender(
      { write: () => this.heading()?.nativeElement.focus() },
      { injector: this.injector },
    );
  }

  kin(): Contact {
    const draft = this.contact.getRawValue();
    const email = draft.email.trim().toLowerCase();
    return {
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      phoneNumber: normalizeNigerianPhone(draft.phoneNumber),
      ...(email ? { email } : {}),
    };
  }

  async submit() {
    if (
      !this.active() ||
      !this.allowed() ||
      this.step() !== 3 ||
      this.saving() ||
      this.uncertain() ||
      !this.availability.hasValue() ||
      !this.business.hasValue()
    )
      return;
    const trip = this.availability.value().trip;
    const previous = this.previous.hasValue() ? this.previous.value() : undefined;
    const customer = this.reuseId ? previous?.customer : this.selectedCustomer();
    const operator = this.access.employee()?._id;
    const method = this.method.value as PaymentMethod;
    if (
      !customer ||
      !operator ||
      !this.seat() ||
      this.contact.invalid ||
      !this.access.canBookFrom(trip.route?.originBranch?._id)
    )
      return;
    if (
      this.reuseId &&
      (!previous ||
        previous.booking.status !== 'CANCELLED' ||
        previous.booking.reusedBy ||
        !this.readyToPay())
    )
      return;
    const paid = !this.reuseId || this.isAdditionalPayment();
    this.method.markAsTouched();
    if (paid && !this.paymentOptions().some(({ value }) => value === method)) {
      this.method.setErrors({ server: 'Choose an available payment method.' });
      return;
    }
    const bloodgroup = this.contact.controls.bloodgroup.value.trim();
    const seatInput = {
      trip: trip._id,
      seatNumber: this.seat(),
      nextOfKin: this.kin(),
      ...(bloodgroup ? { bloodgroup } : {}),
    };
    const body: BookingInput =
      this.reuseId && previous
        ? {
            ...seatInput,
            previousTicket: previous.booking.ticket,
            ...(paid ? { payment: { method, amount: this.additionalAmount()! } } : {}),
          }
        : { ...seatInput, customer: customer._id, payment: { method } };
    const reviewedFare = seatFare(trip, body.seatNumber);
    let attempt: SaleAttempt | undefined;
    this.saving.set(true);
    this.errors.set([]);
    this.notice.set('');
    try {
      const [fresh, business] = await Promise.all([
        this.readAvailability(trip._id),
        this.bookingApi.business(),
      ]);
      if (!this.active()) return;
      this.availability.set(fresh);
      this.business.set(business);
      if (!this.allowed() || !this.access.canBookFrom(fresh.trip.route?.originBranch?._id)) {
        this.errors.set(['Staff booking is unavailable for this departure.']);
        return;
      }
      const freshSeat = availableSeat(fresh, body.seatNumber);
      if (!freshSeat || fresh.trip.status !== 'SCHEDULED') {
        this.requireSeatReview(
          fresh,
          'Seat availability changed. Check the departure and choose an available seat.',
        );
        return;
      }
      if (
        seatFare(fresh.trip, freshSeat) !== reviewedFare ||
        fresh.trip.departureTime !== trip.departureTime
      ) {
        this.notice.set(
          'The fare or departure time changed. Review the current booking details before confirming.',
        );
        return;
      }
      if (paid && business.settings?.[paymentFlags[method]] === false) {
        this.method.setValue('');
        this.errors.set(['That payment method is no longer available. Choose another method.']);
        return;
      }
      body.seatNumber = freshSeat;
      attempt = { body, customer: customer._id, operator, startedAt: Date.now() };
      const data = await this.bookingApi.create(body);
      if (!this.active()) return;
      this.receipt.set({ data, trip: fresh.trip });
      this.tripApi.bookingChanged(trip._id);
      this.availability.reload();
      this.focusStep();
    } catch (error) {
      if (!this.active()) return;
      const status = error instanceof HttpErrorResponse ? error.status : undefined;
      if (
        attempt &&
        (status === undefined || status === 0 || status === 408 || status >= 500 || status < 300)
      ) {
        this.uncertain.set(attempt);
        this.notice.set(
          'Confirmation was interrupted. Check for an existing booking before you try again.',
        );
      } else {
        this.errors.set(errorMessages(error));
        if (
          attempt &&
          this.reuseId &&
          (status === 409 || status === 404) &&
          (await this.refreshPrevious())
        )
          return;
        if (attempt && [400, 403, 404, 409].includes(status ?? 0)) {
          await this.refreshAfterError(trip._id, status === 409);
        }
      }
    } finally {
      this.saving.set(false);
    }
  }

  private async refreshPrevious() {
    if (!this.reuseId) return false;
    try {
      const source = await this.readPrevious(this.reuseId);
      if (!this.active()) return true;
      this.previous.set(source);
      return !!source.booking.reusedBy || source.booking.status !== 'CANCELLED';
    } catch {
      if (this.active()) this.previous.reload();
      return false;
    }
  }

  private async refreshAfterError(id: string, review: boolean) {
    this.business.reload();
    try {
      const fresh = await this.readAvailability(id);
      if (!this.active()) return;
      this.availability.set(fresh);
      if (review || !availableSeat(fresh, this.seat()) || fresh.trip.status !== 'SCHEDULED') {
        this.requireSeatReview(
          fresh,
          'Review the updated seat availability and fare before confirming again.',
        );
      }
    } catch (error) {
      if (!this.active()) return;
      this.errors.update((messages) => [...messages, ...tripReadErrors(error)]);
      this.availability.reload();
      this.step.set(1);
      this.focusStep();
    }
  }

  private requireSeatReview(fresh: Availability, message: string) {
    const label = fresh.trip.status === 'SCHEDULED' ? availableSeat(fresh, this.seat()) : undefined;
    if (!label) this.clearSeat();
    else {
      this.seat.set(label);
      const row = fresh.trip.seatLayoutSnapshot.rows.find(({ cells }) =>
        cells.some((cell) => cell.type === 'SEAT' && cell.seatNumber === label),
      );
      if (row)
        this.position.set({
          row: row.row,
          column: row.cells.findIndex((cell) => cell.type === 'SEAT' && cell.seatNumber === label),
        });
    }
    this.notice.set(message);
    this.step.set(1);
    this.focusStep();
  }

  async checkAttempt() {
    const attempt = this.uncertain();
    if (!attempt || this.saving() || !this.active()) return;
    this.saving.set(true);
    this.errors.set([]);
    try {
      let page = 1;
      while (this.active()) {
        const matches = await this.bookingApi.list({
          trip: attempt.body.trip,
          customer: attempt.customer,
          page,
          limit: 25,
        });
        if (!this.active()) return;
        const match = matches.content.find(
          (booking) =>
            booking.bookedBy === attempt.operator &&
            (!this.reuseId || booking.rebookedFrom === this.reuseId) &&
            booking.seatNumber.toLowerCase() === attempt.body.seatNumber.toLowerCase() &&
            Date.parse(booking.createdAt) >= attempt.startedAt - 120_000,
        );
        if (match) {
          this.recovered.set(match);
          this.uncertain.set(null);
          this.notice.set('');
          this.tripApi.bookingChanged(attempt.body.trip);
          this.focusStep();
          return;
        }
        if (
          !matches.hasNext ||
          matches.content.some(
            (booking) => Date.parse(booking.createdAt) < attempt.startedAt - 120_000,
          )
        )
          break;
        page = matches.currentPage + 1;
      }
      if (this.reuseId && (await this.refreshPrevious())) {
        this.uncertain.set(null);
        this.notice.set('');
        return;
      }
      await this.refreshAfterError(attempt.body.trip, true);
      if (!this.active()) return;
      if (this.availability.hasValue()) {
        this.uncertain.set(null);
        this.notice.set(
          'No matching booking was found. Review the current seat and fare before trying again.',
        );
      }
    } catch (error) {
      if (this.active()) this.errors.set(errorMessages(error));
    } finally {
      this.saving.set(false);
    }
  }

  another() {
    if (this.reuseId) return;
    this.receipt.set(null);
    this.recovered.set(null);
    this.clearSeat();
    this.customer.set(null);
    this.phone.reset();
    this.contact.reset();
    this.method.reset();
    this.errors.set([]);
    this.notice.set('');
    this.availability.reload();
    this.setStep(1);
  }

  private clearSeat() {
    this.position.set(null);
    this.seat.set('');
  }

  leave() {
    if (!this.active() || this.receipt() || this.recovered()) return true;
    if (this.saving()) return false;
    if (!this.hasDraft()) return true;
    this.resolveLeave?.(false);
    this.discard.set(true);
    return new Promise<boolean>((resolve) => {
      this.resolveLeave = resolve;
    });
  }

  beforeUnload(event: BeforeUnloadEvent) {
    if (
      this.active() &&
      !this.receipt() &&
      !this.recovered() &&
      (this.saving() || this.hasDraft())
    ) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  private hasDraft() {
    return !!(
      this.seat() ||
      this.phone.value ||
      this.contact.dirty ||
      this.method.dirty ||
      this.reusePayment.dirty ||
      (this.tripId() && this.tripId() !== this.originTrip) ||
      this.uncertain()
    );
  }

  finishLeave(leave: boolean) {
    this.discard.set(false);
    this.resolveLeave?.(leave);
    this.resolveLeave = undefined;
  }
}
