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

        // Skip 401/403 redirects — dev API endpoints don't auth-check, and redirect loops
        // are worse than showing an empty state. Let AuthGuard catch expired sessions.
        if (error.status === 500) {
          console.error('Server Error:', error.message);
        }

        return throwError(() => error);
      })
    );
  }
}
