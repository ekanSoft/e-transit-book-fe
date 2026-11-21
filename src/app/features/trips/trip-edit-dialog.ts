import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
  viewChild,
} from '@angular/core';
import { Field } from '../../shared/forms/field';
import { Button } from '../../shared/ui/button';
import { Errors } from '../../shared/ui/feedback';
import { ManagementDialog } from '../../shared/ui/management-dialog';
import type { Trip, TripPricing, UpdateTrip } from './trip-api';
import { TripFares } from './trip-fares';
import { fareControl, timeFields, validateTripTimes, watInput, watInstant } from './trip-fields';

export function tripChanges(
  trip: Trip,
  departure: string,
  arrival: string,
  pricing: TripPricing,
): UpdateTrip {
  const body: UpdateTrip = {};
  if (departure !== watInput(trip.departureTime)) body.departureTime = watInstant(departure);
  if (arrival !== watInput(trip.estimatedArrivalTime))
    body.estimatedArrivalTime = watInstant(arrival) || null;
  const saved = new Map(
    trip.pricing.seatOverrides.map(({ seatNumber, fare }) => [seatNumber.toLowerCase(), fare]),
  );
  if (
    pricing.baseFare !== trip.pricing.baseFare ||
    pricing.seatOverrides.length !== saved.size ||
    pricing.seatOverrides.some(
      ({ seatNumber, fare }) => saved.get(seatNumber.toLowerCase()) !== fare,
    )
  )
    body.pricing = pricing;
  return body;
}

@Component({
  selector: 'app-trip-edit-dialog',
  imports: [Button, Errors, Field, ManagementDialog, TripFares],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-management-dialog
      dialogId="edit-trip"
      title="Edit times and fares"
      [wide]="true"
      description="All times are in WAT. To remove an arrival estimate, clear its field."
      [busy]="busy()"
      (dismiss)="dismiss.emit()"
    >
      <form (submit)="$event.preventDefault(); submit()">
        <div class="management-body editor">
          <app-errors [messages]="messages()" />
          <div class="times">
            <app-field
              [id]="'edit-trip-departure'"
              label="Departure (WAT)"
              type="datetime-local"
              [control]="times().controls.departureTime"
            />
            <app-field
              [id]="'edit-trip-arrival'"
              label="Estimated arrival (WAT)"
              type="datetime-local"
              [control]="times().controls.estimatedArrivalTime"
              [optional]="true"
            />
          </div>
          <app-trip-fares
            [grid]="trip().seatLayoutSnapshot"
            [baseFare]="base()"
            [(overrides)]="overrides"
          />
          @if (overrides().length) {
            <button type="button" class="text-button" (click)="clearPrices()">
              Clear all per-seat fares
            </button>
          }
        </div>
        <footer class="management-footer">
          <button
            appButton
            type="button"
            variant="secondary"
            [disabled]="busy()"
            (click)="dismiss.emit()"
          >
            Cancel
          </button>
          <button appButton type="submit" [disabled]="busy()">
            {{ busy() ? 'Saving…' : 'Save changes' }}
          </button>
        </footer>
      </form>
    </app-management-dialog>
  `,
  styles: `
    .editor,
    .times {
      display: grid;
      gap: 14px;
    }
    .times {
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
    }
    .editor > button {
      justify-self: start;
    }
  `,
})
export class TripEditDialog {
  readonly trip = input.required<Trip>();
  readonly busy = input(false);
  readonly messages = input<string[]>([]);
  readonly dismiss = output<void>();
  readonly save = output<UpdateTrip>();
  readonly times = computed(() =>
    timeFields(watInput(this.trip().departureTime), watInput(this.trip().estimatedArrivalTime)),
  );
  readonly base = computed(() => fareControl(String(this.trip().pricing.baseFare)));
  readonly overrides = linkedSignal(() => this.trip().pricing.seatOverrides);
  private readonly fares = viewChild(TripFares);

  clearPrices() {
    this.overrides.set([]);
    this.fares()?.seatFare.reset('');
  }

  submit() {
    if (this.busy()) return;
    const trip = this.trip();
    const times = this.times();
    const form = times.getRawValue();
    const body = tripChanges(trip, form.departureTime, form.estimatedArrivalTime, {
      baseFare: Number(this.base().value),
      seatOverrides: this.overrides(),
    });
    const departure = body.departureTime ?? trip.departureTime;
    const arrival =
      body.estimatedArrivalTime === undefined
        ? trip.estimatedArrivalTime
        : body.estimatedArrivalTime;
    const validTimes = validateTripTimes(
      times,
      departure,
      arrival,
      body.departureTime !== undefined,
    );
    this.base().markAsTouched();
    const pendingPriceValid = this.fares()?.validatePending() ?? true;
    if (!validTimes || this.base().invalid || !pendingPriceValid) return;
    if (Object.keys(body).length) this.save.emit(body);
    else this.dismiss.emit();
  }
}
