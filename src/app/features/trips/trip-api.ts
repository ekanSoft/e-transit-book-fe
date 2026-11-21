import { inject, Injectable } from '@angular/core';
import { Api } from '../../core/http/api';
import type { SeatLayout } from '../../shared/seat-map/seat-layout';
import type { VehicleLayout } from '../vehicle-layouts/layout-api';
import type { Page, Route } from '../workspace/workspace-data';

export const tripStatuses = {
  SCHEDULED: 'Scheduled',
  DEPARTED: 'Departed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
} as const;
export type TripStatus = keyof typeof tripStatuses;

export interface TripPricing {
  baseFare: number;
  seatOverrides: { seatNumber: string; fare: number }[];
}
export interface TripSummary {
  _id: string;
  route: Route | null;
  vehicleLayout: Pick<VehicleLayout, '_id' | 'name' | 'type' | 'customType' | 'capacity'> | null;
  departureTime: string;
  estimatedArrivalTime: string | null;
  pricing: TripPricing;
  status: TripStatus;
  bookedSeatCount: number;
}
export interface Trip extends TripSummary {
  seatLayoutSnapshot: SeatLayout;
}
export interface CreateTrip {
  route: string;
  vehicleLayout: string;
  departureTime: string;
  estimatedArrivalTime?: string | null;
  pricing: TripPricing;
}
type SavedTrip = Omit<Trip, 'route' | 'vehicleLayout'> & { route: string; vehicleLayout: string };
export type UpdateTrip = Partial<
  Pick<CreateTrip, 'departureTime' | 'estimatedArrivalTime' | 'pricing'>
>;
export type NextTripStatus = Exclude<TripStatus, 'SCHEDULED'>;
export interface TripQuery {
  page: number;
  limit: number;
  route?: string;
  status?: string;
  departureDate?: string;
}
export interface TripPage extends Page<TripSummary> {
  pageSize: number;
  nextPage?: number;
  previousPage?: number;
}

export interface TripCopyInput {
  fromDate: string;
  days: { date: string; trips: { sourceTrip: string; vehicleLayout?: string }[] }[];
}
interface CopyReference {
  date: string;
  sourceTrip: string;
}
export interface TripCopyResult {
  tripCount: number;
  removedSeatPrices: (CopyReference & { seatNumbers: string[] })[];
}
export interface TripCopyPreview extends TripCopyResult {
  problems: (CopyReference & { message: string })[];
}
export interface ManifestEntry {
  _id: string;
  ticket: string;
  seatNumber: string;
  passenger: { firstName: string; lastName: string; phoneNumber: string };
  status: 'CONFIRMED' | 'CHECKED_IN' | 'CANCELLED';
  channel: 'WALK_IN' | 'ONLINE';
  checkedInAt: string | null;
  missedAt: string | null;
}
export interface TripManifest {
  trip: Pick<TripSummary, '_id' | 'route' | 'status' | 'departureTime' | 'estimatedArrivalTime'> & {
    vehicleLayout: Omit<NonNullable<TripSummary['vehicleLayout']>, 'capacity'> | null;
    capacity: number;
  };
  summary: Record<'confirmed' | 'checkedIn' | 'activePassengers' | 'missed' | 'seatsSold', number>;
  passengers: ManifestEntry[];
  missedPassengers: ManifestEntry[];
}

@Injectable({ providedIn: 'root' })
export class TripApi {
  private readonly api = inject(Api);

  async list(query: TripQuery) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value) params.set(key, String(value));
    }
    return (await this.api.get<TripPage>('/trips?' + params)).data;
  }

  async detail(id: string) {
    return (await this.api.get<Trip>(tripPath(id))).data;
  }

  async listDay(date: string, signal: AbortSignal) {
    const trips = new Map<string, TripSummary>();
    let page = 1;
    let result: TripPage;
    do {
      signal.throwIfAborted();
      result = await this.list({ departureDate: date, page, limit: 50 });
      signal.throwIfAborted();
      for (const trip of result.content) trips.set(trip._id, trip);
      page = result.currentPage + 1;
    } while (result.hasNext);
    return [...trips.values()];
  }

  async bookedSeats(id: string) {
    return (await this.api.get<{ seatNumbers: string[] }>(tripPath(id) + '/booked-seats')).data
      .seatNumbers;
  }

  async create(body: CreateTrip) {
    return (await this.api.post<SavedTrip>('/trips', body)).data;
  }

  async update(id: string, body: UpdateTrip) {
    return (await this.api.patch<SavedTrip>(tripPath(id), body)).data;
  }

  async changeLayout(id: string, vehicleLayout: string) {
    return (
      await this.api.patch<{ trip: SavedTrip; removedSeatPrices: string[] }>(
        tripPath(id) + '/vehicle-layout',
        { vehicleLayout },
      )
    ).data;
  }

  async changeStatus(id: string, status: NextTripStatus) {
    return (await this.api.patch<SavedTrip>(tripPath(id) + '/status', { status })).data;
  }

  async checkCopy(body: TripCopyInput) {
    return (await this.api.post<TripCopyPreview>('/trips/copy-day', { ...body, checkOnly: true }))
      .data;
  }

  async saveCopy(body: TripCopyInput) {
    return (await this.api.post<TripCopyResult>('/trips/copy-day', body)).data;
  }

  async manifest(id: string) {
    return (await this.api.get<TripManifest>(tripPath(id) + '/manifest')).data;
  }
}

function tripPath(id: string) {
  return '/trips/' + encodeURIComponent(id);
}
