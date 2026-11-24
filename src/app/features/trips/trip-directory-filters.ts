import type { ParamMap } from '@angular/router';
import type { EmployeeRole } from '../../core/http/api.models';
import { isCalendarDate, watDate } from './trip-format';
import type { TripQuery } from './trip-api';

export const TRIP_ALL_DATES = 'all';

export function tripDefaultIsToday(role: EmployeeRole | undefined) {
  return role === 'BOOKING_AGENT';
}

export function parseTripDepartureDate(
  value: string | null,
  present: boolean,
  defaultIsToday: boolean,
) {
  if (present) {
    if (value === TRIP_ALL_DATES) return '';
    if (value && isCalendarDate(value)) return value;
    return defaultIsToday ? watDate() : '';
  }
  return defaultIsToday ? watDate() : '';
}

export function readTripQuery(
  params: ParamMap,
  defaultIsToday: boolean,
  defaults: Pick<TripQuery, 'page' | 'limit'> = { page: 1, limit: 10 },
): TripQuery {
  const route = params.get('route') ?? '';
  const status = params.get('status') ?? '';
  const limit = [10, 25, 50].includes(Number(params.get('limit')))
    ? Number(params.get('limit'))
    : defaults.limit;
  const page = Math.max(1, Number(params.get('page')) || defaults.page);
  const departureDate = parseTripDepartureDate(
    params.get('departureDate'),
    params.has('departureDate'),
    defaultIsToday,
  );
  return {
    page,
    limit,
    departureDate,
    ...(route ? { route } : {}),
    ...(status ? { status } : {}),
  };
}

export function tripQueryParams(query: TripQuery, defaultIsToday: boolean) {
  return {
    route: query.route || null,
    status: query.status || null,
    page: query.page > 1 ? query.page : null,
    limit: query.limit !== 10 ? query.limit : null,
    departureDate: query.departureDate
      ? query.departureDate
      : defaultIsToday
        ? TRIP_ALL_DATES
        : null,
  };
}