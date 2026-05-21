import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { NotificationService } from '../services/notification.service';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private router: Router,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (!environment.production && error.status > 0) {
          console.warn('[PAS API]', error.status, req.method, req.urlWithParams || req.url, error.message, error.error);
        }
        // During development, allow 401/0 errors to pass through without redirecting
        if (!environment.production && (error.status === 401 || error.status === 0)) {
          console.warn(`API error (${error.status}) - development mode allows this:`, req.url);
          return throwError(() => error);
        }

        if (error.status === 401 && !this.router.url.includes('/auth/login')) {
          console.warn('Unauthorized request (401) to:', req.url, 'from page:', this.router.url);
          this.authService.logout();
          this.router.navigate(['/auth/login']);
          this.notificationService.error('Session expired. Please login again.');
        } else if (error.status === 403) {
          this.notificationService.error('You do not have permission to perform this action.');
        } else if (error.status === 404) {
          this.notificationService.error('Resource not found.');
        } else if (error.status >= 500) {
          this.notificationService.error('Server error. Please try again later.');
        } else if (error.error?.message) {
          this.notificationService.error(error.error.message);
        }

        return throwError(() => error);
      }),
    );
  }
}


