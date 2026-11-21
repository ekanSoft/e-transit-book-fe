import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { permitsWorkspaceRoute } from './routing';
import { Session } from './session';
import { WorkspaceAccess } from './workspace-access';
export const guestGuard: CanActivateFn = async () => {
  const session = inject(Session),
    router = inject(Router);
  if (!session.authenticated()) return true;
  await session.ensureContext();
  return session.authenticated() ? router.parseUrl(session.destination()) : true;
};
export const authGuard: CanActivateFn = async (_route, state) => {
  const session = inject(Session),
    router = inject(Router);
  if (!session.authenticated()) return router.parseUrl('/login');
  await session.ensureContext();
  if (!session.authenticated()) return router.parseUrl('/login');
  const destination = session.destination();
  return permitsWorkspaceRoute(destination, state.url) ? true : router.parseUrl(destination);
};

export const terminalsGuard: CanActivateFn = () =>
  inject(WorkspaceAccess).canViewTerminals() || inject(Router).parseUrl('/app/dashboard');

export const routesGuard: CanActivateFn = () =>
  inject(WorkspaceAccess).canViewRoutes() || inject(Router).parseUrl('/app/dashboard');

export const employeesGuard: CanActivateFn = () =>
  inject(WorkspaceAccess).canViewEmployees() || inject(Router).parseUrl('/app/dashboard');

export const layoutsGuard: CanActivateFn = () =>
  inject(WorkspaceAccess).canViewLayouts() || inject(Router).parseUrl('/app/dashboard');

export const layoutWriteGuard: CanActivateFn = () =>
  inject(WorkspaceAccess).canWriteLayouts() || inject(Router).parseUrl('/app/vehicle-layouts');
