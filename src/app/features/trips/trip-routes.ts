import { Routes } from '@angular/router';
import { copyTripsGuard, scheduleTripGuard, tripManifestGuard } from '../../core/auth/guards';
import type { TripCopy } from './trip-copy';
import type { TripSchedule } from './trip-schedule';

export const tripRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Trips · eTransitBook',
    loadComponent: () => import('./trip-directory').then((m) => m.TripDirectory),
  },
  {
    path: 'new',
    title: 'Create trip · eTransitBook',
    canActivate: [scheduleTripGuard],
    canDeactivate: [(page: TripSchedule, _route, _current, next) => page.leave(next.url)],
    loadComponent: () => import('./trip-schedule').then((m) => m.TripSchedule),
  },
  {
    path: 'copy-day',
    title: 'Copy a day · eTransitBook',
    canActivate: [copyTripsGuard],
    canDeactivate: [(page: TripCopy) => page.leave()],
    loadComponent: () => import('./trip-copy').then((m) => m.TripCopy),
  },
  {
    path: ':id/manifest',
    title: 'Trip manifest · eTransitBook',
    canActivate: [tripManifestGuard],
    loadComponent: () => import('./trip-manifest').then((m) => m.TripManifestPage),
  },
  {
    path: ':id',
    title: 'Trip details · eTransitBook',
    loadComponent: () => import('./trip-detail').then((m) => m.TripDetail),
  },
];
