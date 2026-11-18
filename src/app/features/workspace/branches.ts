import { ChangeDetectionStrategy, Component, inject, resource, signal } from '@angular/core';
import { Session } from '../../core/auth/session';
import { errorMessages } from '../../core/http/errors';
import { Icon } from '../../shared/ui/icon';
import { Errors } from '../../shared/ui/feedback';
import { WorkspaceData, addressLabel } from './workspace-data';

@Component({
  selector: 'app-branches',
  imports: [Icon, Errors],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './branches.html',
})
export class Branches {
  readonly session = inject(Session);
  private readonly api = inject(WorkspaceData);
  readonly address = addressLabel;
  readonly errors = errorMessages;
  readonly query = signal({ page: 1, search: '' });
  readonly list = resource({
    params: () =>
      this.session.business() ? { ...this.query(), id: this.session.business()!._id } : undefined,
    loader: async ({ params }) => (await this.api.branches(params.page, params.search)).data,
  });
  search(value: string) {
    this.query.set({ page: 1, search: value.trim() });
  }
  go(page: number) {
    this.query.update((q) => ({ ...q, page }));
  }
}
