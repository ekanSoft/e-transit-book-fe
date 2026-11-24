import { NgOptimizedImage, TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { environment } from '../../../environments/environment';
import { Session } from '../../core/auth/session';
import type { DocumentKey, EmployeeRole } from '../../core/http/api.models';
import { errorMessages } from '../../core/http/errors';
import { SettlementBankApi } from '../../core/http/settlement-bank-api';
import { Errors } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/icon';
import { publicUrl } from '../../shared/utilities/public-url';
import { WorkspaceData, addressLabel } from './workspace-data';

const settlementAccountViewRoles: readonly EmployeeRole[] = ['ADMIN'];

const documentLabels: Record<DocumentKey, string> = {
  certificateOfIncorporation: 'Certificate of incorporation',
  formCAC: 'CAC form',
  memorandumAndArticle: 'Memorandum and Articles of Association',
};
@Component({
  selector: 'app-business-profile',
  imports: [Icon, Errors, TitleCasePipe, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './business-profile.html',
  styles: `
    .share {
      margin-inline-start: auto;
      max-width: 100%;
    }
    .share-actions {
      display: inline-flex;
      align-items: stretch;
      padding: 0;
      gap: 0;
    }
    .share-actions a,
    .share-actions button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      min-height: 38px;
      padding-inline: 0.7rem;
      color: inherit;
      font: inherit;
      background: transparent;
      text-decoration: none;
      cursor: pointer;
    }
    .share-actions button {
      border: 0;
      border-inline-start: 1px solid var(--color-line);
    }
    .share-actions :is(a, button):hover {
      background: var(--raised);
      text-decoration: none;
    }
    .share label {
      display: block;
      margin-top: 0.5rem;
    }
  `,
})
export class BusinessProfile {
  readonly session = inject(Session);
  private readonly api = inject(WorkspaceData);
  private readonly bankApi = inject(SettlementBankApi);
  private readonly document = inject(DOCUMENT);
  readonly bookingLink = computed(() => {
    const slug = this.session.business()?.slug;
    if (!slug) return null;
    const origin = this.document.location;
    const publicOrigin = environment.publicBookingOrigin || origin?.origin;
    return publicOrigin ? new URL('/public/' + encodeURIComponent(slug), publicOrigin).href : null;
  });
  readonly copyResult = signal<{ url: string; copied: boolean } | null>(null);
  async copyLink(url: string) {
    try {
      await this.document.defaultView!.navigator.clipboard.writeText(url);
      this.copyResult.set({ url, copied: true });
    } catch {
      this.copyResult.set({ url, copied: false });
    }
  }
  readonly address = addressLabel;
  readonly errors = errorMessages;
  readonly logo = computed(() => publicUrl(this.session.business()?.logo));
  readonly showVerification = computed(() =>
    ['ADMIN', 'OPERATIONS_MANAGER'].includes(this.session.employee()?.role ?? ''),
  );
  protected readonly showSettlementAccount = computed(() => {
    const role = this.session.employee()?.role;
    return role !== undefined && settlementAccountViewRoles.includes(role);
  });
  protected readonly settlementAccount = resource({
    params: () => (this.showSettlementAccount() ? this.session.business()?._id : undefined),
    loader: () => this.bankApi.savedDetails(),
  });
  readonly documents = computed(() =>
    Object.entries(documentLabels).map(([key, label]) => {
      const value = this.session.business()?.documents?.[key as DocumentKey];
      return { key, label, submitted: !!value, url: publicUrl(value) };
    }),
  );
  readonly branch = resource({
    params: () => this.session.business()?._id,
    loader: () => this.api.primaryBranch(),
  });
}
