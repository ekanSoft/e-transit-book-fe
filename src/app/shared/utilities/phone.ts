import { AbstractControl, ValidationErrors } from '@angular/forms';
export function normalizeNigerianPhone(value: string): string {
  const compact = value.trim().replace(/[\s()\-]/g, '');
  if (/^0\d{10}$/.test(compact)) return '+234' + compact.slice(1);
  if (/^234\d{10}$/.test(compact)) return '+' + compact;
  if (/^0[78]00\d{8,11}$/.test(compact)) return '+234' + compact.slice(1);
  if (/^234[78]00\d{8,11}$/.test(compact)) return '+' + compact;
  return compact;
}
export function nigerianPhone(control: AbstractControl<string>): ValidationErrors | null {
  return !control.value || /^\+234[789]\d{9}$/.test(normalizeNigerianPhone(control.value))
    ? null
    : { phone: true };
}

export function nigerianCustomerPhone(control: AbstractControl<string>): ValidationErrors | null {
  // Accept the complete Nigerian formats used for customer identity. The API validates allocations.
  return !control.value ||
    /^\+234(?:(?:20|9\d)\d{8}|[78]\d{9}|[78]00\d{8,11})$/.test(
      normalizeNigerianPhone(control.value),
    )
    ? null
    : { phone: true };
}
