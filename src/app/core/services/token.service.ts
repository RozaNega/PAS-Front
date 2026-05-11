import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface DecodedToken {
  sub: string;
  unique_name: string;
  email: string;
  role: string;
  exp: number;
  iat: number;
  iss: string;
  aud: string;
  fullName?: string;
  FullName?: string;
  name?: string;
  given_name?: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private tokenKey = environment.tokenKey;
  private refreshTokenKey = environment.refreshTokenKey;
  private userKey = environment.userKey;

  private get canUseStorage(): boolean {
    return typeof localStorage !== 'undefined';
  }

  // Token methods
  setToken(token: string): void {
    if (token && this.canUseStorage) {
      localStorage.setItem(this.tokenKey, token);
    }
  }

  getToken(): string | null {
    if (!this.canUseStorage) {
      return null;
    }
    return localStorage.getItem(this.tokenKey);
  }

  removeToken(): void {
    if (!this.canUseStorage) {
      return;
    }
    localStorage.removeItem(this.tokenKey);
  }

  // Refresh token methods
  setRefreshToken(token: string): void {
    if (token && this.canUseStorage) {
      localStorage.setItem(this.refreshTokenKey, token);
    }
  }

  getRefreshToken(): string | null {
    if (!this.canUseStorage) {
      return null;
    }
    return localStorage.getItem(this.refreshTokenKey);
  }

  removeRefreshToken(): void {
    if (!this.canUseStorage) {
      return;
    }
    localStorage.removeItem(this.refreshTokenKey);
  }

  // User methods
  setUser(user: any): void {
    if (user && this.canUseStorage) {
      localStorage.setItem(this.userKey, JSON.stringify(user));
    }
  }

  getUser(): any | null {
    if (!this.canUseStorage) {
      return null;
    }
    const user = localStorage.getItem(this.userKey);
    return user ? JSON.parse(user) : null;
  }

  removeUser(): void {
    if (!this.canUseStorage) {
      return;
    }
    localStorage.removeItem(this.userKey);
  }

  // Clear all
  clear(): void {
    this.removeToken();
    this.removeRefreshToken();
    this.removeUser();
  }

  // Token validation
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const decoded = this.decodeToken(token);
      if (!decoded) return true;
      
      const expirationDate = new Date(decoded.exp * 1000);
      return expirationDate < new Date();
    } catch {
      return true;
    }
  }

  decodeToken(token: string): DecodedToken | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  getDecodedToken(): DecodedToken | null {
    const token = this.getToken();
    if (!token) return null;
    return this.decodeToken(token);
  }

  getTokenExpirationDate(): Date | null {
    const decoded = this.getDecodedToken();
    if (!decoded) return null;
    return new Date(decoded.exp * 1000);
  }

  isTokenValid(): boolean {
    const token = this.getToken();
    if (!token) return false;
    return !this.isTokenExpired();
  }

  // Get claims from token
  getUserId(): string | null {
    const decoded = this.getDecodedToken();
    return decoded?.sub || null;
  }

  getUsername(): string | null {
    const decoded = this.getDecodedToken();
    return decoded?.unique_name || null;
  }

  getUserEmail(): string | null {
    const decoded = this.getDecodedToken();
    return decoded?.email || null;
  }

  getUserRole(): string | null {
    const decoded = this.getDecodedToken();
    return decoded?.role || null;
  }

  // Token refresh
  shouldRefreshToken(): boolean {
    const expirationDate = this.getTokenExpirationDate();
    if (!expirationDate) return true;
    
    // Refresh if token expires in less than 5 minutes
    const fiveMinutesFromNow = new Date();
    fiveMinutesFromNow.setMinutes(fiveMinutesFromNow.getMinutes() + 5);
    
    return expirationDate < fiveMinutesFromNow;
  }
}


