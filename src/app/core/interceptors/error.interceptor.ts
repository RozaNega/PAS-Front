import { Injectable, Injector } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ToastService } from '../services/toast.service';
import { TokenService } from '../services/token.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private router: Router,
    private toastService: ToastService,
    private tokenService: TokenService,
    private injector: Injector,
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        // Check if error toast should be suppressed
        const suppressErrorToast = req.headers.has('X-Suppress-Error-Toast');

        // Comprehensive error logging
        console.error('❌ [Error Interceptor] HTTP Error:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message,
          error: error.error,
          headers: error.headers.keys().map((key) => ({ key, value: error.headers.get(key) })),
        });

        if (error.status === 401 && !this.router.url.includes('/auth/login')) {
          console.warn('Unauthorized request (401) to:', req.url, 'from page:', this.router.url);
          // Clear tokens directly instead of using AuthService to avoid circular dependency
          this.tokenService.removeToken();
          this.tokenService.removeRefreshToken();
          this.tokenService.removeUser();
          this.router.navigate(['/auth/login']);
          this.toastService.error('Session expired. Please login again.');
        } else if (!suppressErrorToast) {
          if (error.status === 403) {
            this.toastService.error('You do not have permission to perform this action.');
          } else if (error.status === 404) {
            this.toastService.error('Resource not found.');
          } else if (error.status >= 500) {
            this.toastService.error('Server error. Please try again later.');
          } else if (error.status === 0) {
            console.error('🔴 [Error Interceptor] Status 0 - Network error or CORS issue');
            console.error('This usually means:');
            console.error('1. Backend is not running');
            console.error('2. Proxy is not configured correctly');
            console.error('3. CORS is blocking the request');
            this.toastService.error('Unable to connect to server. Please check your connection.');
          } else if (error.error?.message) {
            this.toastService.error(error.error.message);
          }
        }

        return throwError(() => error);
      }),
    );
  }
}
