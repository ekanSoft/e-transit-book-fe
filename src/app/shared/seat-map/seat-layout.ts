export type SeatCell = { type: 'SEAT'; seatNumber: string } | { type: 'AISLE' | 'DRIVER' };
export interface SeatRow {
  row: number;
  cells: SeatCell[];
}
export interface SeatLayout {
  rows: SeatRow[];
}
export interface SeatPosition {
  row: number;
  column: number;
}

export function frontToRear(grid: SeatLayout) {
  return [...grid.rows].sort((a, b) => a.row - b.row);
}

export function capacity(grid: SeatLayout) {
  return grid.rows.reduce(
    (count, row) => count + row.cells.filter((cell) => cell.type === 'SEAT').length,
    0,
  );
}

export function columns(grid: SeatLayout) {
  return grid.rows.reduce((width, row) => Math.max(width, row.cells.length), 0);
}
