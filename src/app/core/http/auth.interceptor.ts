import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Session } from '../auth/session';
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(Session),
    router = inject(Router);
  const base = environment.apiBaseUrl;
  const isApi = request.url === base || request.url.startsWith(base + '/');
  const isProtected = isApi && !request.url.startsWith(base + '/auth/');
  const token = session.token();
  const outgoing =
    isProtected && token
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;
  return next(outgoing).pipe(
    catchError((error: unknown) => {
      if (
        isProtected &&
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        session.token() === token
      ) {
        session.clear();
        void router.navigate(['/login'], { queryParams: { expired: '1' } });
      }
      return throwError(() => error);
    }),
  );
};
