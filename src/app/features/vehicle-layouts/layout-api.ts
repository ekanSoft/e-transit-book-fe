import { computed, Injectable, inject } from '@angular/core';
import { WorkspaceAccess } from '../../core/auth/workspace-access';
import { Api } from '../../core/http/api';
import type { ApiResponse } from '../../core/http/api.models';
import type { SeatLayout } from '../../shared/seat-map/seat-layout';

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
interface LayoutCache {
  list?: Promise<ApiResponse<VehicleLayout[]>>;
  details: Map<string, Promise<ApiResponse<VehicleLayout>>>;
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
  private readonly access = inject(WorkspaceAccess);
  private readonly path = '/vehicle-layouts';
  private readonly cache = computed<LayoutCache | undefined>(() => {
    const scope = this.access.scope();
    return scope && this.access.canViewLayouts() ? { details: new Map() } : undefined;
  });

  private currentCache() {
    const cache = this.cache();
    if (!cache) throw new Error('Vehicle layouts are unavailable in this workspace.');
    return cache;
  }

  async list() {
    const cache = this.currentCache();
    if (cache.list) return cache.list;

    const request = this.api.get<VehicleLayout[]>(this.path).catch((error: unknown) => {
      if (cache.list === request) delete cache.list;
      throw error;
    });
    cache.list = request;
    return request;
  }

  async detail(id: string) {
    const cache = this.currentCache();
    const catalog = cache.list;
    if (catalog) {
      const response = await catalog.catch(() => undefined);
      if (cache !== this.cache()) throw new Error('The workspace changed.');
      if (response && cache.list === catalog) {
        const layout = response.data.find((item) => item._id === id);
        if (layout) return { ...response, data: layout };
      }
    }
    const existing = cache.details.get(id);
    if (existing) return existing;

    const request = this.api.get<VehicleLayout>(this.path + '/' + id).catch((error: unknown) => {
      if (cache.details.get(id) === request) cache.details.delete(id);
      throw error;
    });
    cache.details.set(id, request);
    return request;
  }

  create(body: LayoutInput) {
    return this.write(() => this.api.post<VehicleLayout>(this.path, body));
  }
  update(id: string, body: Partial<LayoutInput>) {
    return this.write(() => this.api.patch<VehicleLayout>(this.path + '/' + id, body));
  }
  toggle(id: string) {
    return this.write(
      () => this.api.patch<VehicleLayout>(this.path + '/' + id + '/toggle-status', null),
      id,
    );
  }

  private async write(send: () => Promise<ApiResponse<VehicleLayout>>, toggleId?: string) {
    const cache = this.currentCache();
    try {
      const response = await send();
      delete cache.list;
      cache.details.set(response.data._id, Promise.resolve(response));
      return response;
    } catch (error) {
      // A failed status response may follow a successful flip on the server.
      if (toggleId) {
        delete cache.list;
        cache.details.delete(toggleId);
      }
      throw error;
    }
  }
}
