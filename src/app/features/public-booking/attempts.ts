import { Injectable, signal } from '@angular/core';
export interface Fees {
  fareKobo: number;
  platformFeeKobo: number;
  processingFeeKobo: number;
  totalKobo: number;
}
export interface Quote {
  authorizationUrl: string;
  reference: string;
  holdExpiresAt: string;
  currency: 'NGN';
  fees: Fees;
}
export interface Attempt extends Quote {
  journey: string;
  departureTime: string;
  seatNumber: string;
  trip: string;
  returned?: boolean;
}
const money = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
});
export function amount(kobo: number) {
  return money.format(kobo / 100);
}
export function holdActive(attempt: Attempt | null | undefined, at = Date.now()) {
  return Boolean(
    attempt &&
    Number.isFinite(Date.parse(attempt.holdExpiresAt)) &&
    Date.parse(attempt.holdExpiresAt) > at,
  );
}
export function securePaymentUrl(value: string) {
  try {
    const u = new URL(value);
    return u.origin === 'https://checkout.paystack.com' &&
      !u.username &&
      !u.password &&
      u.pathname.length > 1
      ? u.href
      : null;
  } catch {
    return null;
  }
}
@Injectable({ providedIn: 'root' })
export class Attempts {
  private readonly cache = signal<ReadonlyMap<string, Attempt | null>>(new Map());
  readonly initializing = signal<ReadonlySet<string>>(new Set());
  get(slug: string): Attempt | null {
    const cached = this.cache();
    if (cached.has(slug)) return cached.get(slug) ?? null;
    try {
      const a = JSON.parse(
        sessionStorage.getItem('etb.public.' + slug) ?? 'null',
      ) as Attempt | null;
      return a?.reference &&
        a.fees &&
        a.currency === 'NGN' &&
        Number.isFinite(Date.parse(a.holdExpiresAt))
        ? a
        : null;
    } catch {
      return null;
    }
  }
  set(slug: string, a: Attempt | null) {
    this.cache.update((m) => new Map(m).set(slug, a));
    try {
      if (a) sessionStorage.setItem('etb.public.' + slug, JSON.stringify(a));
      else sessionStorage.removeItem('etb.public.' + slug);
    } catch {
      // Checkout can still use the in-memory quote when browser storage is unavailable.
    }
  }
  start(slug: string) {
    if (this.initializing().has(slug) || holdActive(this.get(slug))) return false;
    this.initializing.update((s) => new Set(s).add(slug));
    return true;
  }
  finish(slug: string) {
    this.initializing.update((s) => {
      const next = new Set(s);
      next.delete(slug);
      return next;
    });
  }
}
