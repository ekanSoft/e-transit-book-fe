import { inject, Injectable, linkedSignal } from '@angular/core';
import { WorkspaceAccess } from '../../core/auth/workspace-access';
import type { VehicleLayout } from '../vehicle-layouts/layout-api';
import type { TripPricing } from './trip-api';
import { fitSeatFares } from './trip-fields';

export const tripScheduleOrigin = 'trip-schedule';

export interface ScheduleDraft {
  step: number;
  route: string;
  layout: string;
  departure: string;
  arrival: string;
  fare: string;
  overrides: TripPricing['seatOverrides'];
  removed: string[];
}

@Injectable({ providedIn: 'root' })
export class TripScheduleDraft {
  private readonly access = inject(WorkspaceAccess);
  readonly saved = linkedSignal({
    source: this.access.scope,
    computation: (): ScheduleDraft | null => null,
  });

  selectCreatedLayout(layout: VehicleLayout) {
    const draft = this.saved();
    if (draft?.step !== 1 || !this.access.canScheduleTrip() || layout.status !== 'ACTIVE') {
      return false;
    }
    this.saved.set({ ...draft, ...fitSeatFares(layout.seatLayout, draft), layout: layout._id });
    return true;
  }
}
