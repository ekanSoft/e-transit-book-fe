import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  TemplateRef,
  contentChild,
} from '@angular/core';
import { Icon } from '../ui/icon';
import {
  columns,
  frontToRear,
  type SeatCell,
  type SeatLayout,
  type SeatPosition,
} from './seat-layout';

@Component({
  selector: 'app-seat-map',
  imports: [Icon, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './seat-map.html',
  styleUrl: './seat-map.css',
  host: {
    '[class.mini]': "mode() === 'miniature'",
    '[attr.aria-hidden]': "mode() === 'miniature' ? true : null",
  },
})
export class SeatMap {
  readonly grid = input.required<SeatLayout>();
  readonly mode = input<'edit' | 'view' | 'miniature'>('view');
  readonly selected = input<SeatPosition | null>(null);
  readonly errors = input<ReadonlyMap<string, string>>(new Map());
  readonly cellPress = output<SeatPosition>();
  // Consumers can annotate a seat without changing the saved grid.
  readonly annotation = contentChild<TemplateRef<{ $implicit: SeatCell }>>(TemplateRef);
  readonly rows = computed(() => frontToRear(this.grid()));
  readonly width = computed(() => columns(this.grid()));
  describe(row: number, column: number, cell: SeatCell, error?: string) {
    const label =
      cell.type === 'SEAT'
        ? 'Seat ' + (cell.seatNumber || 'without a number')
        : cell.type === 'DRIVER'
          ? 'Driver'
          : 'Aisle';
    return 'Row ' + row + ', position ' + (column + 1) + ', ' + label + (error ? '. ' + error : '');
  }
}
