import { addressPayload, savedAddressValue, stateOptions } from './nigerian-address';

describe('Nigerian address selection', () => {
  it('offers 37 distinct codes in alphabetical display order', () => {
    expect(new Set(stateOptions.map((item) => item.value)).size).toBe(37);
    const names = stateOptions.map((item) => item.label);
    expect(names).toEqual([...names].sort());
    expect(names).toContain('Federal Capital Territory (FCT)');
  });

  it.each([
    [{ state: ' lagos State ', stateCode: 'LG' }, 'LA'],
    [{ state: 'FCT' }, 'FC'],
    [{ stateCode: 'ng-ed' }, 'ED'],
    [{ state: 'Lagos', stateCode: 'ED' }, ''],
    [{ state: 'Unrecognized' }, ''],
    [{ state: 'Lagos', countryCode: 'GH' }, ''],
  ] as const)('matches saved addresses only when the state is clear', (saved, expected) => {
    expect(savedAddressValue(saved).stateCode).toBe(expected);
  });

  it('requires a valid selection before creating a request', () => {
    expect(() =>
      addressPayload({ street: '12 Allen Avenue', city: 'Ikeja', stateCode: '' }),
    ).toThrow();
  });
});
