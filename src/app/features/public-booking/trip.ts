import type { Fees } from './attempts';
import type { SeatLayout } from '../../shared/seat-map/seat-layout';
import type { PublicRoute } from './public-store';
export interface PublicVehicleLayout {
  _id: string;
  name: string;
  type: string;
  capacity: number;
  customType?: string;
}
const vehicleTypes: Record<string, string> = {
  CAR: 'Car',
  SIENNA: 'Sienna',
  BUS: 'Bus',
  COASTER: 'Coaster',
  LUXURY_BUS: 'Luxury bus',
  BOAT: 'Boat',
  OTHER: 'Other',
};
export function vehicleType(layout: PublicVehicleLayout | null | undefined) {
  if (!layout?.type) return '';
  if (layout.type === 'OTHER' && layout.customType) return layout.customType;
  return vehicleTypes[layout.type] ?? layout.type;
}
export interface Departure {
  _id: string;
  departureTime: string;
  estimatedArrivalTime: string | null;
  startingFare: number | null;
  availableSeatCount: number;
  vehicleLayout: PublicVehicleLayout | null;
}
export interface Seat {
  seatNumber: string;
  fare: number;
  available: boolean;
  fees: Fees;
}
export interface PublicTrip extends Pick<
  Departure,
  '_id' | 'departureTime' | 'estimatedArrivalTime'
> {
  route: PublicRoute;
  seatLayoutSnapshot: SeatLayout;
  seats: Seat[];
}
