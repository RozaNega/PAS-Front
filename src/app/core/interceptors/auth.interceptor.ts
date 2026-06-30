import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, Subject, throwError } from 'rxjs';
import { catchError, filter, switchMap, take, tap } from 'rxjs/operators';
import { TokenService } from '../services/token.service';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject = new Subject<string | null>();

  constructor(
    private tokenService: TokenService,
    private http: HttpClient,
    private router: Router,
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.tokenService.getToken();
    const isAuthRequest = this.isAuthEndpoint(req.url);

    if (token && !isAuthRequest) {
      req = this.addToken(req, token);
    }

    return next.handle(req).pipe(
      catchError((error) => {
        if (error instanceof HttpErrorResponse && error.status === 401 && !isAuthRequest) {
          return this.handle401Error(req, next);
        }
        return throwError(() => error);
      }),
    );
  }

  private handle401Error(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      const refreshToken = this.tokenService.getRefreshToken();
      if (!refreshToken) {
        this.isRefreshing = false;
        this.logout();
        return throwError(() => new Error('No refresh token available'));
      }

      return this.http.post<any>('/api/Auth/refresh-token', { refreshToken }).pipe(
        switchMap((response) => {
          this.isRefreshing = false;
          const data = response.data ?? response;
          const newToken = data.token ?? data.Token ?? data.accessToken ?? '';
          const newRefreshToken = data.refreshToken ?? data.RefreshToken ?? '';

          if (newToken) {
            this.tokenService.setToken(newToken);
            if (newRefreshToken) {
              this.tokenService.setRefreshToken(newRefreshToken);
            }
            this.refreshTokenSubject.next(newToken);
            return next.handle(this.addToken(req, newToken));
          }

          this.refreshTokenSubject.next(null);
          this.logout();
          return throwError(() => new Error('Token refresh failed'));
        }),
        catchError((err) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(null);
          this.logout();
          return throwError(() => err);
        }),
      );
    }

    return this.refreshTokenSubject.pipe(
      filter((token) => token !== null),
      take(1),
      switchMap((token) => next.handle(this.addToken(req, token!))),
    );
  }

  private addToken(req: HttpRequest<any>, token: string): HttpRequest<any> {
    return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  private isAuthEndpoint(url: string): boolean {
    const lower = url.toLowerCase();
    return (
      lower.includes('/auth/login') ||
      lower.includes('/auth/register') ||
      lower.includes('/auth/register-pending') ||
      lower.includes('/auth/refresh-token')
    );
  }

  private logout(): void {
    this.tokenService.clear();
    this.isRefreshing = false;
    // Don't navigate away — let the AuthGuard redirect on the next protected-route access.
    // This avoids redirect loops when many API calls 401 at once after a fresh login.
  }
}
