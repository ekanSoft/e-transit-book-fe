import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PublicStore } from './public-store';
import { ConfirmedTicket } from './confirmed-ticket';
import type { Receipt } from './receipt';
import { Attempts } from './attempts';
import { showWat } from '../trips/trip-format';
export interface Verification {
  status: 'LOCKED' | 'EXPIRED' | 'CANCELLED' | 'CONFIRMED' | 'CHECKED_IN';
  paymentReview: boolean;
  ticket?: string;
  receipt?: Receipt | null;
  holdExpiresAt?: string;
}
@Component({
  imports: [RouterLink, ConfirmedTicket],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './payment-return.html',
  styles: `
    .reference {
      overflow-wrap: anywhere;
    }
    .checking {
      height: 4px;
      background: #cbe7d8;
      overflow: hidden;
    }
    .checking::after {
      content: '';
      display: block;
      width: 36%;
      height: 100%;
      background: #176a50;
      animation: check 1.3s ease-in-out infinite alternate;
    }
    @keyframes check {
      to {
        transform: translateX(175%);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .checking::after {
        animation: none;
      }
    }
  `,
})
export class PaymentReturn {
  readonly store = inject(PublicStore);
  private readonly attempts = inject(Attempts);
  readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly life = inject(DestroyRef);
  readonly reference = signal('');
  readonly result = signal<Verification | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly showWat = showWat;
  private request = 0;
  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.request++;
      this.busy.set(false);
      this.result.set(null);
      const saved = this.attempts.get(this.store.slug());
      const ref = params.get('reference') || params.get('trxref') || saved?.reference || '';
      this.reference.set(ref);
      if (saved && ref === saved.reference)
        this.attempts.set(this.store.slug(), { ...saved, returned: true });
      void this.verify();
    });
  }
  async verify() {
    const ref = this.reference();
    if (!ref) {
      this.error.set(
        'Your payment reference is missing. Open the return link again or contact the operator.',
      );
      return;
    }
    if (ref === '.' || ref === '..' || ref.length > 200 || !/^[a-zA-Z0-9_-]+$/.test(ref)) {
      this.error.set('Check the payment reference in your return link or contact the operator.');
      return;
    }
    if (this.busy()) return;
    const request = ++this.request;
    this.busy.set(true);
    this.error.set('');
    try {
      const { data } = await this.store.api.post<Verification>(
        this.store.path + '/checkout/' + encodeURIComponent(ref) + '/verify',
        {},
      );
      if (request !== this.request || this.life.destroyed) return;
      this.result.set(data);
    } catch {
      if (request === this.request)
        this.error.set(
          'Payment status is unavailable. Check this reference again or contact the operator.',
        );
    } finally {
      if (request === this.request) this.busy.set(false);
    }
  }
  another() {
    const slug = this.store.slug();
    if (this.attempts.get(slug)?.reference === this.reference()) this.attempts.set(slug, null);
    void this.router.navigate(['/public', slug]);
  }
}
