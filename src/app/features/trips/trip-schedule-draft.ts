import { inject, Injectable, linkedSignal } from '@angular/core';
import { WorkspaceAccess } from '../../core/auth/workspace-access';
import type { TripPricing } from './trip-api';

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
}
