import { NgOptimizedImage, TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, resource } from '@angular/core';
import { Session } from '../../core/auth/session';
import type { DocumentKey, EmployeeRole } from '../../core/http/api.models';
import { errorMessages } from '../../core/http/errors';
import { SettlementBankApi } from '../../core/http/settlement-bank-api';
import { Errors } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/icon';
import { WorkspaceData, addressLabel } from './workspace-data';

const settlementAccountViewRoles: readonly EmployeeRole[] = ['ADMIN'];

const documentLabels: Record<DocumentKey, string> = {
  certificateOfIncorporation: 'Certificate of incorporation',
  formCAC: 'CAC form',
  memorandumAndArticle: 'Memorandum and Articles of Association',
};
function publicUrl(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
@Component({
  selector: 'app-business-profile',
  imports: [Icon, Errors, TitleCasePipe, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './business-profile.html',
})
export class BusinessProfile {
  readonly session = inject(Session);
  private readonly api = inject(WorkspaceData);
  private readonly bankApi = inject(SettlementBankApi);
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
