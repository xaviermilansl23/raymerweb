import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, Observable, shareReplay, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

let refreshRequest$: Observable<{ accessToken: string; refreshToken: string }> | null = null;

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const http = inject(HttpClient);
  const router = inject(Router);
  const token = auth.accessToken();
  const isAuthRequest = request.url.includes('/auth-cliente/');
  const authorized = token && !isAuthRequest
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authorized).pipe(
    catchError((error: HttpErrorResponse) => {
      const refreshToken = auth.refreshToken();
      if (error.status !== 401 || isAuthRequest || !refreshToken) return throwError(() => error);

      refreshRequest$ ??= http
        .post<{ accessToken: string; refreshToken: string }>(`${environment.apiUrl.replace(/\/$/, '')}/auth-cliente/refresh`, { refreshToken })
        .pipe(shareReplay(1), finalize(() => { refreshRequest$ = null; }));

      return refreshRequest$.pipe(
        switchMap((tokens) => {
          auth.saveTokens(tokens.accessToken, tokens.refreshToken);
          return next(request.clone({ setHeaders: { Authorization: `Bearer ${tokens.accessToken}` } }));
        }),
        catchError((refreshError) => {
          auth.logout();
          void router.navigate(['/login']);
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
