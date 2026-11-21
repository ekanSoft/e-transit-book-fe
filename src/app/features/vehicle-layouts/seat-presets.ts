import { capacity, type SeatCell, type SeatLayout } from '../../shared/seat-map/seat-layout';
import type { VehicleType } from './layout-api';

function arrangement(pattern: string[]): SeatLayout {
  let seat = 0;
  return {
    rows: pattern.map((line, index) => ({
      row: index + 1,
      cells: Array.from(line, (symbol): SeatCell => {
        if (symbol === 'S') return { type: 'SEAT', seatNumber: String(++seat) };
        return { type: symbol === 'D' ? 'DRIVER' : 'AISLE' };
      }),
    })),
  };
}

function preset(type: VehicleType | null, name: string, pattern: string[]) {
  const grid = arrangement(pattern);
  return { type, name, grid, capacity: capacity(grid) };
}

// Editable examples. Bus 14 follows vehicle-seat-layout.example.ts in the backend.
export const presets = [
  preset('CAR', 'Car 4', ['D.S', 'SSS']),
  preset('SIENNA', 'Sienna 7', ['D.S', 'SSS', 'SSS']),
  preset('SIENNA', 'Sienna 8', ['D..S', 'SS.S', 'SSSS']),
  preset('BUS', 'Bus 14', ['D.SS', ...Array<string>(4).fill('SS.S')]),
  preset('BUS', 'Bus 18', ['D...S', ...Array<string>(4).fill('SS..S'), 'SSSSS']),
  preset('COASTER', 'Coaster 30', ['D...S', ...Array<string>(8).fill('SS..S'), 'SSSSS']),
];
export const customPreset = preset(null, 'Custom layout', ['...', '...']);
export type SeatPreset = typeof customPreset;
