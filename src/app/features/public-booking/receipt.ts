import type { Fees } from './attempts';
export interface Receipt {
  businessName: string;
  origin: string;
  destination: string;
  departureTime: string;
  passengerName: string;
  seatNumber: string;
  ticket: string;
  reference: string;
  paidAt: string | null;
  confirmedAt: string;
  currency: 'NGN';
  fees: Fees;
}
