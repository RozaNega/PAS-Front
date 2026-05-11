import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TokenService } from './token.service';

export interface CurrentUser {
  id: string;
  username: string;
  email: string;
  role: string;
  photoUrl?: string;
  fullName?: string;
  department?: string;
  employeeCode?: string;
  position?: string;
  phone?: string;
  joinDate?: string;
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
      const storedPhoto = localStorage.getItem(`user_photo_${decoded.sub}`);
      const savedUser = this.tokenService.getUser();
      // Try to extract name from saved user object or common JWT claims
      const fullName = savedUser?.fullName || decoded.fullName || decoded.FullName || decoded.name || decoded.given_name || decoded.unique_name;
      this.currentUserSubject.next({
        id: decoded.sub,
        username: decoded.unique_name,
        email: decoded.email || '',
        role: decoded.role || '',
        photoUrl: storedPhoto || undefined,
        fullName: fullName
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

  updatePhoto(url: string | null): void {
    const current = this.currentUserSubject.value;
    if (current) {
      const updated = { ...current, photoUrl: url || undefined };
      this.currentUserSubject.next(updated);
      localStorage.setItem(`user_data_${current.id}`, JSON.stringify(updated));
      if (url) {
        localStorage.setItem(`user_photo_${current.id}`, url);
      } else {
        localStorage.removeItem(`user_photo_${current.id}`);
      }
    }
  }

  updateUser(data: Partial<CurrentUser>): void {
    const current = this.currentUserSubject.value;
    if (current) {
      const updated = { ...current, ...data };
      this.currentUserSubject.next(updated);
      localStorage.setItem(`user_data_${current.id}`, JSON.stringify(updated));
    }
  }

  clear(): void {
    this.currentUserSubject.next(null);
  }
}


