import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Field } from '../../shared/forms/field';
import { showWat, fareLabel } from '../trips/trip-format';
import { PublicStore, journey } from './public-store';
import { passengerPayload } from './passenger-form';
import { Attempts, holdActive, Quote, securePaymentUrl } from './attempts';
import { applyServerValidation } from '../../shared/forms/server-validation';
import { FeeLines } from './fee-lines';
import type { PublicTrip, Seat } from './trip';
@Component({
  imports: [Field, RouterLink, FeeLines],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './checkout.html',
})
export class Checkout {
  readonly store = inject(PublicStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly attempts = inject(Attempts);
  private readonly life = inject(DestroyRef);
  readonly form = this.store.draft;
  readonly parties = [
    { label: 'Passenger', id: 'passenger', group: this.form.controls.passenger },
    { label: 'Next of kin', id: 'kin', group: this.form.controls.nextOfKin },
  ];
  readonly trip = signal<PublicTrip | null>(null);
  readonly seat = signal<Seat | null>(null);
  readonly error = signal('');
  readonly busy = computed(() => this.attempts.initializing().has(this.store.slug()));
  readonly attempt = computed(() => this.attempts.get(this.store.slug()));
  readonly now = signal(Date.now());
  readonly holdActive = computed(() => holdActive(this.attempt(), this.now()));
  readonly remaining = computed(() =>
    Math.max(0, Math.ceil((Date.parse(this.attempt()?.holdExpiresAt ?? '') - this.now()) / 1000)),
  );
  readonly deadline = computed(() => {
    const n = this.remaining();
    return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0');
  });
  readonly journey = journey;
  readonly showWat = showWat;
  readonly fare = fareLabel;
  readonly safeUrl = securePaymentUrl;
  private generation = 0;
  private expirySynced = false;
  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    this.life.onDestroy(() => clearInterval(timer));
    effect(() => {
      const attempt = this.attempt();
      if (!attempt || this.holdActive()) {
        this.expirySynced = false;
        return;
      }
      if (this.expirySynced) return;
      this.expirySynced = true;
      untracked(() => void this.syncExpiredHold(attempt.reference));
    });
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(() => {
      this.generation++;
      this.trip.set(null);
      this.seat.set(null);
      if (!this.attempt()) void this.refresh();
    });
  }
  private chooseAgain(id: string) {
    return this.router.navigate(['/public', this.store.slug(), 'trips', id], {
      queryParams: { refresh: 1 },
      replaceUrl: true,
    });
  }
  private async syncExpiredHold(reference: string) {
    try {
      await this.store.api.post(
        this.store.path + '/checkout/' + encodeURIComponent(reference) + '/verify',
        {},
      );
    } catch {
      /* Release state when possible; the seat map still keys off hold expiry time. */
    }
  }
  discardAttempt() {
    const slug = this.store.slug();
    const trip = this.attempt()?.trip;
    this.attempts.set(slug, null);
    void this.router.navigate(trip ? ['/public', slug, 'trips', trip] : ['/public', slug], {
      queryParams: trip ? { refresh: 1 } : undefined,
    });
  }
  async refresh() {
    const id = this.route.snapshot.queryParamMap.get('trip'),
      number = this.route.snapshot.queryParamMap.get('seat');
    const gen = this.generation;
    if (!id || !number) {
      this.error.set('Choose a departure and seat to begin.');
      return false;
    }
    try {
      const { data } = await this.store.api.get<PublicTrip>(
        this.store.path + '/trips/' + encodeURIComponent(id),
      );
      if (gen !== this.generation || this.life.destroyed) return false;
      const seat = data.seats.find((s) => s.seatNumber === number && s.available);
      if (!seat) {
        await this.chooseAgain(id);
        return false;
      }
      const old = this.seat();
      this.trip.set(data);
      this.seat.set(seat);
      if (old && old.fare !== seat.fare) {
        this.error.set('Your seat fare changed. Review the new fare before continuing.');
        return false;
      }
      return true;
    } catch {
      if (!this.life.destroyed)
        this.error.set(
          'Could not check this departure. Refresh availability or choose another trip.',
        );
      return false;
    }
  }
  async submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error.set('Check the highlighted passenger details.');
      document
        .querySelector<HTMLElement>('app-checkout [aria-invalid=true],main input.ng-invalid')
        ?.focus();
      return;
    }
    const slug = this.store.slug();
    if (!this.attempts.start(slug)) return;
    this.error.set('');
    try {
      if (!(await this.refresh())) return;
      const t = this.trip()!,
        s = this.seat()!;
      const { data } = await this.store.api.post<Quote>(this.store.path + '/checkout', {
        trip: t._id,
        seatNumber: s.seatNumber,
        ...passengerPayload(this.form),
      });
      this.attempts.set(slug, {
        ...data,
        trip: t._id,
        journey: journey(t.route),
        departureTime: t.departureTime,
        seatNumber: s.seatNumber,
      });
      if (this.store.slug() === slug) this.form.reset();
    } catch (e) {
      if (this.life.destroyed) return;
      if (e instanceof HttpErrorResponse && e.status === 409 && this.trip()) {
        await this.chooseAgain(this.trip()!._id);
      } else if (e instanceof HttpErrorResponse && e.status === 400) {
        const controls = Object.fromEntries(
          this.parties.flatMap((p) =>
            Object.entries(p.group.controls).map(([key, c]) => [
              (p.id === 'kin' ? 'nextOfKin' : 'passenger') + '.' + key,
              c,
            ]),
          ),
        );
        applyServerValidation(e, controls);
        this.error.set('Check passenger details and refresh availability before trying again.');
      } else {
        this.error.set(
          'Checkout could not be started. Check your connection and retry to refresh availability.',
        );
      }
    } finally {
      this.attempts.finish(slug);
    }
  }
}
