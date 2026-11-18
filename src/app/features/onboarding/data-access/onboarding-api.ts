import { inject, Injectable } from '@angular/core';
import { Api } from '../../../core/http/api';
import { Address, Business, BusinessType, DocumentKey } from '../../../core/http/api.models';
import { normalizeNigerianPhone } from '../../../shared/utilities/phone';
export interface ProfileRequest {
  name: string;
  email: string;
  contactPhoneNumber: string;
  supportContact: string;
  businessType: BusinessType;
  address: Address;
}
export function profileFormData(value: ProfileRequest, logo: File | null): FormData {
  const body = new FormData();
  body.set('name', value.name.trim());
  body.set('email', value.email.trim().toLowerCase());
  body.set('contactPhoneNumber', normalizeNigerianPhone(value.contactPhoneNumber));
  body.set('businessType', value.businessType);
  body.set('address', JSON.stringify(normalizeAddress(value.address)));
  if (value.supportContact.trim())
    body.set('supportContact', normalizeNigerianPhone(value.supportContact));
  if (logo) body.set('logo', logo);
  return body;
}
export function normalizeAddress(value: Address): Address {
  return {
    street: value.street.trim(),
    city: value.city.trim(),
    state: value.state.trim(),
    stateCode: value.stateCode.trim().toUpperCase(),
    country: value.country.trim(),
    countryCode: value.countryCode.trim().toUpperCase(),
  };
}
export function verificationFormData(
  rcNumber: string,
  files: Partial<Record<DocumentKey, File>>,
): FormData {
  const body = new FormData();
  if (rcNumber.trim()) body.set('rcNumber', rcNumber.trim());
  for (const [key, file] of Object.entries(files)) if (file) body.set(key, file);
  return body;
}
@Injectable({ providedIn: 'root' })
export class OnboardingApi {
  private readonly api = inject(Api);
  profile(value: ProfileRequest, logo: File | null) {
    return this.api.patch<Business>('/business/profile', profileFormData(value, logo));
  }
  verification(rcNumber: string, files: Partial<Record<DocumentKey, File>>) {
    return this.api.patch<Business>(
      '/business/verification',
      verificationFormData(rcNumber, files),
    );
  }
  branch(value: { name: string; phoneNumber: string; address: Address }) {
    return this.api.patch<Business>('/business/branch', {
      name: value.name.trim(),
      phoneNumber: normalizeNigerianPhone(value.phoneNumber),
      address: normalizeAddress(value.address),
    });
  }
}
