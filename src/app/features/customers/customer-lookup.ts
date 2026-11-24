import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  inject,
  Injector,
  input,
  output,
  resource,
  signal,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { WorkspaceAccess } from '../../core/auth/workspace-access';
import { errorMessages } from '../../core/http/errors';
import { Field } from '../../shared/forms/field';
import { Button } from '../../shared/ui/button';
import { Errors } from '../../shared/ui/feedback';
import { nigerianCustomerPhone, normalizeNigerianPhone } from '../../shared/utilities/phone';
import { contactName, CustomerApi, type Customer } from './customer-api';
import { CustomerForm } from './customer-form';

@Component({
  selector: 'app-customer-lookup',
  imports: [Button, CustomerForm, Errors, Field],
  templateUrl: './customer-lookup.html',
  styleUrl: './customer-lookup.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerLookup {
  readonly access = inject(WorkspaceAccess);
  private readonly api = inject(CustomerApi);
  private readonly injector = inject(Injector);
  readonly phone = input.required<FormControl<string>>();
  readonly selected = input<Customer | null>(null);
  readonly selectedChange = output<Customer>();
  readonly open = signal<HTMLElement | undefined>(undefined);
  readonly raced = signal(false);
  readonly errors = errorMessages;
  readonly name = contactName;
  readonly formatPhone = normalizeNigerianPhone;
  private readonly request = signal('');
  readonly match = resource({
    params: () => {
      const scope = this.access.scope();
      const phone = this.request();
      return scope && this.access.canViewBookings() && phone ? { scope, phone } : undefined;
    },
    loader: ({ params }) => this.api.byPhone(params.phone),
  });

  lookup() {
    const control = this.phone();
    control.markAsTouched();
    if (!control.value.trim() || nigerianCustomerPhone(control)) return;
    const number = normalizeNigerianPhone(control.value);
    if (this.request() === number) this.match.reload();
    else this.request.set(number);
  }

  changed() {
    if (normalizeNigerianPhone(this.phone().value) === this.request()) return;
    this.request.set('');
    this.raced.set(false);
  }

  duplicate(number: string) {
    this.open.set(undefined);
    this.phone().setValue(number);
    this.raced.set(true);
    this.lookup();
  }

  choose(customer: Customer, focus: HTMLElement) {
    this.open.set(undefined);
    this.raced.set(false);
    this.phone().setValue(normalizeNigerianPhone(customer.phoneNumber));
    this.request.set('');
    this.selectedChange.emit(customer);
    afterNextRender({ write: () => focus.focus() }, { injector: this.injector });
  }
}
