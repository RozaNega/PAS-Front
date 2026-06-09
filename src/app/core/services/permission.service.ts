import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { AuthService } from './auth.service';
import { API_ENDPOINTS } from '../../config/api.config';
import { Permission, PermissionApiResponse } from '../models/role.model';

export interface IPermissionService {
  hasPermission(userId: string, permission: string): Observable<boolean>;
  hasAnyPermission(userId: string, permissions: string[]): Observable<boolean>;
  hasRole(userId: string, role: string): Observable<boolean>;
  getUserPermissions(userId: string): Observable<string[]>;
}

@Injectable({ providedIn: 'root' })
export class PermissionService implements IPermissionService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  hasPermission(userId: string, permission: string): Observable<boolean> {
    const user = this.authService.getCurrentUser();
    if (!user) return of(false);
    if (user.id !== userId) {
      return this.getUserPermissions(userId).pipe(
        map((perms) => this.matchesPermission(perms, permission)),
      );
    }
    return of(this.authService.hasPermission(permission));
  }

  hasAnyPermission(userId: string, permissions: string[]): Observable<boolean> {
    const user = this.authService.getCurrentUser();
    if (!user) return of(false);
    if (user.id !== userId) {
      return this.getUserPermissions(userId).pipe(
        map((perms) => permissions.some((p) => this.matchesPermission(perms, p))),
      );
    }
    return of(this.authService.hasAnyPermission(permissions));
  }

  hasRole(userId: string, role: string): Observable<boolean> {
    const user = this.authService.getCurrentUser();
    if (!user) return of(false);
    if (user.id !== userId) {
      return this.getUserPermissions(userId).pipe(map(() => false));
    }
    return of(this.authService.hasRole(role));
  }

  getUserPermissions(userId: string): Observable<string[]> {
    const user = this.authService.getCurrentUser();
    if (user && user.id === userId && user.permissions) {
      return of(user.permissions);
    }
    return this.http
      .get<PermissionApiResponse>(`${API_ENDPOINTS.PERMISSIONS.BY_USER(userId)}`)
      .pipe(map((res) => (Array.isArray(res.data) ? res.data.map((p) => p.name) : [])));
  }

  getAllPermissions(): Observable<Permission[]> {
    return this.http
      .get<PermissionApiResponse>(API_ENDPOINTS.PERMISSIONS.GET_ALL)
      .pipe(map((res) => (Array.isArray(res.data) ? res.data : [])));
  }

  private matchesPermission(userPermissions: string[], permission: string): boolean {
    const normalized = this.normalize(permission);
    return userPermissions.some((p) => this.normalize(p) === normalized);
  }

  private normalize(value: string): string {
    return value.replace(/[\s_-]+/g, '').toLowerCase();
  }
}
