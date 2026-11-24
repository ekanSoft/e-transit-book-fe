import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  resource,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { WorkspaceAccess } from '../../core/auth/workspace-access';
import { errorMessages } from '../../core/http/errors';
import { Button } from '../../shared/ui/button';
import { DirectoryPager, DirectorySearch } from '../../shared/ui/directory-controls';
import { Errors, Notifications } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/icon';
import { normalizeNigerianPhone } from '../../shared/utilities/phone';
import { contactName, CustomerApi } from './customer-api';
import { CustomerForm } from './customer-form';

@Component({
  selector: 'app-customer-directory',
  imports: [Button, CustomerForm, DirectoryPager, DirectorySearch, Errors, Icon, RouterLink],
  templateUrl: './customer-directory.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerDirectory {
  readonly access = inject(WorkspaceAccess);
  private readonly api = inject(CustomerApi);
  private readonly notifications = inject(Notifications);
  readonly query = signal({ page: 1, limit: 12, search: '' });
  readonly add = signal<HTMLElement | undefined>(undefined);
  readonly errors = errorMessages;
  readonly name = contactName;
  readonly phone = normalizeNigerianPhone;
  readonly customers = resource({
    params: () =>
      this.access.canViewBookings()
        ? { scope: this.access.scope(), query: this.query() }
        : undefined,
    loader: ({ params }) => this.api.list(params.query),
  });

  constructor() {
    effect(() => {
      if (!this.customers.hasValue() || this.customers.isLoading()) return;
      const { currentPage, totalPages } = this.customers.value();
      if (currentPage > totalPages) this.go(totalPages);
    });
  }

  search(search: string) {
    if (search !== this.query().search)
      this.query.update((query) => ({ ...query, page: 1, search }));
  }

  go(page: number) {
    this.query.update((query) => ({ ...query, page }));
  }

  saved() {
    this.add.set(undefined);
    this.notifications.show('Customer added.');
    this.customers.reload();
  }
}
