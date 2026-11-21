import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/http/api';
import type { SeatLayout } from '../../shared/seat-map/seat-layout';
import type { Page } from '../workspace/workspace-data';

export const typeLabels = {
  CAR: 'Car',
  SIENNA: 'Sienna',
  BUS: 'Bus',
  COASTER: 'Coaster',
  LUXURY_BUS: 'Luxury bus',
  BOAT: 'Boat',
  OTHER: 'Other',
} as const;
export type VehicleType = keyof typeof typeLabels;
export type LayoutStatus = 'ACTIVE' | 'INACTIVE';
export interface LayoutInput {
  name: string;
  type: VehicleType;
  customType?: string;
  seatLayout: SeatLayout;
}
export interface VehicleLayout extends LayoutInput {
  _id: string;
  capacity: number;
  status: LayoutStatus;
}
export interface LayoutQuery {
  page: number;
  limit: number;
  search: string;
  type: string;
  status: string;
}

export function layoutChanges(saved: LayoutInput, draft: LayoutInput): Partial<LayoutInput> {
  const changes: Partial<LayoutInput> = {};
  if (draft.name !== saved.name) changes.name = draft.name;
  if (draft.type !== saved.type) changes.type = draft.type;
  if (draft.type === 'OTHER' && draft.customType !== saved.customType)
    changes.customType = draft.customType;
  if (JSON.stringify(draft.seatLayout) !== JSON.stringify(saved.seatLayout))
    changes.seatLayout = draft.seatLayout;
  return changes;
}

@Injectable({ providedIn: 'root' })
export class LayoutApi {
  private readonly api = inject(Api);
  private readonly path = '/vehicle-layouts';
  list({ page, limit, search, type, status }: LayoutQuery) {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) query.set('search', search);
    if (type) query.set('type', type);
    if (status) query.set('status', status);
    return this.api.get<Page<VehicleLayout>>(this.path + '?' + query);
  }
  detail(id: string) {
    return this.api.get<VehicleLayout>(this.path + '/' + id);
  }
  create(body: LayoutInput) {
    return this.api.post<VehicleLayout>(this.path, body);
  }
  update(id: string, body: Partial<LayoutInput>) {
    return this.api.patch<VehicleLayout>(this.path + '/' + id, body);
  }
  toggle(id: string) {
    return this.api.patch<VehicleLayout>(this.path + '/' + id + '/toggle-status', null);
  }
}
