import { Routes } from '@angular/router';
import { authGuard, employeesGuard, guestGuard, terminalsGuard } from './core/auth/guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: '',
    loadComponent: () => import('./features/auth/auth-layout').then((m) => m.AuthLayout),
    children: [
      {
        path: 'login',
        title: 'Sign in · eTransitBook',
        canActivate: [guestGuard],
        loadComponent: () => import('./features/auth/login').then((m) => m.Login),
      },
      {
        path: 'signup',
        title: 'Create account · eTransitBook',
        canActivate: [guestGuard],
        loadComponent: () => import('./features/auth/signup').then((m) => m.Signup),
      },
      {
        path: 'verify-signup',
        title: 'Verify email · eTransitBook',
        loadComponent: () => import('./features/auth/verify-signup').then((m) => m.VerifySignup),
      },
      {
        path: 'forgot-password',
        title: 'Recover account · eTransitBook',
        loadComponent: () =>
          import('./features/auth/forgot-password').then((m) => m.ForgotPassword),
      },
      {
        path: 'reset-password',
        title: 'Reset password · eTransitBook',
        loadComponent: () => import('./features/auth/reset-password').then((m) => m.ResetPassword),
      },
      {
        path: 'auth/access-status',
        title: 'Workspace access · eTransitBook',
        canActivate: [guestGuard],
        loadComponent: () => import('./features/auth/access-status').then((m) => m.AccessStatus),
      },
      {
        path: 'auth/select-business',
        title: 'Choose business · eTransitBook',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./features/auth/select-business').then((m) => m.SelectBusiness),
      },
    ],
  },
  {
    path: '',
    canActivateChild: [authGuard],
    loadComponent: () =>
      import('./core/layout/operator-shell/operator-shell').then((m) => m.OperatorShell),
    children: [
      {
        path: 'onboarding',
        title: 'Business setup · eTransitBook',
        loadComponent: () => import('./features/onboarding/onboarding').then((m) => m.Onboarding),
      },
      {
        path: 'pending-approval',
        title: 'Account status · eTransitBook',
        loadComponent: () =>
          import('./features/onboarding/account-status').then((m) => m.AccountStatus),
      },
      { path: 'app', pathMatch: 'full', redirectTo: 'app/dashboard' },
      {
        path: 'app/dashboard',
        title: 'Dashboard · eTransitBook',
        loadComponent: () => import('./features/workspace/dashboard').then((m) => m.Dashboard),
      },
      { path: 'app/branches', pathMatch: 'full', redirectTo: '/app/terminals' },
      {
        path: 'app/terminals',
        title: 'Terminals · eTransitBook',
        canActivate: [terminalsGuard],
        loadComponent: () => import('./features/workspace/branches').then((m) => m.Branches),
      },
      {
        path: 'app/employees',
        title: 'Employees · eTransitBook',
        canActivate: [employeesGuard],
        loadComponent: () => import('./features/employees/employees').then((m) => m.Employees),
      },
      {
        path: 'app/business-profile',
        title: 'Business profile · eTransitBook',
        loadComponent: () =>
          import('./features/workspace/business-profile').then((m) => m.BusinessProfile),
      },
      {
        path: 'app/account',
        title: 'My account · eTransitBook',
        loadComponent: () =>
          import('./features/workspace/account-profile').then((m) => m.AccountProfile),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
