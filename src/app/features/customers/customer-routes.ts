import type { Routes } from '@angular/router';

export const customerRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Customers · eTransitBook',
    loadComponent: () => import('./customer-directory').then((m) => m.CustomerDirectory),
  },
  {
    path: ':id',
    title: 'Customer details · eTransitBook',
    loadComponent: () => import('./customer-detail').then((m) => m.CustomerDetail),
  },
];
