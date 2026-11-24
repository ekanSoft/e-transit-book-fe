import { Routes } from '@angular/router';
import { PublicShell } from './public-shell';
export const publicRoutes: Routes = [
  {
    path: '',
    component: PublicShell,
    children: [
      {
        path: 'payment/return',
        data: { paymentReturn: true },
        title: 'Payment status',
        loadComponent: () => import('./payment-return').then((m) => m.PaymentReturn),
      },
      {
        path: 'booking/confirmed',
        data: { paymentReturn: true },
        title: 'Your ticket',
        loadComponent: () => import('./payment-return').then((m) => m.PaymentReturn),
      },
      {
        path: 'checkout',
        title: 'Passenger checkout',
        loadComponent: () => import('./checkout').then((m) => m.Checkout),
      },
      {
        path: 'trips/:tripId',
        title: 'Choose a seat',
        loadComponent: () => import('./seat-selection').then((m) => m.SeatSelection),
      },
      {
        path: '',
        title: 'Find a trip',
        loadComponent: () => import('./departures').then((m) => m.Departures),
      },
    ],
  },
];
