import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/http/api';
import { Session } from '../../core/auth/session';
import { errorMessages } from '../../core/http/errors';
import { Button } from '../../shared/ui/button';
import { Icon } from '../../shared/ui/icon';
import { Errors } from '../../shared/ui/feedback';
import {
  canReadReports,
  DashboardReport,
  Departure,
  Page,
  PaymentMethod,
  period,
  SalesReport,
} from './workspace-data';

@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, RouterLink, Icon, Button, Errors],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  readonly session = inject(Session);
  private readonly api = inject(Api);
  readonly days = signal(7);
  readonly cycle = signal(0);
  readonly dates = computed(() => {
    this.cycle();
    return period(this.days());
  });
  readonly reportsAllowed = computed(() => canReadReports(this.session.employee()?.role));
  private readonly query = computed(() => {
    if (!this.session.business() || !this.reportsAllowed()) return undefined;
    return {
      business: this.session.business()!._id,
      token: this.session.token(),
      query: new URLSearchParams(this.dates()).toString(),
      cycle: this.cycle(),
    };
  });
  readonly report = resource({
    params: this.query,
    loader: async ({ params }) =>
      (await this.api.get<DashboardReport>('/reports/dashboard?' + params.query)).data,
  });
  readonly sales = resource({
    params: () =>
      this.report.hasValue() && this.report.value().revenue > 0 ? this.query() : undefined,
    loader: async ({ params }) =>
      (await this.api.get<SalesReport>('/reports/sales?' + params.query)).data,
  });
  readonly schedule = resource({
    params: () =>
      this.session.business() && !this.reportsAllowed()
        ? { token: this.session.token(), cycle: this.cycle(), today: period(1).to }
        : undefined,
    loader: async ({ params }) =>
      (
        await this.api.get<Page<Departure & { status: string }>>(
          '/trips?limit=10&departureDate=' + params.today,
        )
      ).data,
  });
  readonly methods: { key: PaymentMethod; label: string }[] = [
    { key: 'CASH', label: 'Cash' },
    { key: 'TRANSFER', label: 'Bank transfer' },
    { key: 'POS', label: 'POS' },
  ];
  readonly errors = errorMessages;
  readonly maxSale = computed(() =>
    Math.max(
      0,
      ...(this.sales.hasValue() ? this.sales.value().rows.map((row) => row.revenue) : []),
    ),
  );
  readonly scope = computed(() =>
    ['BRANCH_MANAGER', 'ACCOUNTANT'].includes(this.session.employee()?.role ?? '')
      ? 'Assigned branch'
      : 'Business operations',
  );
  refresh() {
    this.cycle.update((n) => n + 1);
  }
}
