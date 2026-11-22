import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { Field } from '../../shared/forms/field';
import type { TripSummary } from './trip-api';
import { fareLabel, routeLabel, showWat, shiftDays } from './trip-format';

@Component({
  selector: 'app-trip-copy-row',
  imports: [Field],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="copy-choice">
      <label>
        <input
          type="checkbox"
          [checked]="included()"
          (change)="include.emit(check.checked)"
          #check
        />
        <span>
          <strong>{{ routeLabel(trip().route) }}</strong>
          <span
            >Departs {{ shifted(trip().departureTime) }} · {{ fare(trip().pricing.baseFare) }}</span
          >
          @if (trip().estimatedArrivalTime; as arrival) {
            <span>Estimated arrival {{ shifted(arrival) }}</span>
          }
        </span>
      </label>
      @if (included() && options().length > 1) {
        <app-field
          [id]="'copy-' + date() + '-' + trip()._id"
          label="Vehicle layout"
          labelHelp="The copied trip keeps the source trip’s fare even if you select a different vehicle layout. You can always edit the fare after the copy is saved."
          [control]="layout"
          [options]="options()"
          [overlayOptions]="true"
          [optional]="true"
        />
      } @else if (included()) {
        <small class="muted">{{ trip().vehicleLayout?.name || 'Source layout unavailable' }}</small>
      }
    </div>
  `,
  styles: `
    .copy-choice {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 14rem);
      align-items: start;
      gap: 8px 16px;
    }
    label {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      cursor: pointer;
      padding-block: 6px;
    }
    label span {
      display: block;
    }
    label span span {
      color: var(--color-muted);
      font-size: 0.84rem;
    }
    input {
      width: 1rem;
      height: 1rem;
      min-height: 0;
      padding: 0;
      flex: 0 0 auto;
      margin-top: 4px;
      accent-color: var(--accent-fill);
    }
    small {
      padding: 6px 0 6px 26px;
    }
    @media (max-width: 600px) {
      .copy-choice {
        grid-template-columns: minmax(0, 1fr);
      }
      app-field {
        margin-inline-start: 26px;
      }
    }
  `,
})
export class TripCopyRow {
  readonly date = input.required<string>();
  readonly offset = input.required<number>();
  readonly trip = input.required<TripSummary>();
  readonly included = input.required<boolean>();
  readonly replacement = input('');
  readonly options = input<readonly { value: string; label: string }[]>([]);
  readonly include = output<boolean>();
  readonly changeLayout = output<string>();
  readonly layout = new FormControl('', { nonNullable: true });
  readonly fare = fareLabel;
  readonly routeLabel = routeLabel;

  constructor() {
    this.layout.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((id) => this.changeLayout.emit(id));
  }

  ngOnInit() {
    this.layout.setValue(this.replacement(), { emitEvent: false });
  }

  shifted(value: string) {
    return showWat(shiftDays(value, this.offset()).toISOString());
  }
}
