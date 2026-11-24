import { FormControl, FormGroup, Validators, ValidatorFn } from '@angular/forms';
import { nigerianCustomerPhone, normalizeNigerianPhone } from '../../shared/utilities/phone';
const required = [Validators.required, Validators.pattern(/\S/)];
function field(validators: ValidatorFn[]) {
  return new FormControl('', { nonNullable: true, validators });
}
function person(kin: boolean) {
  return new FormGroup({
    firstName: field([...required, Validators.maxLength(100)]),
    lastName: field([...required, Validators.maxLength(100)]),
    phoneNumber: field([Validators.required, nigerianCustomerPhone]),
    email: field([
      ...(kin ? [] : [Validators.required]),
      Validators.email,
      Validators.maxLength(150),
    ]),
  });
}
export function passengerForm() {
  return new FormGroup({
    passenger: person(false),
    nextOfKin: person(true),
    bloodgroup: field([]),
  });
}
export function passengerPayload(form: ReturnType<typeof passengerForm>) {
  const raw = form.getRawValue();
  function names(p: typeof raw.passenger) {
    return {
      firstName: p.firstName.trim(),
      lastName: p.lastName.trim(),
      phoneNumber: normalizeNigerianPhone(p.phoneNumber),
    };
  }
  return {
    passenger: { ...names(raw.passenger), email: raw.passenger.email.trim() },
    nextOfKin: {
      ...names(raw.nextOfKin),
      ...(raw.nextOfKin.email.trim() && { email: raw.nextOfKin.email.trim() }),
    },
    ...(raw.bloodgroup.trim() && { bloodgroup: raw.bloodgroup.trim() }),
  };
}
