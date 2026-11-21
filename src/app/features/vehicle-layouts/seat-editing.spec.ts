import { capacity, type SeatLayout } from '../../shared/seat-map/seat-layout';
import { gridIssues, labelSeat, normalizeGrid, paint, resize } from './seat-editing';
import { customPreset, presets } from './seat-presets';
import { layoutChanges } from './layout-api';

describe('vehicle seat arrangements', () => {
  it('builds numbered editable starting arrangements', () => {
    expect(presets.map((p) => capacity(p.grid))).toEqual([4, 7, 8, 14, 18, 30]);
    for (const p of presets) {
      expect(gridIssues(p.grid, true).cells.size).toBe(0);
      expect(gridIssues(p.grid, true).summary).toEqual([]);
    }
    expect(gridIssues(customPreset.grid, true).summary).toContain(
      'Add at least one passenger seat.',
    );
  });
  it('preserves manual labels, moves the driver and numbers only new seats', () => {
    const at = { row: 1, column: 2 };
    const grid = labelSeat(presets[0].grid, at, '1A');
    const moved = paint(grid, { row: 2, column: 0 }, 'DRIVER', true);
    expect(moved.rows[0].cells[0].type).toBe('AISLE');
    expect(capacity(moved)).toBe(3);
    const added = paint(moved, { row: 1, column: 0 }, 'SEAT', true);
    expect(added.rows[0].cells[0]).toEqual({ type: 'SEAT', seatNumber: '1' });
    expect(added.rows[0].cells[2]).toEqual({ type: 'SEAT', seatNumber: '1A' });
    expect(presets[0].grid.rows[0].cells[0].type).toBe('DRIVER');
    expect(normalizeGrid(added, true).rows[0].cells[2]).toEqual({ type: 'SEAT', seatNumber: '2' });
  });
  it('marks both duplicate labels and identifies missing and long labels', () => {
    let grid = labelSeat(presets[0].grid, { row: 1, column: 2 }, ' 1a ');
    grid = labelSeat(grid, { row: 2, column: 0 }, '1A');
    grid = labelSeat(grid, { row: 2, column: 1 }, ' ');
    grid = labelSeat(grid, { row: 2, column: 2 }, 'X'.repeat(21));
    expect([...gridIssues(grid, true).cells.keys()]).toEqual(['1-2', '2-0', '2-1', '2-2']);
  });
  it('preserves uneven existing rows and numbers through resizing', () => {
    const grid: SeatLayout = {
      rows: [{ row: 8, cells: [{ type: 'SEAT', seatNumber: '8B' }] }, ...presets[0].grid.rows],
    };
    expect(resize(grid, 'removeColumn').rows.at(-1)).toEqual(grid.rows[0]);
    expect(resize(grid, 'addRow').rows.at(-1)?.row).toBe(9);
    expect(resize(grid, 'removeRow').rows).toEqual(presets[0].grid.rows);
    expect(resize(grid, 'addColumn').rows.at(-1)?.cells.length).toBe(4);
  });
  it('requires one driver for edited road layouts and allows other vehicle arrangements', () => {
    const noDriver = paint(presets[0].grid, { row: 1, column: 0 }, 'AISLE', true);
    expect(gridIssues(noDriver, true).summary).toContain(
      'Use the Driver tool to mark the driver position.',
    );
    expect(gridIssues(noDriver, false).summary).toEqual([]);
  });
  it('sends metadata alone or the whole changed grid', () => {
    const saved = {
      name: 'Original',
      type: 'OTHER' as const,
      customType: 'Van',
      seatLayout: presets[0].grid,
    };
    expect(layoutChanges(saved, { ...saved, name: 'Updated', type: 'CAR' })).toEqual({
      name: 'Updated',
      type: 'CAR',
    });
    expect(layoutChanges(saved, { ...saved, seatLayout: customPreset.grid })).toEqual({
      seatLayout: customPreset.grid,
    });
  });
});
