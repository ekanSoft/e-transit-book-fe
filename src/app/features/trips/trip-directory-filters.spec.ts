import { convertToParamMap } from '@angular/router';
import {
  parseTripDepartureDate,
  readTripQuery,
  tripDefaultIsToday,
  tripQueryParams,
  TRIP_ALL_DATES,
} from './trip-directory-filters';
import { watDate } from './trip-format';

describe('trip directory filters', () => {
  it('defaults booking agents to today and other roles to all dates', () => {
    expect(tripDefaultIsToday('BOOKING_AGENT')).toBe(true);
    expect(tripDefaultIsToday('ADMIN')).toBe(false);
    expect(parseTripDepartureDate(null, false, true)).toBe(watDate());
    expect(parseTripDepartureDate(null, false, false)).toBe('');
    expect(parseTripDepartureDate(TRIP_ALL_DATES, true, true)).toBe('');
  });

  it('round-trips query params for route, status, page and limit', () => {
    const params = convertToParamMap({
      route: 'route-1',
      status: 'SCHEDULED',
      departureDate: '2026-11-24',
      page: '3',
      limit: '25',
    });
    const query = readTripQuery(params, false);
    expect(query).toEqual({
      page: 3,
      limit: 25,
      departureDate: '2026-11-24',
      route: 'route-1',
      status: 'SCHEDULED',
    });
    expect(tripQueryParams(query, false)).toEqual({
      route: 'route-1',
      status: 'SCHEDULED',
      page: 3,
      limit: 25,
      departureDate: '2026-11-24',
    });
  });

  it('stores all-date choice explicitly for booking agents', () => {
    const query = { page: 1, limit: 10, departureDate: '' };
    expect(tripQueryParams(query, true)).toEqual({
      route: null,
      status: null,
      page: null,
      limit: null,
      departureDate: TRIP_ALL_DATES,
    });
  });
});