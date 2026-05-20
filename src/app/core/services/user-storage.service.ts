import { Injectable } from '@angular/core';
import {
  PROFILE_IMAGE_PREFIX,
  StoredUser,
  USER_STORAGE_KEY,
} from '../models/stored-user.model';
import { isInlineImageData } from '../utils/profile-image.util';

const LEGACY_PHOTO_PREFIX = 'user_photo_';
const LEGACY_USER_DATA_PREFIX = 'user_data_';
const LEGACY_CURRENT_PHOTO_KEY = 'current_user_photo';

@Injectable({ providedIn: 'root' })
export class UserStorageService {
  constructor() {
    this.pruneOversizedEntries();
  }

  private get canUseStorage(): boolean {
    return typeof localStorage !== 'undefined';
  }

  readUser(): StoredUser | null {
    if (!this.canUseStorage) {
      return null;
    }
    try {
      const raw = localStorage.getItem(USER_STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const user = JSON.parse(raw) as StoredUser;
      return this.attachProfileFromDedicatedKey(user);
    } catch {
      return null;
    }
  }

  /**
   * Persist user metadata only — large data-URL images are stored separately
   * under pas_profile_{userId} to avoid localStorage quota errors.
   */
  writeUser(user: StoredUser): void {
    if (!this.canUseStorage) {
      return;
    }

    const existing = this.readUserMetadataOnly();
    const merged: StoredUser = { ...existing, ...user };
    const slim = this.stripInlineImageFromUser(merged);

    this.safeSetItem(USER_STORAGE_KEY, JSON.stringify(slim));
  }

  loadProfileImage(userId: string, username?: string, email?: string): string | null {
    if (!this.canUseStorage) {
      return null;
    }

    const primaryKey = userId || username || email;
    if (!primaryKey) {
      return null;
    }

    const dedicated = localStorage.getItem(`${PROFILE_IMAGE_PREFIX}${primaryKey}`);
    if (dedicated) {
      return dedicated;
    }

    const metadata = this.readUserMetadataOnly();
    if (metadata) {
      const url = metadata.profileImageUrl ?? metadata.photoUrl;
      if (url && !isInlineImageData(url)) {
        return url;
      }
    }

    return null;
  }

  saveProfileImage(
    userId: string,
    url: string | null,
    _username?: string,
    _email?: string,
  ): void {
    if (!this.canUseStorage || !userId) {
      return;
    }

    const storageKey = `${PROFILE_IMAGE_PREFIX}${userId}`;

    if (!url) {
      localStorage.removeItem(storageKey);
      return;
    }

    this.safeSetItem(storageKey, url);
  }

  /** Remove duplicate legacy keys that filled localStorage. */
  pruneOversizedEntries(): void {
    if (!this.canUseStorage) {
      return;
    }

    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) {
        continue;
      }

      const isLegacyPhoto =
        key.startsWith(LEGACY_PHOTO_PREFIX) ||
        key.startsWith(LEGACY_USER_DATA_PREFIX) ||
        key === LEGACY_CURRENT_PHOTO_KEY;

      if (isLegacyPhoto) {
        keysToRemove.push(key);
        continue;
      }

      if (key.startsWith(PROFILE_IMAGE_PREFIX) && key !== `${PROFILE_IMAGE_PREFIX}`) {
        const value = localStorage.getItem(key);
        if (value && value.length > 200_000) {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));

    try {
      const raw = localStorage.getItem(USER_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const user = JSON.parse(raw) as StoredUser;
      const img = user.profileImageUrl ?? user.photoUrl;
      if (img && isInlineImageData(img) && img.length > 20_000) {
        const slim = this.stripInlineImageFromUser(user);
        this.safeSetItem(USER_STORAGE_KEY, JSON.stringify(slim));
        if (user.id && img.length < 200_000) {
          this.safeSetItem(`${PROFILE_IMAGE_PREFIX}${user.id}`, img);
        }
      }
    } catch {
      /* ignore */
    }
  }

  private readUserMetadataOnly(): StoredUser | null {
    try {
      const raw = localStorage.getItem(USER_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as StoredUser) : null;
    } catch {
      return null;
    }
  }

  private attachProfileFromDedicatedKey(user: StoredUser): StoredUser {
    if (!user.id) {
      return user;
    }

    const dedicated = localStorage.getItem(`${PROFILE_IMAGE_PREFIX}${user.id}`);
    const httpUrl = user.profileImageUrl ?? user.photoUrl;
    const image = dedicated ?? (httpUrl && !isInlineImageData(httpUrl) ? httpUrl : dedicated);

    if (!image) {
      return user;
    }

    return { ...user, profileImageUrl: image, photoUrl: image };
  }

  private stripInlineImageFromUser(user: StoredUser): StoredUser {
    const img = user.profileImageUrl ?? user.photoUrl;
    if (!img || !isInlineImageData(img)) {
      return user;
    }

    const { profileImageUrl: _p, photoUrl: _o, ...rest } = user;
    return rest;
  }

  private safeSetItem(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`[UserStorage] Quota exceeded saving "${key}". Pruning legacy data…`, error);
      this.pruneOversizedEntries();
      try {
        localStorage.setItem(key, value);
        return true;
      } catch {
        console.error(`[UserStorage] Could not save "${key}" — storage full.`);
        return false;
      }
    }
  }
}
