import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TokenService } from '../services/token.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private tokenService: TokenService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Debug logging
    console.log('🔍 [Auth Interceptor]', {
      method: req.method,
      url: req.url,
      urlWithParams: req.urlWithParams,
      fullUrl: req.url
    });
    
    const token = this.tokenService.getToken();
    
    const isAuthRequest = req.url.toLowerCase().includes('/auth/login') || 
                          req.url.toLowerCase().includes('/auth/register');
    
    if (token && !isAuthRequest) {
      const cloned = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('✅ [Auth Interceptor] Added token to request');
      return next.handle(cloned);
    }
    
    console.log('ℹ️ [Auth Interceptor] No token added (auth request or no token)');
    return next.handle(req);
  }
}


