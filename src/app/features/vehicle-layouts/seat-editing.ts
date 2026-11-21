import {
  capacity,
  columns,
  frontToRear,
  type SeatCell,
  type SeatLayout,
  type SeatPosition,
} from '../../shared/seat-map/seat-layout';

export function gridIssues(grid: SeatLayout, singleDriver: boolean) {
  const cells = new Map<string, string>();
  const summary: string[] = [];
  const rows = new Set<number>();
  const labels = new Map<string, string>();
  let drivers = 0;
  if (!grid.rows.length) summary.push('Add a row to start the layout.');
  for (const row of grid.rows) {
    if (!Number.isInteger(row.row) || row.row < 1 || rows.has(row.row))
      summary.push('Each row needs a unique positive row number.');
    rows.add(row.row);
    if (!row.cells.length) summary.push('Add a position to row ' + row.row + '.');
    row.cells.forEach((cell, column) => {
      if (cell.type === 'DRIVER') drivers++;
      if (cell.type !== 'SEAT') return;
      const key = row.row + '-' + column;
      const label = cell.seatNumber.trim();
      const normalized = label.toLowerCase();
      if (!label) cells.set(key, 'Enter a seat number.');
      else if (Array.from(label).length > 20) cells.set(key, 'Use 20 characters or fewer.');
      else if (labels.has(normalized)) {
        const message = 'Seat number ' + label + ' is already used.';
        cells.set(labels.get(normalized)!, message);
        cells.set(key, message);
      } else labels.set(normalized, key);
    });
  }
  if (!capacity(grid)) summary.push('Add at least one passenger seat.');
  if (singleDriver && !drivers) summary.push('Use the Driver tool to mark the driver position.');
  if (singleDriver && drivers > 1) summary.push('Choose Driver and place it in one position.');
  return { cells, summary };
}

function replace(
  grid: SeatLayout,
  at: SeatPosition,
  cell: SeatCell,
  moveDriver = false,
): SeatLayout {
  return {
    rows: grid.rows.map((row) => ({
      ...row,
      cells: row.cells.map((old, col) => {
        if (row.row === at.row && col === at.column) return cell;
        if (moveDriver && old.type === 'DRIVER') return { type: 'AISLE' };
        return old;
      }),
    })),
  };
}

export function paint(
  grid: SeatLayout,
  at: SeatPosition,
  type: SeatCell['type'],
  singleDriver: boolean,
) {
  const current = grid.rows.find((row) => row.row === at.row)?.cells[at.column];
  if (!current) return grid;
  if (type !== 'SEAT') return replace(grid, at, { type }, type === 'DRIVER' && singleDriver);
  if (current.type === 'SEAT') return grid;
  const used = new Set(
    grid.rows.flatMap((row) =>
      row.cells.flatMap((cell) => (cell.type === 'SEAT' ? [cell.seatNumber.trim()] : [])),
    ),
  );
  let next = 1;
  while (used.has(String(next))) next++;
  return replace(grid, at, { type, seatNumber: String(next) });
}

export function labelSeat(grid: SeatLayout, at: SeatPosition, seatNumber: string) {
  return replace(grid, at, { type: 'SEAT', seatNumber });
}

export function normalizeGrid(grid: SeatLayout, renumber = false): SeatLayout {
  let number = 0;
  return {
    rows: frontToRear(grid).map((row) => ({
      row: row.row,
      cells: row.cells.map((cell): SeatCell =>
        cell.type === 'SEAT'
          ? { type: 'SEAT', seatNumber: renumber ? String(++number) : cell.seatNumber.trim() }
          : { type: cell.type },
      ),
    })),
  };
}

export type Resize = 'addRow' | 'removeRow' | 'addColumn' | 'removeColumn';
export function resize(grid: SeatLayout, action: Resize): SeatLayout {
  const rows = frontToRear(grid);
  const width = columns(grid);
  const gaps = (length: number) => Array.from({ length }, (): SeatCell => ({ type: 'AISLE' }));
  if (action === 'addRow')
    return {
      rows: [...rows, { row: (rows.at(-1)?.row ?? 0) + 1, cells: gaps(Math.max(1, width)) }],
    };
  if (action === 'removeRow') return rows.length > 1 ? { rows: rows.slice(0, -1) } : grid;
  if (action === 'removeColumn' && width <= 1) return grid;
  return {
    rows: rows.map((row) => ({
      ...row,
      cells:
        action === 'addColumn'
          ? [...row.cells, ...gaps(width + 1 - row.cells.length)]
          : row.cells.slice(0, width - 1),
    })),
  };
}
