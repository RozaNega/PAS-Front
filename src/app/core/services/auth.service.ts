import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { ApiService } from './api.service';
import { TokenService } from './token.service';
import { ApiResponseModel } from '../models/api-response.model';

export type DashboardRole = 'admin' | 'storekeeper' | 'employee' | 'manager' | 'compliance-officer';
export const DASHBOARD_ROLES: DashboardRole[] = [
  'admin',
  'storekeeper',
  'employee',
  'manager',
  'compliance-officer',
];

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  succeeded: boolean;
  token: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
  errors: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private apiService: ApiService,
    private tokenService: TokenService,
    private router: Router,
  ) {
    this.loadStoredUser();
  }

  private loadStoredUser(): void {
    const user = this.tokenService.getUser();
    if (user && this.tokenService.getToken()) {
      this.currentUserSubject.next(user);
    }
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.apiService
      .post<ApiResponseModel<AuthResponse>>('Auth/login', request)
      .pipe(
        map((response) => {
          // Backend returns { success, message, data: { token, refreshToken, expiresAt, user }, statusCode }
          if (response.success && response.data) {
            return {
              succeeded: true,
              token: response.data.token || '',
              refreshToken: response.data.refreshToken || '',
              expiresAt: response.data.expiresAt || '',
              user: response.data.user || {
                id: '',
                username: '',
                fullName: '',
                email: '',
                roles: [],
                permissions: [],
              },
              errors: [],
            };
          }
          return {
            succeeded: false,
            token: '',
            refreshToken: '',
            expiresAt: '',
            user: {
              id: '',
              username: '',
              fullName: '',
              email: '',
              roles: [],
              permissions: [],
            },
            errors: [response.message || 'Login failed'],
          };
        }),
        tap((response) => {
          if (response.succeeded) {
            this.tokenService.setToken(response.token);
            this.tokenService.setRefreshToken(response.refreshToken);
            this.tokenService.setUser(response.user);
            this.currentUserSubject.next(response.user);
          }
        }),
      );
  }

  forgotPassword(email: string): Observable<{ succeeded: boolean; message: string; token?: string }> {
    return this.apiService.post<ApiResponseModel<any>>('Auth/forgot-password', { email }).pipe(
      map((response) => ({
        succeeded: response.success,
        message: response.message || (response.success ? 'Success' : 'Failed'),
        token: response.data?.token || (typeof response.data === 'string' ? response.data : undefined),
      }))
    );
  }

  resetPassword(request: any): Observable<{ succeeded: boolean; message: string }> {
    return this.apiService.post<ApiResponseModel<any>>('Auth/reset-password', request).pipe(
      map((response) => ({
        succeeded: response.success,
        message: response.message || (response.success ? 'Success' : 'Failed'),
      }))
    );
  }

  changePassword(request: { currentPassword: string; newPassword: string }): Observable<{ succeeded: boolean; message: string }> {
    return this.apiService.post<ApiResponseModel<any>>('Auth/change-password', request).pipe(
      map((response) => ({
        succeeded: response.success,
        message: response.message || (response.success ? 'Success' : 'Failed'),
      }))
    );
  }

  enable2FA(method: 'sms' | 'email' | 'app', contactInfo?: string): Observable<{ succeeded: boolean; message: string }> {
    return this.apiService.post<ApiResponseModel<any>>('Auth/enable-2fa', { method, contactInfo }).pipe(
      map((response) => ({
        succeeded: response.success,
        message: response.message || (response.success ? '2FA enabled successfully' : 'Failed to enable 2FA'),
      }))
    );
  }

  disable2FA(): Observable<{ succeeded: boolean; message: string }> {
    return this.apiService.post<ApiResponseModel<any>>('Auth/disable-2fa', {}).pipe(
      map((response) => ({
        succeeded: response.success,
        message: response.message || (response.success ? '2FA disabled successfully' : 'Failed to disable 2FA'),
      }))
    );
  }

  logout(): void {
    this.tokenService.clear();
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.tokenService.getToken();
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.roles?.includes(role) || false;
  }

  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    return user?.permissions?.includes(permission) || false;
  }

  hasAnyRole(roles: string[]): boolean {
    const user = this.getCurrentUser();
    if (!user?.roles) return false;
    return roles.some((role) => user.roles.includes(role));
  }

  hasAnyPermission(permissions: string[]): boolean {
    const user = this.getCurrentUser();
    if (!user?.permissions) return false;
    return permissions.some((perm) => user.permissions.includes(perm));
  }

  mapUserToDashboardRole(user: User | null): DashboardRole {
    const normalizedRoles = (user?.roles ?? []).map((role) => this.normalizeRoleName(role));

    if (
      this.hasRoleMatch(normalizedRoles, [
        'superadmin',
        'admin',
        'propertymanager',
        'propertyofficer',
      ])
    ) {
      return 'admin';
    }

    if (
      this.hasRoleMatch(normalizedRoles, [
        'storekeeper',
        'storeman',
        'storeofficer',
        'storemanager',
      ])
    ) {
      return 'storekeeper';
    }

    if (this.hasRoleMatch(normalizedRoles, ['manager', 'approver'])) {
      return 'manager';
    }

    if (
      this.hasRoleMatch(normalizedRoles, [
        'auditor',
        'complianceofficer',
        'compliance',
        'inspector',
      ])
    ) {
      return 'compliance-officer';
    }

    if (
      this.hasRoleMatch(normalizedRoles, [
        'staff',
        'employee',
        'requisitionofficer',
        'viewer',
        'user',
      ])
    ) {
      return 'employee';
    }

    return 'employee';
  }

  getDashboardRouteForUser(user: User | null): string {
    const role = this.mapUserToDashboardRole(user);

    if (role === 'manager') {
      return '/manager/dashboard';
    }

    if (role === 'compliance-officer') {
      return '/compliance-officer/dashboard';
    }

    return '/employee/dashboard';
  }

  isDashboardRole(value: string): value is DashboardRole {
    return DASHBOARD_ROLES.includes(value as DashboardRole);
  }

  private extractAuthResponse(
    response: ApiResponseModel<AuthResponse> | AuthResponse,
  ): AuthResponse {
    if (this.isAuthResponse(response)) {
      return response;
    }

    if (response?.data && this.isAuthResponse(response.data)) {
      return response.data;
    }

    return {
      succeeded: false,
      token: '',
      refreshToken: '',
      expiresAt: '',
      user: {
        id: '',
        username: '',
        fullName: '',
        email: '',
        roles: [],
        permissions: [],
      },
      errors: ['Unexpected authentication response.'],
    };
  }

  private isAuthResponse(value: unknown): value is AuthResponse {
    if (!value || typeof value !== 'object') {
      return false;
    }

    return 'succeeded' in value && 'token' in value && 'user' in value;
  }

  private normalizeRoleName(role: string): string {
    return role.replace(/[\s_-]+/g, '').toLowerCase();
  }

  private hasRoleMatch(normalizedRoles: string[], expected: string[]): boolean {
    return normalizedRoles.some((role) => expected.includes(role));
  }
}
