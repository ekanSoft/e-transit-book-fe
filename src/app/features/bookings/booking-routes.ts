import type { Routes } from '@angular/router';
import { bookSeatGuard } from '../../core/auth/guards';
import type { BookingDraft } from './booking-draft';

export const bookingRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Bookings · eTransitBook',
    loadComponent: () => import('./booking-directory').then((m) => m.BookingDirectory),
  },
  {
    path: 'new',
    title: 'New booking · eTransitBook',
    canActivate: [bookSeatGuard],
    canDeactivate: [(page: BookingDraft) => page.leave()],
    loadComponent: () => import('./booking-draft').then((m) => m.BookingDraft),
  },
  {
    path: 'reuse/:id',
    title: 'Reuse ticket · eTransitBook',
    canActivate: [bookSeatGuard],
    canDeactivate: [(page: BookingDraft) => page.leave()],
    loadComponent: () => import('./booking-draft').then((m) => m.BookingDraft),
  },
  {
    path: 'find',
    title: 'Find ticket · eTransitBook',
    loadComponent: () => import('./find-ticket').then((m) => m.FindTicket),
  },
  {
    path: 'tickets/:ticket',
    title: 'Ticket · eTransitBook',
    loadComponent: () => import('./booking-detail').then((m) => m.BookingDetail),
  },
  {
    path: ':id',
    title: 'Booking details · eTransitBook',
    loadComponent: () => import('./booking-detail').then((m) => m.BookingDetail),
  },
];
