import { Injectable } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private router: Router) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Skip error handling for specific endpoints
        if (request.url.includes('/auth/')) {
          return throwError(() => error);
        }

        // In development mode, pass through all API errors without logging
        const isDevMode = !!(typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost');
        if (isDevMode) {
          return throwError(() => error);
        }

        // Suppress error toast for specific endpoints
        if (error.headers?.get('X-Suppress-Error-Toast')) {
          return throwError(() => error);
        }

        if (error.status === 401) {
          // Redirect to login page on 401 Unauthorized
          this.router.navigate(['/login']);
        } else if (error.status === 403) {
          // Redirect to forbidden page on 403 Forbidden
          this.router.navigate(['/forbidden']);
        } else if (error.status === 500) {
          console.error('Server Error:', error.message);
        }

        return throwError(() => error);
      })
    );
  }
}
