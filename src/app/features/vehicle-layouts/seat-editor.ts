import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  model,
  signal,
  afterNextRender,
  ElementRef,
  Injector,
  inject,
  viewChild,
} from '@angular/core';
import {
  capacity,
  columns,
  type SeatCell,
  type SeatLayout,
  type SeatPosition,
} from '../../shared/seat-map/seat-layout';
import { SeatMap } from '../../shared/seat-map/seat-map';
import { Button } from '../../shared/ui/button';
import { Icon, type IconName } from '../../shared/ui/icon';
import { ManagementDialog } from '../../shared/ui/management-dialog';
import { gridIssues, labelSeat, normalizeGrid, paint, resize, type Resize } from './seat-editing';

@Component({
  selector: 'app-seat-editor',
  imports: [SeatMap, Button, Icon, ManagementDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './seat-editor.html',
  styleUrl: './seat-editor.css',
})
export class SeatEditor {
  readonly grid = model.required<SeatLayout>();
  readonly baseline = input.required<SeatLayout>();
  readonly singleDriver = input(true);
  readonly startInPreview = input(false);
  readonly preview = linkedSignal({
    source: () => ({ baseline: this.baseline(), preview: this.startInPreview() }),
    computation: (source) => source.preview,
  });
  private readonly number = viewChild<ElementRef<HTMLInputElement>>('number');
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly tool = signal<SeatCell['type']>('SEAT');
  readonly tools: { type: SeatCell['type']; name: string; icon: IconName }[] = [
    { type: 'SEAT', name: 'Seat', icon: 'seat' },
    { type: 'AISLE', name: 'Aisle', icon: 'aisle' },
    { type: 'DRIVER', name: 'Driver', icon: 'wheel' },
  ];
  readonly selected = linkedSignal({
    source: this.baseline,
    computation: (): SeatPosition | null => null,
  });
  readonly capacity = computed(() => capacity(this.grid()));
  readonly width = computed(() => columns(this.grid()));
  readonly issues = computed(() => gridIssues(this.grid(), this.singleDriver()));
  readonly messages = computed(() => [...new Set(this.issues().cells.values())]);
  readonly selectedSeat = computed(() => {
    const at = this.selected();
    if (!at) return null;
    const cell = this.grid().rows.find((row) => row.row === at.row)?.cells[at.column];
    return cell?.type === 'SEAT'
      ? { ...at, label: cell.seatNumber, error: this.issues().cells.get(at.row + '-' + at.column) }
      : null;
  });
  readonly confirmation = signal<{
    title: string;
    message: string;
    verb: string;
    grid: SeatLayout;
  } | null>(null);
  apply(at: SeatPosition) {
    const editingLabel =
      this.tool() === 'SEAT' &&
      this.grid().rows.find((row) => row.row === at.row)?.cells[at.column]?.type === 'SEAT';
    this.grid.set(paint(this.grid(), at, this.tool(), this.singleDriver()));
    this.selected.set(at);
    if (editingLabel)
      afterNextRender(
        () => {
          const input = this.number()?.nativeElement;
          input?.focus();
          input?.select();
        },
        { injector: this.injector },
      );
  }
  finishLabel() {
    this.host.nativeElement.querySelector<HTMLButtonElement>('button.cell.marked')?.focus();
  }
  rename(label: string) {
    const at = this.selectedSeat();
    if (at) this.grid.set(labelSeat(this.grid(), at, label));
  }
  adjust(action: Resize) {
    const next = resize(this.grid(), action);
    const removed = this.capacity() - capacity(next);
    const dimension = action === 'removeRow' ? 'last row' : 'rightmost column';
    if (removed > 0) {
      this.confirmation.set({
        title: 'Remove the ' + dimension + '?',
        message:
          'This will remove ' + removed + ' passenger ' + (removed === 1 ? 'seat.' : 'seats.'),
        verb: 'Remove ' + dimension,
        grid: next,
      });
    } else this.commit(next);
  }
  renumber() {
    this.confirmation.set({
      title: 'Renumber passenger seats?',
      message:
        'Replace all passenger labels with numbers from 1 to ' +
        this.capacity() +
        ', from front to rear.',
      verb: 'Renumber seats',
      grid: normalizeGrid(this.grid(), true),
    });
  }
  reset() {
    this.confirmation.set({
      title: 'Reset seating arrangement?',
      message: 'Restore the starting arrangement and its original seat numbers.',
      verb: 'Reset arrangement',
      grid: this.baseline(),
    });
  }
  commit(grid: SeatLayout) {
    this.grid.set(grid);
    this.selected.set(null);
    this.confirmation.set(null);
  }
}
