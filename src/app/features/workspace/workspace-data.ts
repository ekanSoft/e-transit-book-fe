import { inject, Injectable } from '@angular/core';
import { Api } from '../../core/http/api';
import { Address, EmployeeRole } from '../../core/http/api.models';
export interface Page<T> {
  content: T[];
  currentPage: number;
  totalPages: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}
export interface Branch {
  _id: string;
  name: string;
  phoneNumber?: string;
  address?: Address;
  primeBranch?: boolean;
}
export interface Departure {
  _id: string;
  departureTime: string;
  bookedSeatCount: number;
  route: {
    originBranch: Pick<Branch, 'name'> | null;
    destinationBranch: Pick<Branch, 'name'> | null;
  } | null;
}
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'POS';
export interface DashboardReport {
  period: { from: string; to: string; timeZone: 'Africa/Lagos' };
  currency: 'NGN';
  branch: string | null;
  revenue: number;
  paymentCount: number;
  bookingsCreated: number;
  paymentsByMethod: Record<PaymentMethod, { revenue: number; paymentCount: number }>;
  bookingsByChannel: { WALK_IN: number; ONLINE: number };
  trips: { tripCount: number; seatsSold: number; capacity: number; occupancyPercent: number };
  upcomingTrips: { total: number; items: Departure[]; asOf: string };
}
export interface SalesReport {
  rows: { date: string; revenue: number; paymentCount: number }[];
}
export function canReadReports(role?: EmployeeRole) {
  return (
    role === 'ADMIN' ||
    role === 'OPERATIONS_MANAGER' ||
    role === 'ACCOUNTANT' ||
    role === 'BRANCH_MANAGER'
  );
}
const watDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Lagos',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
export function period(days: number, now = new Date()) {
  const to = watDay.format(now);
  const start = new Date(to + 'T12:00:00Z');
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { from: start.toISOString().slice(0, 10), to };
}
export function addressLabel(address?: Address) {
  return (
    address &&
    [address.street, address.city, address.state, address.country].filter(Boolean).join(', ')
  );
}
@Injectable({ providedIn: 'root' })
export class WorkspaceData {
  private readonly api = inject(Api);
  branches(page: number, search = '', limit = 12) {
    return this.api.get<Page<Branch>>(
      '/branch?' + new URLSearchParams({ page: String(page), limit: String(limit), search }),
    );
  }
  async primaryBranch(abort: AbortSignal) {
    // The list is newest first. Only primeBranch identifies the registration branch.
    for (let number = 1; !abort.aborted; number++) {
      const { data } = await this.branches(number, '', 100);
      const primary = data.content.find((branch) => branch.primeBranch);
      if (primary || !data.hasNext) return primary ?? null;
    }
    return null;
  }
}
