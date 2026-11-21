import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  output,
  resource,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Session } from '../../core/auth/session';
import { WorkspaceData } from '../workspace/workspace-data';
import { Business } from '../../core/http/api.models';
import { errorMessages } from '../../core/http/errors';
import { AddressFields, addressForm } from '../../shared/forms/address-fields';
import { savedAddressValue } from '../../shared/utilities/nigerian-address';
import { Field } from '../../shared/forms/field';
import { focusInvalid, requiredText } from '../../shared/forms/validators';
import { nigerianPhone } from '../../shared/utilities/phone';
import { Button } from '../../shared/ui/button';
import { Errors } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/icon';
import { OnboardingApi } from './data-access/onboarding-api';
@Component({
  selector: 'app-primary-branch',
  imports: [ReactiveFormsModule, AddressFields, Field, Button, Errors, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel-heading">
      <div>
        <span class="eyebrow">STEP 02</span>
        <h2>Primary Terminal</h2>
        <p>Enter the main park where passengers board for most of your trips. You can add other terminals later.</p>
      </div>
      <span class="panel-icon"><app-icon name="pin" /></span>
    </div>
    @if (primary.error()) {
      <app-errors [messages]="errorMessages(primary.error())" /><button
        class="text-button inset"
        (click)="primary.reload()"
      >
        Try loading the terminal again
      </button>
    } @else if (primary.isLoading()) {
      <p role="status" class="loading">Loading terminal details…</p>
    } @else if (locked()) {
      <div class="alert">
        Sign in with the account assigned to this terminal to update its details.
      </div>
    } @else {
      <form
        #formElement
        [formGroup]="form"
        (ngSubmit)="submit(formElement)"
        novalidate
        [attr.aria-busy]="busy()"
      >
        <div class="panel-body">
          <app-errors [messages]="errors()" />
          <fieldset [disabled]="busy()">
            <div class="form-grid">
              <app-field
                [id]="'branch-name'"
                label="Terminal name"
                [control]="form.controls.name"
                placeholder="e.g. Jibowu Terminal"
                [maxLength]="120"
              /><app-field
                [id]="'branch-phone'"
                label="Phone number"
                [control]="form.controls.phoneNumber"
                type="tel"
                autocomplete="tel"
                placeholder="08012345678"
              />
            </div>
            <div class="form-section">
              <h3>Terminal address</h3>
              <app-address-fields [group]="form.controls.address" prefix="branch">
                <div>
                  <label style="font-weight: 700">Country</label>
                  Nigeria
                </div>
              </app-address-fields>
            </div>
          </fieldset>
        </div>
        <div class="panel-footer">
          <span class="small muted">Saved to this business.</span
          ><button appButton type="submit" [disabled]="busy()">
            {{ busy() ? 'Saving…' : 'Save and continue' }}<app-icon name="arrow" />
          </button>
        </div>
      </form>
    }
  `,
})
export class PrimaryBranch {
  private readonly api = inject(OnboardingApi);
  private readonly session = inject(Session);
  private readonly directory = inject(WorkspaceData);
  readonly errorMessages = errorMessages;
  readonly primary = resource({
    params: () => this.session.business()?._id,
    loader: ({ abortSignal }) => this.directory.primaryBranch(abortSignal),
  });
  readonly locked = computed(() => {
    if (!this.primary.hasValue()) return false;
    const assigned = this.session.employee()?.branch;
    const primary = this.primary.value();
    return primary
      ? assigned !== primary._id
      : !!assigned || !!this.session.business()?.registrationStage?.includes('BRANCH');
  });
  readonly saved = output<Business>();
  readonly busy = signal(false);
  readonly errors = signal<string[]>([]);
  readonly form = inject(NonNullableFormBuilder).group({
    name: ['', requiredText(120)],
    phoneNumber: ['', [Validators.required, nigerianPhone]],
    address: addressForm(),
  });
  constructor() {
    effect(() => {
      if (this.primary.hasValue()) {
        const b = this.primary.value();
        if (b)
          this.form.patchValue({
            name: b.name,
            phoneNumber: b.phoneNumber ?? '',
            address: savedAddressValue(b.address),
          });
      }
    });
  }
  async submit(element: HTMLFormElement) {
    if (this.busy() || !this.primary.hasValue() || this.locked()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      focusInvalid(element);
      return;
    }
    this.busy.set(true);
    this.errors.set([]);
    try {
      const response = await this.api.branch(this.form.getRawValue());
      this.saved.emit(response.data);
    } catch (error) {
      this.errors.set(errorMessages(error));
    } finally {
      this.busy.set(false);
    }
  }
}
