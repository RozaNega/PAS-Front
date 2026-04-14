import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { TokenService } from './token.service';

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
    private router: Router
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
    return this.apiService.post<AuthResponse>('Auth/login', request).pipe(
      tap(response => {
        if (response.succeeded) {
          this.tokenService.setToken(response.token);
          this.tokenService.setRefreshToken(response.refreshToken);
          this.tokenService.setUser(response.user);
          this.currentUserSubject.next(response.user);
        }
      })
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
    return roles.some(role => user.roles.includes(role));
  }

  hasAnyPermission(permissions: string[]): boolean {
    const user = this.getCurrentUser();
    if (!user?.permissions) return false;
    return permissions.some(perm => user.permissions.includes(perm));
  }
}


