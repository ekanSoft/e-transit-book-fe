import type { Address } from '../../core/http/api.models';
import states from './nigeria-states.json';

export type AddressFormValue = Pick<Address, 'street' | 'city' | 'stateCode'>;

export const stateOptions = states.map(({ code, name }) => ({
  value: code,
  label: code === 'FC' ? name + ' (FCT)' : name,
}));

export function savedAddressValue(address?: Partial<Address>): AddressFormValue {
  const street = address?.street ?? '';
  const city = address?.city ?? '';
  const country = address?.country?.trim().toLowerCase();
  const countryCode = address?.countryCode?.trim().toUpperCase();
  if ((country && country !== 'nigeria') || (countryCode && countryCode !== 'NG')) {
    return { street, city, stateCode: '' };
  }
  const code = address?.stateCode?.trim().toUpperCase().replace(/^NG-/, '');
  const name = address?.state
    ?.trim()
    .toLowerCase()
    .replace(/\s+state$/, '');
  const byCode = states.find((state) => state.code === code);
  const byName = states.find((state) =>
    [state.name, ...(state.aliases ?? [])].some((alias) => alias.toLowerCase() === name),
  );
  // Both fields used to be free text. Conflicting matches need a fresh selection.
  const selected = byName && byCode && byName !== byCode ? undefined : (byName ?? byCode);
  return { street, city, stateCode: selected?.code ?? '' };
}

export function addressPayload(value: AddressFormValue): Omit<Address, 'country' | 'countryCode'> {
  const state = states.find((item) => item.code === value.stateCode);
  if (!state) throw new Error('Select your State.');
  return {
    street: value.street.trim(),
    city: value.city.trim(),
    state: state.name,
    stateCode: state.code,
  };
}
