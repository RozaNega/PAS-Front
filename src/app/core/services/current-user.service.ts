import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TokenService } from './token.service';

export interface CurrentUser {
  id: string;
  username: string;
  email: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  private currentUserSubject = new BehaviorSubject<CurrentUser | null>(null);

  constructor(private tokenService: TokenService) {
    this.loadCurrentUser();
  }

  private loadCurrentUser(): void {
    const decoded = this.tokenService.getDecodedToken();
    if (decoded) {
      this.currentUserSubject.next({
        id: decoded.sub,
        username: decoded.unique_name,
        email: decoded.email || '',
        role: decoded.role || ''
      });
    }
  }

  getCurrentUser(): Observable<CurrentUser | null> {
    return this.currentUserSubject.asObservable();
  }

  getCurrentUserValue(): CurrentUser | null {
    return this.currentUserSubject.value;
  }

  getUserId(): string | null {
    return this.currentUserSubject.value?.id || null;
  }

  getUsername(): string | null {
    return this.currentUserSubject.value?.username || null;
  }

  getUserRole(): string | null {
    return this.currentUserSubject.value?.role || null;
  }

  isAdmin(): boolean {
    return this.currentUserSubject.value?.role === 'Admin';
  }

  isStoreOfficer(): boolean {
    return this.currentUserSubject.value?.role === 'StoreOfficer';
  }

  clear(): void {
    this.currentUserSubject.next(null);
  }
}


