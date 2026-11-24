import { FormControl } from '@angular/forms';
import { nigerianCustomerPhone, nigerianPhone, normalizeNigerianPhone } from './phone';
describe('Nigerian phone handling', () => {
  for (const phone of [
    '08012345678',
    '2348012345678',
    '+2348012345678',
    '0801 234 5678',
    '+234 (801) 234-5678',
  ])
    it(`normalizes ${phone}`, () => expect(normalizeNigerianPhone(phone)).toBe('+2348012345678'));
  it('does not silently rewrite foreign numbers', () => {
    expect(normalizeNigerianPhone('+12025550100')).toBe('+12025550100');
    expect(nigerianPhone(new FormControl('+12025550100', { nonNullable: true }))).toEqual({
      phone: true,
    });
  });
  it('allows blank optional phone fields', () =>
    expect(nigerianPhone(new FormControl('', { nonNullable: true }))).toBeNull());
  it('supports Nigerian landlines in customer records', () => {
    const phone = new FormControl('02012223456', { nonNullable: true });
    expect(normalizeNigerianPhone(phone.value)).toBe('+2342012223456');
    expect(nigerianCustomerPhone(phone)).toBeNull();
  });
});
