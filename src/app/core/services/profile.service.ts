import { Injectable } from '@angular/core';
import { Observable, map, tap, throwError, from, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { CurrentUserService, CurrentUser } from './current-user.service';
import { ApiResponseModel } from '../models/api-response.model';
import { DEFAULT_AVATAR_PATH } from '../models/stored-user.model';
import {
  compressProfileImageDataUrl,
  compressProfileImageFile,
} from '../utils/profile-image.util';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  constructor(
    private readonly apiService: ApiService,
    private readonly currentUserService: CurrentUserService,
  ) {}

  fetchProfileFromApi(): Observable<any> {
    const userId = this.currentUserService.getUserId();
    if (!userId) {
      return throwError(() => new Error('User not found'));
    }
    return this.apiService.get<any>(`Users/${userId}`).pipe(
      map(res => res.data)
    );
  }

  uploadProfilePhotoToApi(file: File): Observable<string> {
    return this.uploadProfileImage(file);
  }

  updateProfileViaApi(data: Partial<Record<string, unknown>>): Observable<{ succeeded: boolean; message?: string }> {
    const user = this.currentUserService.getCurrentUserValue();
    const userId = user?.id;
    if (!userId) {
      return of({ succeeded: false, message: 'User session not found. Please log in again.' });
    }
    const body = {
      ...data,
      id: userId,
      userId,
      username: (data['username'] as string) || user?.username || '',
      name: data['fullName'] || user?.fullName || '',
      phoneNumber: data['phone'] as string,
      joinDate: user?.joinDate || undefined,
      isActive: true,
    };
    return this.apiService.put(`users/${userId}`, body).pipe(
      tap((res) => {
        if (res.success) {
          this.currentUserService.updateUser(data as Partial<CurrentUser>);
        }
      }),
      map(res => ({ succeeded: res.success, message: res.message })),
      catchError((err) => {
        console.error('[ProfileService] updateProfileViaApi error:', err);
        let detail = err.error?.message || err.message || '';
        if (err.error?.errors) {
          const e = err.error.errors;
          detail = Array.isArray(e) ? e.join('; ') : typeof e === 'string' ? e : JSON.stringify(e);
        }
        const msg =
          err.status === 404
            ? 'Profile update endpoint not found'
            : err.status === 400
              ? `Invalid data: ${detail}`
              : err.status === 401
                ? 'Session expired. Please log in again.'
                : `API error (${err.status}): ${err.statusText}`;
        return of({ succeeded: false, message: msg });
      }),
    );
  }

  uploadProfileImage(file: File, userId?: string): Observable<string> {
    const id = userId ?? this.currentUserService.getUserId();
    if (!id) {
      return throwError(() => new Error('User session not found. Please log in again.'));
    }

    return this.apiService.uploadProfilePhoto(id, file).pipe(
      map((response) => this.extractImageUrl(response)),
      tap((url) => {
        if (this.isUsableImageUrl(url)) {
          this.currentUserService.updateProfileImage(url);
        }
      }),
    );
  }

  /** Compress then persist — avoids localStorage quota errors. */
  applyLocalProfileImage(url: string): void {
    if (!url?.trim()) {
      return;
    }

    from(compressProfileImageDataUrl(url)).subscribe({
      next: (compressed) => this.currentUserService.updateProfileImage(compressed),
      error: () => this.currentUserService.updateProfileImage(url),
    });
  }

  applyProfileImage(url: string): void {
    this.applyLocalProfileImage(url);
  }

  applyLocalProfileImageFromFile(file: File): Observable<string> {
    return from(compressProfileImageFile(file)).pipe(
      tap((compressed) => this.currentUserService.updateProfileImage(compressed)),
    );
  }

  removeProfileImage(userId?: string): Observable<void> {
    const id = userId ?? this.currentUserService.getUserId();
    if (!id) {
      return throwError(() => new Error('User not found.'));
    }

    return this.apiService.deleteProfilePhoto(id).pipe(
      tap(() => this.currentUserService.updateProfileImage(null)),
      map(() => undefined),
    );
  }

  getDisplayUrl(url?: string | null): string {
    return this.currentUserService.getDisplayUrl(url);
  }

  getDefaultAvatar(): string {
    return DEFAULT_AVATAR_PATH;
  }

  hydrateProfileFromStorage(): string | null {
    this.currentUserService.reload();
    return this.currentUserService.getProfileImageUrl();
  }

  private isUsableImageUrl(url: string): boolean {
    const trimmed = url?.trim();
    if (!trimmed) {
      return false;
    }
    return (
      trimmed.startsWith('data:') ||
      trimmed.startsWith('blob:') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('/')
    );
  }

  private extractImageUrl(response: unknown): string {
    if (typeof response === 'string' && response.trim()) {
      return response.trim();
    }

    if (response && typeof response === 'object') {
      const r = response as Record<string, unknown>;
      const data = r['data'] ?? r['Data'];
      if (typeof data === 'string' && data.trim()) {
        return data.trim();
      }
      if (data && typeof data === 'object') {
        const d = data as Record<string, unknown>;
        const url =
          d['profileImageUrl'] ?? d['photoUrl'] ?? d['url'] ?? d['imageUrl'];
        if (typeof url === 'string' && url.trim()) {
          return url.trim();
        }
      }
      const direct =
        r['profileImageUrl'] ?? r['photoUrl'] ?? r['url'] ?? r['imageUrl'];
      if (typeof direct === 'string' && direct.trim()) {
        return direct.trim();
      }
    }

    throw new Error('Upload succeeded but no image URL was returned.');
  }
}
