import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';

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

    // Check via AuthService (which validates token expiry)
    if (this.authService.isAuthenticated()) {
      return true;
    }

    // Redirect to login only if no valid session
    this.router.navigate(['/auth/login']);
    return false;
  }
}
