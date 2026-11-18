import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
const paths = {
  bus: 'M5 17h14V6a3 3 0 0 0-3-3H8a3 3 0 0 0-3 3v11ZM5 10h14M8 17v3m8-3v3M8 14h.01M16 14h.01',
  sun: 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  moon: 'M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z',
  panel: 'M3 4h18v16H3zM9 4v16',
  monitor: 'M3 4h18v13H3zM12 17v4m-4 0h8',
  user: 'M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7v2',
  switch: 'm8 8 4-4 4 4m-8 8 4 4 4-4',
  down: 'm6 9 6 6 6-6',
  wallet: 'M3 6V4h15v3M3 7h18v13H3V7Zm12 5h6v4h-6z',
  ticket: 'M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4V6Zm12 0v2m0 3v2m0 3v2',
  seat: 'M6 4h4v8h7a2 2 0 0 1 2 2v2H9a3 3 0 0 1-3-3V4Zm2 12v4m9-4v4',
  calendar: 'M3 5h18v16H3zM7 3v4m10-4v4M3 10h18',
  refresh: 'M20 7v5h-5M4 17v-5h5M5 8a8 8 0 0 1 14-2l1 3M4 15l1 3a8 8 0 0 0 14-2',
  file: 'M5 2h9l5 5v15H5zM14 2v6h5M8 13h8m-8 4h6',
  chart: 'M3 3v17h18M7 15v-4m5 4V7m5 8V9',
  search: 'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 6 6',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  check: 'm5 12 4 4L19 6',
  building: 'M4 21V3h12v18M16 9h4v12M2 21h20M8 7h4M8 11h4M8 15h4M8 21v-3h4v3',
  shield: 'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Zm-4 9 3 3 5-5',
  pin: 'M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  mail: 'M3 5h18v14H3V5Zm0 0 9 8 9-8',
  clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'm6 6 12 12M6 18 18 6',
  overview: 'M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z',
  logout: 'M9 3H4v18h5m5-14 5 5-5 5M8 12h11',
  upload: 'M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5',
  chevron: 'm14 6-6 6 6 6',
} as const;
export type IconName = keyof typeof paths;
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path [attr.d]="path()" />
  </svg>`,
  host: { 'aria-hidden': 'true' },
})
export class Icon {
  readonly name = input<IconName>('bus');
  readonly path = computed(() => paths[this.name()]);
}
