import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private router: Router,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  canActivate(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return true;
    }

    // During development, bypass authentication check
    if (!environment.production) {
      return true;
    }

    // Check if token exists in localStorage
    const hasToken = localStorage.getItem('pas_token') !== null;

    if (hasToken) {
      return true;
    }

    if (this.authService.isAuthenticated()) {
      return true;
    }

    // Redirect to login only if no token exists
    this.router.navigate(['/auth/login']);
    return false;
  }
}
