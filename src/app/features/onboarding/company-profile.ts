import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Session } from '../../core/auth/session';
import { Business, BusinessType } from '../../core/http/api.models';
import { errorMessages } from '../../core/http/errors';
import { AddressFields, addressForm } from '../../shared/forms/address-fields';
import { savedAddressValue } from '../../shared/utilities/nigerian-address';
import { Field } from '../../shared/forms/field';
import { FileUpload } from '../../shared/forms/file-upload';
import { emailValidators, focusInvalid, requiredText } from '../../shared/forms/validators';
import { nigerianPhone } from '../../shared/utilities/phone';
import { Button } from '../../shared/ui/button';
import { Errors } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/icon';
import { OnboardingApi } from './data-access/onboarding-api';
@Component({
  selector: 'app-company-profile',
  imports: [ReactiveFormsModule, AddressFields, Field, FileUpload, Button, Errors, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel-heading">
      <div>
        <span class="eyebrow">STEP 01</span>
        <h2>Business Profile</h2>
        <p>Tell us about your business and how to reach you.</p>
      </div>
      <span class="panel-icon"><app-icon name="building" /></span>
    </div>
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
          <h3>Business details</h3>
          <div class="form-grid">
            <app-field
              class="full-width"
              id="company-name"
              label="Business name"
              [control]="form.controls.name"
              autocomplete="organization"
              [maxLength]="120"
            />
            <app-field
              id="company-email"
              label="Contact email"
              [control]="form.controls.email"
              type="email"
              autocomplete="email"
              [maxLength]="150"
            />
            <app-field
              id="company-phone"
              label="Contact phone"
              [control]="form.controls.contactPhoneNumber"
              type="tel"
              autocomplete="tel"
              placeholder="08012345678"
            />
            <app-field
              id="business-type"
              label="Business type"
              [control]="form.controls.businessType"
              [options]="businessTypes"
            />
            <app-field
              id="support-phone"
              label="Support phone"
              [control]="form.controls.supportContact"
              type="tel"
              [optional]="true"
              placeholder="08012345678"
            />
          </div>
          <div class="form-section">
            <h3>Business address</h3>
            <app-address-fields [group]="form.controls.address" prefix="company" />
          </div>
          <div class="form-section">
            <app-file-upload
              id="company-logo"
              label="Company logo (optional)"
              accept="image/*"
              hint="Image"
              [existing]="!!session.business()?.logo"
              [disabled]="busy()"
              (changed)="logo.set($event)"
              (validity)="fileValid.set($event)"
            />
          </div>
        </fieldset>
      </div>
      <div class="panel-footer">
        <span class="small muted">Your progress is saved after each step.</span
        ><button appButton type="submit" [disabled]="busy() || !fileValid()">
          {{ busy() ? 'Saving…' : 'Save and continue' }}<app-icon name="arrow" />
        </button>
      </div>
    </form>
  `,
})
export class CompanyProfile {
  readonly session = inject(Session);
  private readonly api = inject(OnboardingApi);
  private readonly fb = inject(NonNullableFormBuilder);
  readonly saved = output<Business>();
  readonly busy = signal(false);
  readonly errors = signal<string[]>([]);
  readonly logo = signal<File | null>(null);
  readonly fileValid = signal(true);
  readonly businessTypes = [
    { value: 'TRANSPORTATION', label: 'Transportation' },
    { value: 'CAR_HIRE', label: 'Car hire' },
  ];
  readonly form = this.fb.group({
    name: ['', requiredText(120)],
    email: ['', emailValidators],
    contactPhoneNumber: ['', [Validators.required, nigerianPhone]],
    businessType: this.fb.control<BusinessType>('TRANSPORTATION', Validators.required),
    supportContact: ['', nigerianPhone],
    address: addressForm(),
  });
  constructor() {
    const business = this.session.business();
    if (business)
      this.form.patchValue({
        ...business,
        address: savedAddressValue(business.address),
        supportContact: business.supportPhoneNumber ?? '',
      });
  }
  async submit(element: HTMLFormElement) {
    if (this.busy() || !this.fileValid()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      focusInvalid(element);
      return;
    }
    this.busy.set(true);
    this.errors.set([]);
    try {
      const response = await this.api.profile(this.form.getRawValue(), this.logo());
      this.saved.emit(response.data);
    } catch (error) {
      this.errors.set(errorMessages(error));
    } finally {
      this.busy.set(false);
    }
  }
}
