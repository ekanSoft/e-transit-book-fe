import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  model,
} from '@angular/core';
import type { FormControl } from '@angular/forms';
import { Field } from '../../shared/forms/field';
import { FieldHelp } from '../../shared/forms/field-help';
import type { SeatLayout, SeatPosition } from '../../shared/seat-map/seat-layout';
import { SeatMap } from '../../shared/seat-map/seat-map';
import { Button } from '../../shared/ui/button';
import { Icon } from '../../shared/ui/icon';
import type { TripPricing } from './trip-api';
import { fareControl, fareHint } from './trip-fields';
import { fareLabel } from './trip-format';

@Component({
  selector: 'app-trip-fares',
  imports: [Button, Field, FieldHelp, Icon, SeatMap],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './trip-fares.html',
  styleUrl: './trip-fares.css',
})
export class TripFares {
  readonly grid = input.required<SeatLayout>();
  readonly baseFare = input.required<FormControl<string>>();
  readonly overrides = model.required<TripPricing['seatOverrides']>();
  readonly selected = linkedSignal({
    source: this.grid,
    computation: (): SeatPosition | null => null,
  });
  readonly seat = computed(() => {
    const position = this.selected();
    if (!position) return null;
    const cell = this.grid().rows.find(({ row }) => row === position.row)?.cells[position.column];
    return cell?.type === 'SEAT' ? cell.seatNumber : null;
  });
  readonly bySeat = computed(
    () => new Map(this.overrides().map(({ seatNumber, fare }) => [seatNumber.toLowerCase(), fare])),
  );
  readonly descriptions = computed(
    () =>
      new Map(
        this.overrides().map(({ seatNumber, fare }) => [
          seatNumber,
          'Fare override ' + fareLabel(fare),
        ]),
      ),
  );
  readonly seatFare = fareControl();
  readonly hint = fareHint;

  select(position: SeatPosition) {
    this.selected.set(position);
    const amount = this.bySeat().get(this.seat()?.toLowerCase() ?? '');
    this.seatFare.reset(amount === undefined ? '' : String(amount));
  }

  apply() {
    const seatNumber = this.seat();
    if (!seatNumber || !this.validatePending(true)) return;
    const fare = Number(this.seatFare.value);
    this.overrides.update((overrides) => [
      ...overrides.filter((item) => item.seatNumber.toLowerCase() !== seatNumber.toLowerCase()),
      { seatNumber, fare },
    ]);
    this.seatFare.markAsPristine();
  }

  clear() {
    const seat = this.seat()?.toLowerCase();
    this.overrides.update((overrides) =>
      overrides.filter(({ seatNumber }) => seatNumber.toLowerCase() !== seat),
    );
    this.seatFare.reset('');
  }

  validatePending(applying = false) {
    if (!applying && (!this.seat() || !this.seatFare.dirty || !this.seatFare.value)) return true;
    this.seatFare.updateValueAndValidity();
    this.seatFare.markAsTouched();
    if (this.seatFare.invalid) return false;
    if (!applying) this.seatFare.setErrors({ server: 'Apply this seat price before continuing.' });
    return applying;
  }
}
