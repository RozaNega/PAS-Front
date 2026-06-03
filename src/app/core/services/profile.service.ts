import { Injectable } from '@angular/core';
import { Observable, map, tap, throwError, from } from 'rxjs';
import { ApiService } from './api.service';
import { CurrentUserService } from './current-user.service';
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
