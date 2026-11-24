import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  viewChild,
  afterRenderEffect,
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
  readonly reviewing = signal(false);
  private readonly reviewHeading = viewChild<ElementRef<HTMLElement>>('reviewHeading');
  readonly urlReference = signal('');
  readonly attempt = computed(() => {
    const a = this.attempts.get(this.store.slug());
    if (!a) return null;
    const url = this.urlReference();
    if (url ? a.reference !== url : !holdActive(a)) return null;
    return a;
  });
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
    afterRenderEffect(() => this.reviewHeading()?.nativeElement.focus());
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
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const slug = this.store.slug();
      const urlRef = params.get('reference')?.trim() ?? '';
      this.urlReference.set(urlRef);
      this.generation++;
      this.reviewing.set(false);
      this.trip.set(null);
      this.seat.set(null);
      if (this.attempt()) return;
      if (urlRef) {
        void this.router.navigate(['/public', slug, 'payment', 'return'], {
          queryParams: { reference: urlRef },
          replaceUrl: true,
        });
      } else {
        void this.refresh();
      }
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
  review() {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error.set('Check the highlighted passenger details.');
      document
        .querySelector<HTMLElement>('app-checkout [aria-invalid=true],main input.ng-invalid')
        ?.focus();
      return;
    }
    if (!this.seat()?.fees) {
      this.error.set('The total is unavailable. Refresh availability before continuing.');
      return;
    }
    this.error.set('');
    this.reviewing.set(true);
  }
  async pay() {
    const slug = this.store.slug();
    const t = this.trip();
    const s = this.seat();
    if (!this.reviewing() || !t || !s || this.form.invalid || !this.attempts.start(slug)) return;
    this.error.set('');
    try {
      const { data } = await this.store.api.post<Quote>(this.store.path + '/checkout', {
        trip: t._id,
        seatNumber: s.seatNumber,
        expectedTotalKobo: s.fees.totalKobo,
        ...passengerPayload(this.form),
      });
      const quote = {
        ...data,
        trip: t._id,
        journey: journey(t.route),
        departureTime: t.departureTime,
        seatNumber: s.seatNumber,
      };
      this.attempts.set(slug, quote);
      if (this.life.destroyed || this.store.slug() !== slug) return;
      this.form.reset();
      await this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { reference: data.reference },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
      const url = securePaymentUrl(data.authorizationUrl);
      if (url && !this.life.destroyed) window.location.assign(url);
    } catch (e) {
      if (this.life.destroyed) return;
      if (e instanceof HttpErrorResponse && e.status === 409 && this.trip()) {
        await this.chooseAgain(this.trip()!._id);
      } else if (e instanceof HttpErrorResponse && e.status === 400) {
        this.reviewing.set(false);
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
