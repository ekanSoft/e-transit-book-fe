import { HttpErrorResponse } from '@angular/common/http';
import { errorMessages } from '../../core/http/errors';
import { terminalName } from '../routes/route-labels';
import type { Route, RouteTerminal } from '../workspace/workspace-data';

const zone = 'Africa/Lagos';
const day = new Intl.DateTimeFormat('en-CA', {
  timeZone: zone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const dateTime = new Intl.DateTimeFormat('en-NG', {
  timeZone: zone,
  dateStyle: 'medium',
  timeStyle: 'short',
});
const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

export function watDate(value: Date | string = new Date()) {
  return day.format(new Date(value));
}

export function isCalendarDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const instant = new Date(date + 'T12:00:00+01:00');
  return Number.isFinite(instant.getTime()) && watDate(instant) === date;
}

export function shiftDays(value: string, days: number) {
  return new Date(Date.parse(value) + days * 86_400_000);
}

export function showWat(value: string) {
  return dateTime.format(new Date(value)) + ' WAT';
}

export function fareLabel(amount: number) {
  return naira.format(amount);
}

export function routeLabel(route: Route | null | undefined) {
  if (!route) return 'Route unavailable';
  return (
    (route.originBranch?.name || 'Origin unavailable') +
    ' → ' +
    (route.destinationBranch?.name || 'Destination unavailable')
  );
}

function terminalLocation(terminal: RouteTerminal | null | undefined) {
  return [terminal?.address?.city, terminal?.address?.state].filter(Boolean).join(', ');
}

export function routeLocation(route: Route | null | undefined) {
  const origin = terminalLocation(route?.originBranch);
  const destination = terminalLocation(route?.destinationBranch);
  return origin && destination ? origin + ' → ' + destination : origin || destination;
}

function stateFirstTerminalLabel(terminal: RouteTerminal | null) {
  const address = terminal?.address;
  const state = address?.state?.trim() || address?.stateCode?.trim();
  return [state, address?.city?.trim()].filter(Boolean).join(', ') || terminalName(terminal);
}

export function routeLocationLabel(route: {
  originBranch: RouteTerminal | null;
  destinationBranch: RouteTerminal | null;
}) {
  return (
    stateFirstTerminalLabel(route.originBranch) +
    ' → ' +
    stateFirstTerminalLabel(route.destinationBranch)
  );
}

function terminalPlace(terminal: RouteTerminal | null | undefined) {
  return [terminal?.address?.state, terminal?.address?.city].filter(Boolean).join(', ');
}

export function routePlaceLabel(route: Route | null | undefined) {
  if (!route) return 'Route unavailable';
  const origin = terminalPlace(route.originBranch);
  const destination = terminalPlace(route.destinationBranch);
  return (
    (origin || 'Origin unavailable') +
    ' → ' +
    (destination || 'Destination unavailable')
  );
}

export function tripRouteChoiceLabel(route: Route) {
  return `${routeLocationLabel(route)} (${routeLabel(route)})`;
}

export function tripReadErrors(error: unknown) {
  if (error instanceof HttpErrorResponse && [403, 404].includes(error.status)) {
    return ['This trip is unavailable in your workspace.'];
  }
  return errorMessages(error);
}
