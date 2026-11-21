import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { TripApi, type Trip, type TripCopyInput } from './trip-api';
import { tripChanges } from './trip-edit-dialog';
import { isFare, timeFields, validateTripTimes, watInput, watInstant } from './trip-fields';
import { shiftDays, watDate } from './trip-format';

const trip: Trip = {
  _id: 'trip-a',
  route: null,
  vehicleLayout: null,
  departureTime: '2027-01-12T22:55:23Z',
  estimatedArrivalTime: '2027-01-13T01:15:00Z',
  status: 'SCHEDULED',
  seatLayoutSnapshot: { rows: [{ row: 1, cells: [{ type: 'SEAT', seatNumber: '1A' }] }] },
  pricing: { baseFare: 15000, seatOverrides: [{ seatNumber: '1A', fare: 22000 }] },
  bookedSeatCount: 0,
};

describe('trip times and pricing', () => {
  it('uses the WAT date at the UTC day boundary and preserves overnight times', () => {
    expect(watDate('2027-01-12T22:59:59Z')).toBe('2027-01-12');
    expect(watDate('2027-01-12T23:00:00Z')).toBe('2027-01-13');
    expect(watInput(trip.departureTime)).toBe('2027-01-12T23:55');
    expect(watInstant('2027-01-13T02:15')).toBe('2027-01-13T02:15:00+01:00');
    expect(watInstant('2027-02-29T02:15')).toBe('');
    const times = timeFields(watInput(trip.departureTime), watInput(trip.estimatedArrivalTime));
    expect(
      validateTripTimes(
        times,
        trip.departureTime,
        trip.estimatedArrivalTime,
        true,
        Date.parse('2027-01-12T22:00Z'),
      ),
    ).toBe(true);
    expect(
      validateTripTimes(
        times,
        trip.departureTime,
        trip.estimatedArrivalTime,
        true,
        Date.parse(trip.departureTime),
      ),
    ).toBe(false);
    expect(
      validateTripTimes(
        times,
        trip.departureTime,
        trip.estimatedArrivalTime,
        false,
        Date.parse(trip.departureTime),
      ),
    ).toBe(true);
    expect(validateTripTimes(times, trip.departureTime, trip.departureTime, false)).toBe(false);
    expect(times.controls.estimatedArrivalTime.hasError('server')).toBe(true);
  });

  it('preserves the source clock and arrival offset when shifting calendar days', () => {
    expect(watInput(shiftDays(trip.departureTime, 7).toISOString())).toBe('2027-01-19T23:55');
    expect(watInput(shiftDays(trip.estimatedArrivalTime!, 7).toISOString())).toBe(
      '2027-01-20T02:15',
    );
  });

  it('accepts only whole naira within the DTO bounds', () => {
    expect(isFare('99')).toBe(false);
    expect(isFare('100')).toBe(true);
    expect(isFare('100.5')).toBe(false);
    expect(isFare('9007199254740991')).toBe(true);
    expect(isFare('9007199254740992')).toBe(false);
  });

  it('omits untouched departure even if saved with seconds, clears arrival, and retains seat fares', () => {
    const pricing = { ...trip.pricing, baseFare: 16000 };
    expect(tripChanges(trip, '2027-01-12T23:55', '', pricing)).toEqual({
      estimatedArrivalTime: null,
      pricing,
    });
    expect(
      tripChanges(trip, '2027-01-12T23:55', '2027-01-13T02:15', {
        ...trip.pricing,
        seatOverrides: [],
      }),
    ).toEqual({ pricing: { baseFare: 15000, seatOverrides: [] } });
    expect(tripChanges(trip, '2027-01-12T23:56', '2027-01-13T02:15', trip.pricing)).toEqual({
      departureTime: '2027-01-12T23:56:00+01:00',
    });
  });
});

describe('trip HTTP contracts', () => {
  let api: TripApi;
  let http: HttpTestingController;
  const path = environment.apiBaseUrl + '/trips';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(TripApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('sends server pagination and only supported selected filters', async () => {
    const pending = api.list({
      page: 2,
      limit: 25,
      route: 'route-a',
      departureDate: '',
      status: 'SCHEDULED',
    });
    const page = {
      content: [trip],
      total: 26,
      pageSize: 1,
      totalPages: 2,
      currentPage: 2,
      hasNext: false,
      hasPrev: true,
    };
    http
      .expectOne({ method: 'GET', url: path + '?page=2&limit=25&route=route-a&status=SCHEDULED' })
      .flush({ data: page });
    expect(await pending).toEqual(page);
  });

  it('collects the entire day using the server page flags', async () => {
    const pending = api.listDay('2027-01-12', new AbortController().signal);
    const page = {
      content: [trip],
      total: 2,
      pageSize: 1,
      totalPages: 2,
      currentPage: 1,
      hasNext: true,
      hasPrev: false,
    };
    http.expectOne(path + '?departureDate=2027-01-12&page=1&limit=50').flush({ data: page });
    const next = await vi.waitFor(() =>
      http.expectOne(path + '?departureDate=2027-01-12&page=2&limit=50'),
    );
    const second = { ...trip, _id: 'trip-b' };
    next.flush({
      data: { ...page, content: [second], currentPage: 2, hasNext: false, hasPrev: true },
    });
    expect(await pending).toEqual([trip, second]);
  });

  it('adds checkOnly for preview and omits it and the unchanged layout from save', async () => {
    const plan: TripCopyInput = {
      fromDate: '2027-01-12',
      days: [{ date: '2027-01-13', trips: [{ sourceTrip: trip._id }] }],
    };
    const check = api.checkCopy(plan);
    const checkRequest = http.expectOne({ method: 'POST', url: path + '/copy-day' });
    expect(checkRequest.request.body).toEqual({ ...plan, checkOnly: true });
    const problems = [
      { date: '2027-01-13', sourceTrip: trip._id, message: 'Vehicle layout is inactive' },
    ];
    checkRequest.flush({ data: { tripCount: 0, problems, removedSeatPrices: [] } });
    expect((await check).problems).toEqual(problems);
    const save = api.saveCopy(plan);
    const saveRequest = http.expectOne({ method: 'POST', url: path + '/copy-day' });
    expect(saveRequest.request.body).toEqual(plan);
    saveRequest.flush({ data: { tripCount: 1, removedSeatPrices: [] } });
    expect((await save).tripCount).toBe(1);
  });
});
