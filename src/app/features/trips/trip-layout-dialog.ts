import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  resource,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { WorkspaceAccess } from '../../core/auth/workspace-access';
import { errorMessages } from '../../core/http/errors';
import { SearchableSelect } from '../../shared/forms/searchable-select';
import { SeatMap } from '../../shared/seat-map/seat-map';
import { capacity } from '../../shared/seat-map/seat-layout';
import { Button } from '../../shared/ui/button';
import { Errors } from '../../shared/ui/feedback';
import { ManagementDialog } from '../../shared/ui/management-dialog';
import { LayoutApi } from '../vehicle-layouts/layout-api';
import type { Trip } from './trip-api';
import { choiceControl, seatNames } from './trip-fields';

@Component({
  selector: 'app-trip-layout-dialog',
  imports: [Button, Errors, ManagementDialog, SearchableSelect, SeatMap],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-management-dialog
      dialogId="replace-trip-layout"
      title="Change vehicle layout"
      [wide]="true"
      description="Every booked seat must exist on the replacement layout."
      [busy]="busy()"
      (dismiss)="dismiss.emit()"
    >
      <div class="management-body replacement">
        <app-errors [messages]="messages()" />
        @if (catalog.error()) {
          <app-errors [messages]="errors(catalog.error())" />
          <button appButton type="button" variant="secondary" (click)="catalog.reload()">
            Retry layouts
          </button>
        } @else if (catalog.isLoading()) {
          <p role="status">Loading active layouts…</p>
        } @else if (active().length) {
          <app-searchable-select
            [id]="'replacement-layout'"
            label="Replacement layout"
            placeholder="Choose a layout"
            searchLabel="Search active layouts"
            [options]="options()"
            [control]="layout"
          />
        } @else {
          <p>No active layouts are available.</p>
        }
        @if (bookedError()) {
          <p role="alert">Booked seats could not be verified.</p>
          <button appButton type="button" variant="secondary" (click)="retryBooked.emit()">
            Retry booked seats
          </button>
        } @else if (!booked()) {
          <p role="status">Checking booked seats…</p>
        }
        @if (missing().length) {
          <app-errors
            [messages]="[
              'Booked seats missing from the replacement: ' + missing().join(', ') + '.',
            ]"
          />
        }
        @if (dropped().length) {
          <p class="replacement-warning" role="status">
            Fare overrides will be removed for {{ dropped().join(', ') }}.
          </p>
        }
        <div class="comparison">
          <section aria-labelledby="saved-layout-title">
            <h3 id="saved-layout-title">
              Saved trip seats · {{ capacity(trip().seatLayoutSnapshot) }}
            </h3>
            <app-seat-map [grid]="trip().seatLayoutSnapshot">
              <ng-template let-cell>
                @if (occupied().has(cell.seatNumber.toLowerCase())) {
                  <small class="booked">Booked</small>
                }
              </ng-template>
            </app-seat-map>
          </section>
          <section aria-labelledby="new-layout-title">
            <h3 id="new-layout-title">
              Replacement seats{{ selected() ? ' · ' + capacity(selected()!.seatLayout) : '' }}
            </h3>
            @if (selected(); as replacement) {
              <app-seat-map [grid]="replacement.seatLayout">
                <ng-template let-cell>
                  @if (occupied().has(cell.seatNumber.toLowerCase())) {
                    <small class="booked">Booked</small>
                  }
                </ng-template>
              </app-seat-map>
            } @else {
              <p class="muted">Choose a layout to compare.</p>
            }
          </section>
        </div>
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
        <button appButton type="button" [disabled]="!ready()" (click)="submit()">
          {{ busy() ? 'Changing…' : 'Change layout' }}
        </button>
      </footer>
    </app-management-dialog>
  `,
  styles: `
    .replacement,
    .comparison {
      display: grid;
      gap: 14px;
    }
    .comparison {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .comparison section {
      min-width: 0;
      border-top: 1px solid var(--color-line);
      padding-top: 12px;
    }
    .comparison h3 {
      font-weight: 700;
    }
    .booked {
      color: #fff;
      background: var(--accent-fill);
      border-radius: 4px;
      padding: 1px 2px;
      font-size: 0.625rem;
      white-space: nowrap;
    }
    .replacement-warning {
      padding: 8px 12px;
      background: var(--raised);
    }
    .replacement > button {
      justify-self: start;
    }
    @media (max-width: 580px) {
      .comparison {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class TripLayoutDialog {
  private readonly access = inject(WorkspaceAccess);
  private readonly api = inject(LayoutApi);
  readonly trip = input.required<Trip>();
  readonly booked = input<string[]>();
  readonly bookedError = input(false);
  readonly busy = input(false);
  readonly messages = input<string[]>([]);
  readonly dismiss = output<void>();
  readonly retryBooked = output<void>();
  readonly save = output<string>();
  readonly layout = choiceControl();
  private readonly selectedId = toSignal(this.layout.valueChanges, { initialValue: '' });
  readonly catalog = resource({
    params: () =>
      this.access.canReplaceTripLayout(this.trip().route?.originBranch?._id)
        ? this.access.scope()
        : undefined,
    loader: async () => (await this.api.list()).data,
  });
  readonly active = computed(() =>
    (this.catalog.hasValue() ? this.catalog.value() : []).filter(
      (layout) => layout.status === 'ACTIVE',
    ),
  );
  readonly options = computed(() =>
    this.active().map(({ _id, name, seatLayout }) => ({
      value: _id,
      label:
        name +
        ' · ' +
        capacity(seatLayout) +
        ' seats' +
        (_id === this.trip().vehicleLayout?._id ? ' · Assigned template' : ''),
    })),
  );
  readonly selected = computed(() => this.active().find(({ _id }) => _id === this.selectedId()));
  private readonly seats = computed(() => {
    const selected = this.selected();
    return selected && seatNames(selected.seatLayout);
  });
  readonly occupied = computed(() => new Set(this.booked()?.map((label) => label.toLowerCase())));
  readonly missing = computed(() => {
    const seats = this.seats();
    return seats ? (this.booked() ?? []).filter((label) => !seats.has(label.toLowerCase())) : [];
  });
  readonly dropped = computed(() => {
    const seats = this.seats();
    return seats
      ? this.trip()
          .pricing.seatOverrides.map(({ seatNumber }) => seatNumber)
          .filter((label) => !seats.has(label.toLowerCase()))
      : [];
  });
  readonly ready = computed(
    () =>
      !!this.selected() &&
      !!this.booked() &&
      !this.bookedError() &&
      !this.missing().length &&
      !this.busy(),
  );
  readonly capacity = capacity;
  readonly errors = errorMessages;

  submit() {
    if (this.ready()) this.save.emit(this.layout.value);
  }
}
