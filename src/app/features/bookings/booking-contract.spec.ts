import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { CustomerApi, customerChanges, type Customer } from '../customers/customer-api';
import { BookingApi, bookingStatus, type BookingInput } from './booking-api';
import { seatFare } from './booking-draft';

const base = environment.apiBaseUrl;
const contact = { firstName: 'Ada', lastName: 'Okafor', phoneNumber: '+2348012345678' };
const customer = {
  ...contact,
  _id: 'customer-a',
  business: 'business-a',
  phoneNumber: '2348012345678',
  email: 'ada@example.test',
  createdAt: '',
  updatedAt: '',
} satisfies Customer;

describe('staff booking HTTP contracts', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it.each(['08012345678', '2348012345678', '+2348012345678'])(
    'encodes %s as an exact customer lookup',
    async (phone) => {
      const result = TestBed.inject(CustomerApi).byPhone(phone);
      const request = TestBed.inject(HttpTestingController).expectOne({
        method: 'GET',
        url: base + '/customers?page=1&limit=1&phoneNumber=%2B2348012345678',
      });
      request.flush({ data: { content: [customer] } });
      expect(await result).toEqual(customer);
    },
  );

  it('edits only changed fields and preserves the saved email', () => {
    expect(customerChanges(customer, { ...contact, lastName: 'Eze' })).toEqual({ lastName: 'Eze' });
  });

  it('sends normal, free reuse and paid reuse payloads as supplied', async () => {
    const api = TestBed.inject(BookingApi);
    const http = TestBed.inject(HttpTestingController);
    const seat = { trip: 'trip-a', seatNumber: '1A', nextOfKin: contact };
    const bodies: BookingInput[] = [
      { ...seat, customer: customer._id, payment: { method: 'CASH' } },
      { ...seat, previousTicket: 'ABCD2345' },
      { ...seat, previousTicket: 'ABCD2345', payment: { method: 'POS', amount: 300 } },
    ];
    for (const body of bodies) {
      const result = api.create(body);
      const request = http.expectOne({ method: 'POST', url: base + '/bookings' });
      expect(request.request.body).toEqual(body);
      const receipt = { booking: { ticket: 'ABCD1234' }, transaction: null };
      request.flush({ data: receipt });
      expect(await result).toEqual(receipt);
    }
  });

  it('uses supported list filters, an encoded ticket path and bodyless mutations', async () => {
    const api = TestBed.inject(BookingApi);
    const http = TestBed.inject(HttpTestingController);
    const list = api.list({
      page: 2,
      limit: 12,
      trip: 'trip-a',
      customer: customer._id,
      status: 'CANCELLED',
    });
    http
      .expectOne(
        base + '/bookings?page=2&limit=12&trip=trip-a&customer=customer-a&status=CANCELLED',
      )
      .flush({ data: { content: [] } });
    const ticket = api.ticket('  ab/c  ');
    http.expectOne({ method: 'GET', url: base + '/bookings/tickets/AB%2FC' }).flush({ data: {} });
    const checkIn = api.checkIn('abcd1234');
    const check = http.expectOne({
      method: 'PATCH',
      url: base + '/bookings/tickets/ABCD1234/check-in',
    });
    expect(check.request.body).toBeNull();
    check.flush({ data: {} });
    const cancel = api.cancel('booking-id');
    const release = http.expectOne({ method: 'PATCH', url: base + '/bookings/booking-id/cancel' });
    expect(release.request.body).toBeNull();
    release.flush({ data: {} });
    await Promise.all([list, ticket, checkIn, cancel]);
  });

  it('labels missed tickets and applies a case-insensitive seat fare override', () => {
    const trip = { pricing: { baseFare: 2000, seatOverrides: [{ seatNumber: '1A', fare: 3000 }] } };
    expect(seatFare(trip, '1a')).toBe(3000);
    expect(seatFare(trip, '2a')).toBe(2000);
    expect(
      bookingStatus({
        status: 'CANCELLED',
        cancellation: {
          reason: 'MISSED',
          cancelledAt: '',
          cancelledBy: null,
        },
      }),
    ).toBe('Missed');
  });
});
