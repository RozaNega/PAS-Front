import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { ApiService } from './api.service';
import { TokenService } from './token.service';
import { ApiResponseModel } from '../models/api-response.model';
import { CurrentUserService } from './current-user.service';

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
  isActive?: boolean;
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

  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  constructor(
    private apiService: ApiService,
    private tokenService: TokenService,
    private router: Router,
    private currentUserService: CurrentUserService,
  ) {
    this.loadStoredUser();
  }

  private loadStoredUser(): void {
    const token = this.tokenService.getToken();
    if (!token) return;

    let user = this.tokenService.getUser();

    // If user object is missing but we have a valid JWT, reconstruct user from claims
    if (!user && token.includes('.')) {
      const decoded = this.tokenService.getDecodedToken();
      if (decoded) {
        user = {
          id: decoded.sub || '',
          username: decoded.unique_name || decoded.name || '',
          fullName: decoded.fullName || decoded.FullName || '',
          email: decoded.email || '',
          roles: Array.isArray(decoded.role) ? decoded.role : decoded.role ? [decoded.role] : [],
          permissions: Array.isArray(decoded['permissions']) ? decoded['permissions'] : [],
          isActive: true, // If we have a valid token, assume active for now
        };
        this.tokenService.setUser(user);
      }
    }

    if (user) {
      this.currentUserSubject.next(user);
    }
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    const loginPayload = {
      username: request.username,
      userName: request.username,
      email: request.username,
      password: request.password,
    };

    console.log('🔐 [AuthService] Attempting login:', {
      endpoint: 'Auth/login',
      username: request.username,
      timestamp: new Date().toISOString(),
    });

    return this.apiService.post<ApiResponseModel<AuthResponse>>('Auth/login', loginPayload).pipe(
      tap((response) => {
        console.log('✅ [AuthService] Login response received:', response);
        console.log('Response structure:', {
          hasData: !!response.data,
          hasSuccess: response.success,
          statusCode: (response as any).statusCode,
        });
      }),
      map((response) => {
        const directResponse = response as any;
        const data =
          (response.data as any) ||
          (directResponse.result as any) ||
          (directResponse.payload as any) ||
          null;
        const tokenCandidate =
          (data as any)?.token ||
          (data as any)?.Token ||
          (data as any)?.accessToken ||
          (data as any)?.AccessToken ||
          directResponse.token ||
          directResponse.Token ||
          directResponse.accessToken ||
          directResponse.AccessToken ||
          '';
        const hasToken = typeof tokenCandidate === 'string' && tokenCandidate.length > 0;
        const statusCode = Number((response as any).statusCode ?? (data as any)?.statusCode ?? 0);
        const isSuccess =
          response.success === true ||
          response.succeeded === true ||
          (response as any).isSuccess === true ||
          (statusCode >= 200 && statusCode < 300) ||
          hasToken;

        if (isSuccess && data) {
          const userData =
            (data as any).user ||
            (data as any).User ||
            (data as any).currentUser ||
            (response as any).user ||
            null;

          const normalizedUser: User = userData
            ? {
                id: userData.id || userData.userId || '',
                username: userData.username || userData.userName || request.username,
                fullName: userData.fullName || userData.FullName || userData.name || '',
                email: userData.email || '',
                roles: Array.isArray(userData.roles)
                  ? userData.roles
                  : userData.roleName
                    ? [userData.roleName]
                    : userData.role
                      ? [userData.role]
                      : [],
                permissions: Array.isArray(userData.permissions) ? userData.permissions : [],
                isActive: userData.isActive !== false,
              }
            : {
                id: '',
                username: request.username,
                fullName: '',
                email: '',
                roles: [],
                permissions: [],
                isActive: true,
              };

          // Explicitly check for inactive status if the backend returns it
          if (normalizedUser.isActive === false) {
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
                isActive: false,
              },
              errors: [
                response.message ||
                  'User account is not allowed to sign in. Please contact an administrator.',
              ],
            };
          }

          return {
            succeeded: true,
            token: tokenCandidate,
            refreshToken:
              (data as any).refreshToken ||
              (data as any).RefreshToken ||
              (data as any).refresh_token ||
              (response as any).refreshToken ||
              '',
            expiresAt:
              (data as any).expiresAt ||
              (data as any).ExpiresAt ||
              (data as any).expiry ||
              (response as any).expiresAt ||
              '',
            user: normalizedUser,
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
            isActive: false,
          },
          errors: [response.message || (response as any).error || 'Login failed'],
        };
      }),
      tap((response) => {
        if (response.succeeded) {
          this.tokenService.setToken(response.token);
          this.tokenService.setRefreshToken(response.refreshToken);
          this.currentUserService.setUser(response.user);
          this.currentUserSubject.next(response.user);
        }
      }),
    );
  }

  forgotPassword(
    email: string,
  ): Observable<{ succeeded: boolean; message: string; token?: string }> {
    return this.apiService.post<ApiResponseModel<any>>('Auth/forgot-password', { email }).pipe(
      map((response) => ({
        succeeded: response.success,
        message: response.message || (response.success ? 'Success' : 'Failed'),
        token:
          response.data?.token || (typeof response.data === 'string' ? response.data : undefined),
      })),
    );
  }

  resetPassword(request: any): Observable<{ succeeded: boolean; message: string }> {
    return this.apiService.post<ApiResponseModel<any>>('Auth/reset-password', request).pipe(
      map((response) => ({
        succeeded: response.success,
        message: response.message || (response.success ? 'Success' : 'Failed'),
      })),
    );
  }

  changePassword(request: {
    currentPassword: string;
    newPassword: string;
  }): Observable<{ succeeded: boolean; message: string }> {
    return this.apiService.post<ApiResponseModel<any>>('Auth/change-password', request).pipe(
      map((response) => ({
        succeeded: response.success,
        message: response.message || (response.success ? 'Success' : 'Failed'),
      })),
    );
  }

  enable2FA(
    method: 'sms' | 'email' | 'app',
    contactInfo?: string,
  ): Observable<{ succeeded: boolean; message: string }> {
    return this.apiService
      .post<ApiResponseModel<any>>('Auth/enable-2fa', { method, contactInfo })
      .pipe(
        map((response) => ({
          succeeded: response.success,
          message:
            response.message ||
            (response.success ? '2FA enabled successfully' : 'Failed to enable 2FA'),
        })),
      );
  }

  disable2FA(): Observable<{ succeeded: boolean; message: string }> {
    return this.apiService.post<ApiResponseModel<any>>('Auth/disable-2fa', {}).pipe(
      map((response) => ({
        succeeded: response.success,
        message:
          response.message ||
          (response.success ? '2FA disabled successfully' : 'Failed to disable 2FA'),
      })),
    );
  }

  logout(): void {
    this.tokenService.clear();
    this.currentUserSubject.next(null);
    this.currentUserService.clear();
    this.router.navigate(['/auth/login']);
  }

  getCurrentUser(): User | null {
    if (!this.currentUserSubject.value && this.isAuthenticated()) {
      this.loadStoredUser();
    }
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    const isValid = this.tokenService.isTokenValid();
    if (isValid && !this.currentUserSubject.value) {
      this.loadStoredUser();
    }
    return isValid;
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
        'propertyadmin',
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

    if (role === 'admin') {
      return '/admin/dashboard';
    }

    if (role === 'storekeeper') {
      return '/storekeeper/dashboard';
    }

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
