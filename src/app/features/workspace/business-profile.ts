import { NgOptimizedImage, TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, resource } from '@angular/core';
import { Session } from '../../core/auth/session';
import { DocumentKey } from '../../core/http/api.models';
import { errorMessages } from '../../core/http/errors';
import { Errors } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/icon';
import { WorkspaceData, addressLabel } from './workspace-data';

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
  readonly address = addressLabel;
  readonly errors = errorMessages;
  readonly logo = computed(() => publicUrl(this.session.business()?.logo));
  readonly showVerification = computed(() =>
    ['ADMIN', 'OPERATIONS_MANAGER'].includes(this.session.employee()?.role ?? ''),
  );
  readonly documents = computed(() =>
    Object.entries(documentLabels).map(([key, label]) => {
      const value = this.session.business()?.documents?.[key as DocumentKey];
      return { key, label, submitted: !!value, url: publicUrl(value) };
    }),
  );
  readonly branch = resource({
    params: () => this.session.business()?._id,
    loader: ({ abortSignal }) => this.api.primaryBranch(abortSignal),
  });
}
