import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SeatMap } from '../../shared/seat-map/seat-map';
import type { SeatPosition } from '../../shared/seat-map/seat-layout';
import { showWat, fareLabel } from '../trips/trip-format';
import { journey, PublicStore } from './public-store';
import type { PublicTrip } from './trip';
@Component({
  imports: [SeatMap, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './seat-selection.html',
})
export class SeatSelection {
  readonly store = inject(PublicStore);
  readonly route = inject(ActivatedRoute);
  readonly trip = signal<PublicTrip | null>(null);
  readonly error = signal('');
  readonly selected = signal<SeatPosition | null>(null);
  readonly conflict = this.route.snapshot.queryParamMap.has('refresh');
  readonly showWat = showWat;
  readonly fare = fareLabel;
  readonly journey = journey;
  readonly unavailable = computed(() => {
    const t = this.trip();
    const available = new Set(
      t?.seats.filter((s) => s.available).map((s) => s.seatNumber.toLowerCase()),
    );
    return new Set(
      t?.seatLayoutSnapshot.rows.flatMap((r) =>
        r.cells.flatMap((c) =>
          c.type === 'SEAT' && !available.has(c.seatNumber.toLowerCase())
            ? [c.seatNumber.toLowerCase()]
            : [],
        ),
      ),
    );
  });
  readonly descriptions = computed(
    () =>
      new Map(
        this.trip()?.seats.map((s) => [
          s.seatNumber,
          s.available ? fareLabel(s.fare) : 'Unavailable',
        ]),
      ),
  );
  readonly chosen = computed(() => {
    const t = this.trip(),
      p = this.selected();
    const c = t?.seatLayoutSnapshot.rows.find((r) => r.row === p?.row)?.cells[p?.column ?? -1];
    return c?.type === 'SEAT'
      ? t?.seats.find(
          (s) => s.seatNumber.toLowerCase() === c.seatNumber.toLowerCase() && s.available,
        )
      : null;
  });
  private version = 0;
  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(() => void this.load());
  }
  async load() {
    const v = ++this.version;
    this.trip.set(null);
    this.selected.set(null);
    this.error.set('');
    try {
      const { data } = await this.store.api.get<PublicTrip>(
        this.store.path +
          '/trips/' +
          encodeURIComponent(this.route.snapshot.paramMap.get('tripId')!),
      );
      if (v === this.version) this.trip.set(data);
    } catch {
      if (v === this.version)
        this.error.set('This departure could not be loaded. Refresh or choose another departure.');
    }
  }
}
