import { FormControl, FormGroup, Validators } from '@angular/forms';
import type { SeatLayout } from '../../shared/seat-map/seat-layout';
import type { TripPricing } from './trip-api';
import { isCalendarDate } from './trip-format';

export const minFare = 100;
export const fareHint = 'Enter a whole amount in naira, starting at ₦100.';

export function isFare(value: string) {
  return /^\d+$/.test(value) && Number(value) >= minFare && Number.isSafeInteger(Number(value));
}

export function fareControl(value = '') {
  return new FormControl(value, {
    nonNullable: true,
    validators: [
      Validators.required,
      (control) =>
        isFare(control.value)
          ? null
          : { server: 'Enter whole naira from ₦100 to ₦9,007,199,254,740,991.' },
    ],
  });
}

export function choiceControl(value = '') {
  return new FormControl(value, { nonNullable: true, validators: Validators.required });
}

const inputFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Lagos',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function watInput(instant?: string | null) {
  if (!instant) return '';
  const parts = new Map(
    inputFormat.formatToParts(new Date(instant)).map(({ type, value }) => [type, value]),
  );
  return (
    parts.get('year') +
    '-' +
    parts.get('month') +
    '-' +
    parts.get('day') +
    'T' +
    parts.get('hour') +
    ':' +
    parts.get('minute')
  );
}

export function watInstant(value: string) {
  return /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) &&
    isCalendarDate(value.slice(0, 10))
    ? value + ':00+01:00'
    : '';
}

export function timeFields(departure = '', arrival = '') {
  return new FormGroup({
    departureTime: choiceControl(departure),
    estimatedArrivalTime: new FormControl(arrival, { nonNullable: true }),
  });
}

export function validateTripTimes(
  form: ReturnType<typeof timeFields>,
  departure: string,
  arrival: string | null,
  futureDeparture: boolean,
  now = Date.now(),
) {
  const { departureTime, estimatedArrivalTime } = form.controls;
  // Cross-field errors can become irrelevant when the other time changes.
  departureTime.updateValueAndValidity();
  estimatedArrivalTime.updateValueAndValidity();
  form.markAllAsTouched();
  const start = Date.parse(departure);
  const end = arrival ? Date.parse(arrival) : null;
  if (!Number.isFinite(start)) {
    departureTime.setErrors({ server: 'Enter a valid departure date and time.' });
  } else if (futureDeparture && start <= now) {
    departureTime.setErrors({ server: 'Choose a departure in the future.' });
  }
  if (estimatedArrivalTime.value && (end === null || !Number.isFinite(end))) {
    estimatedArrivalTime.setErrors({ server: 'Enter a valid arrival date and time.' });
  } else if (end !== null && end <= start) {
    estimatedArrivalTime.setErrors({ server: 'Estimated arrival must be after departure.' });
  }
  return form.valid;
}

export function seatNames(grid: SeatLayout) {
  return new Map(
    grid.rows.flatMap(({ cells }) =>
      cells.flatMap((cell) =>
        cell.type === 'SEAT' ? [[cell.seatNumber.toLowerCase(), cell.seatNumber] as const] : [],
      ),
    ),
  );
}

export function fitSeatFares(
  grid: SeatLayout,
  { overrides, removed }: { overrides: TripPricing['seatOverrides']; removed: string[] },
) {
  const names = seatNames(grid);
  const kept: TripPricing['seatOverrides'] = [];
  const dropped = new Set(removed);
  for (const item of overrides) {
    const seatNumber = names.get(item.seatNumber.toLowerCase());
    if (seatNumber) kept.push({ ...item, seatNumber });
    else dropped.add(item.seatNumber);
  }
  return { overrides: kept, removed: [...dropped] };
}
