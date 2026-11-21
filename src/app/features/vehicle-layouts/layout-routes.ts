import { Routes } from '@angular/router';
import { layoutsGuard, layoutWriteGuard } from '../../core/auth/guards';
import { LayoutDirectory } from './layout-directory';
import type { LayoutWorkspace } from './layout-workspace';

const workspace = () => import('./layout-workspace').then((m) => m.LayoutWorkspace);
export const layoutRoutes: Routes = [
  { path: '', pathMatch: 'full', component: LayoutDirectory, canActivate: [layoutsGuard] },
  {
    path: 'new',
    title: 'Create vehicle layout · eTransitBook',
    loadComponent: workspace,
    canActivate: [layoutWriteGuard],
    canDeactivate: [(page: LayoutWorkspace) => page.leave()],
  },
  {
    path: ':id/edit',
    title: 'Edit vehicle layout · eTransitBook',
    loadComponent: workspace,
    canActivate: [layoutWriteGuard],
    canDeactivate: [(page: LayoutWorkspace) => page.leave()],
  },
  {
    path: ':id',
    title: 'View vehicle layout · eTransitBook',
    loadComponent: workspace,
    canActivate: [layoutsGuard],
    data: { readOnly: true },
  },
];
