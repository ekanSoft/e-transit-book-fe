import { inject, Injectable, signal } from '@angular/core';
import { normalizeNigerianPhone } from '../../shared/utilities/phone';
import { passengerForm } from './passenger-form';
import { Api } from '../../core/http/api';
import type { RouteTerminal } from '../workspace/workspace-data';
export interface PublicRoute {
  _id: string;
  originBranch: RouteTerminal | null;
  destinationBranch: RouteTerminal | null;
}
export interface Profile {
  organization: { name: string; slug: string; logo?: string; contactPhoneNumber?: string };
  routes: PublicRoute[];
}
export function terminalPlace(branch: RouteTerminal | null) {
  return [branch?.address?.state, branch?.address?.city].filter(Boolean).join(', ');
}
export function terminal(branch: RouteTerminal | null) {
  return [branch?.address?.state, branch?.address?.city, branch?.name].filter(Boolean).join(', ');
}
export function journey(route: PublicRoute) {
  return terminal(route.originBranch) + ' → ' + terminal(route.destinationBranch);
}
@Injectable()
export class PublicStore {
  readonly draft = passengerForm();
  readonly api = inject(Api);
  readonly slug = signal('');
  readonly profile = signal<Profile | null>(null);
  readonly error = signal(false);
  get path() {
    return '/public/operators/' + encodeURIComponent(this.slug());
  }
  async open(requestedSlug: string) {
    const slug = requestedSlug.trim().toLowerCase();
    if (this.slug() !== slug) this.draft.reset();
    this.slug.set(slug);
    this.profile.set(null);
    this.error.set(false);
    if (!/^[a-z0-9][a-z0-9-]{0,119}$/i.test(slug)) {
      this.error.set(true);
      return;
    }
    try {
      const { data } = await this.api.get<Profile>(this.path + '/routes');
      if (this.slug() === slug)
        this.profile.set({
          ...data,
          organization: {
            ...data.organization,
            contactPhoneNumber: normalizeNigerianPhone(data.organization.contactPhoneNumber ?? ''),
          },
          routes: data.routes.filter(
            (r) =>
              r.originBranch?._id &&
              r.originBranch.name &&
              r.destinationBranch?._id &&
              r.destinationBranch.name,
          ),
        });
    } catch {
      if (this.slug() === slug) this.error.set(true);
    }
  }
}
