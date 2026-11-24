import { inject, Injectable } from '@angular/core';
import { Api } from '../../core/http/api';
import type { Business } from '../../core/http/api.models';
import type { Contact, RecordPage } from '../customers/customer-api';
import type { TripSummary } from '../trips/trip-api';
import type { PaymentMethod } from '../workspace/workspace-data';

export const bookingStatuses = {
  CONFIRMED: 'Confirmed',
  CHECKED_IN: 'Checked in',
  CANCELLED: 'Cancelled',
} as const;
export type BookingStatus = keyof typeof bookingStatuses;

interface BookingRecord {
  _id: string;
  business: string;
  route: string;
  branch: string;
  customer: string;
  bookedBy?: string | null;
  passenger: Omit<Contact, 'email'>;
  nextOfKin?: Contact | null;
  bloodgroup?: string | null;
  ticket: string;
  seatNumber: string;
  fare: number;
  status: BookingStatus;
  channel: 'WALK_IN' | 'ONLINE';
  checkIn?: { checkedInAt: string; checkedInBy: string } | null;
  cancellation?: {
    reason: 'CUSTOMER_REQUEST' | 'MISSED';
    cancelledAt: string;
    cancelledBy: string | null;
  } | null;
  rebookedFrom?: string | null;
  reusedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Booking extends BookingRecord {
  trip: Pick<TripSummary, '_id' | 'departureTime' | 'status'> | null;
}

export interface RecordedPayment {
  _id: string;
  method: PaymentMethod;
  amount: number;
}

export interface BookingReceipt {
  booking: BookingRecord & { trip: string };
  transaction: RecordedPayment | null;
}

interface BookingSeatInput {
  trip: string;
  seatNumber: string;
  nextOfKin: Contact;
  bloodgroup?: string;
}

export type BookingInput = BookingSeatInput &
  (
    | { customer: string; payment: { method: PaymentMethod }; previousTicket?: never }
    | {
        previousTicket: string;
        payment?: { method: PaymentMethod; amount: number };
        customer?: never;
      }
  );

export interface BookingQuery {
  page: number;
  limit: number;
  customer?: string;
  trip?: string;
  status?: BookingStatus;
}

export function bookingStatus(booking: Pick<Booking, 'status' | 'cancellation'>) {
  return booking.status === 'CANCELLED' && booking.cancellation?.reason === 'MISSED'
    ? 'Missed'
    : bookingStatuses[booking.status];
}

export function ticketCode(value: string) {
  return value.trim().toUpperCase();
}

@Injectable({ providedIn: 'root' })
export class BookingApi {
  private readonly api = inject(Api);

  async list(query: BookingQuery) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value) params.set(key, String(value));
    }
    return (await this.api.get<RecordPage<Booking>>('/bookings?' + params)).data;
  }

  async detail(id: string) {
    return (await this.api.get<Booking>('/bookings/' + encodeURIComponent(id))).data;
  }

  async ticket(ticket: string) {
    return (await this.api.get<Booking>(this.ticketPath(ticket))).data;
  }

  async create(body: BookingInput) {
    return (await this.api.post<BookingReceipt>('/bookings', body)).data;
  }

  async checkIn(ticket: string) {
    return (
      await this.api.patch<BookingReceipt['booking']>(this.ticketPath(ticket) + '/check-in', null)
    ).data;
  }

  async cancel(id: string) {
    return (
      await this.api.patch<BookingReceipt['booking']>(
        '/bookings/' + encodeURIComponent(id) + '/cancel',
        null,
      )
    ).data;
  }

  async business() {
    return (await this.api.get<Business>('/business')).data;
  }

  private ticketPath(ticket: string) {
    return '/bookings/tickets/' + encodeURIComponent(ticketCode(ticket));
  }
}
