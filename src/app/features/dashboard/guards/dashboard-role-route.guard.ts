import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { AuthService, DashboardRole } from '../../../core/services/auth.service';

@Injectable({ providedIn: 'root' })
export class DashboardRoleRouteGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const roleFromData = String(route.data['dashboardRole'] ?? '').toLowerCase();
    const roleParam = String(route.paramMap.get('role') ?? '').toLowerCase();
    const requestedRole = (roleFromData || roleParam) as DashboardRole;
    const currentUser = this.authService.getCurrentUser();
    const expectedRole = this.authService.mapUserToDashboardRole(currentUser);

    if (!this.authService.isDashboardRole(requestedRole)) {
      this.router.navigateByUrl(this.authService.getDashboardRouteForUser(currentUser));
      return false;
    }

    if (requestedRole !== expectedRole) {
      this.router.navigateByUrl(this.authService.getDashboardRouteForUser(currentUser));
      return false;
    }

    return true;
  }
}
