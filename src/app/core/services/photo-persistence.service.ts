import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PhotoPersistenceService {
  private readonly PHOTO_KEY_PREFIX = 'user_photo_';
  private readonly CURRENT_PHOTO_KEY = 'current_user_photo';
  private readonly USER_DATA_PREFIX = 'user_data_';

  /**
   * Save user photo with multiple keys for maximum persistence
   */
  savePhoto(userId: string, username: string, email: string | null, photoBase64: string): void {
    try {
      // Save with multiple keys
      localStorage.setItem(`${this.PHOTO_KEY_PREFIX}${userId}`, photoBase64);
      localStorage.setItem(`${this.PHOTO_KEY_PREFIX}${username}`, photoBase64);
      localStorage.setItem(this.CURRENT_PHOTO_KEY, photoBase64);
      
      if (email) {
        localStorage.setItem(`${this.PHOTO_KEY_PREFIX}${email}`, photoBase64);
      }

      // Also save in user data
      const existingUserData = this.getUserData(userId);
      const updatedUserData = { ...existingUserData, photoUrl: photoBase64 };
      localStorage.setItem(`${this.USER_DATA_PREFIX}${userId}`, JSON.stringify(updatedUserData));

      console.log('Photo saved with persistence service for user:', userId);
    } catch (error) {
      console.error('Failed to save photo to localStorage:', error);
    }
  }

  /**
   * Load user photo with fallback logic
   */
  loadPhoto(userId: string, username: string, email: string | null): string | null {
    try {
      // Try multiple keys in order of preference
      let photo = localStorage.getItem(`${this.PHOTO_KEY_PREFIX}${userId}`);
      
      if (!photo && username) {
        photo = localStorage.getItem(`${this.PHOTO_KEY_PREFIX}${username}`);
      }
      
      if (!photo && email) {
        photo = localStorage.getItem(`${this.PHOTO_KEY_PREFIX}${email}`);
      }
      
      if (!photo) {
        photo = localStorage.getItem(this.CURRENT_PHOTO_KEY);
      }
      
      // Try from user data as last resort
      if (!photo) {
        const userData = this.getUserData(userId);
        photo = userData?.photoUrl || null;
      }

      if (photo) {
        console.log('Photo loaded with persistence service for user:', userId);
      }

      return photo;
    } catch (error) {
      console.error('Failed to load photo from localStorage:', error);
      return null;
    }
  }

  /**
   * Remove user photo from all storage locations
   */
  removePhoto(userId: string, username: string, email: string | null): void {
    try {
      localStorage.removeItem(`${this.PHOTO_KEY_PREFIX}${userId}`);
      localStorage.removeItem(`${this.PHOTO_KEY_PREFIX}${username}`);
      localStorage.removeItem(this.CURRENT_PHOTO_KEY);
      
      if (email) {
        localStorage.removeItem(`${this.PHOTO_KEY_PREFIX}${email}`);
      }

      // Update user data
      const existingUserData = this.getUserData(userId);
      if (existingUserData) {
        delete existingUserData.photoUrl;
        localStorage.setItem(`${this.USER_DATA_PREFIX}${userId}`, JSON.stringify(existingUserData));
      }

      console.log('Photo removed with persistence service for user:', userId);
    } catch (error) {
      console.error('Failed to remove photo from localStorage:', error);
    }
  }

  /**
   * Get user data from localStorage
   */
  private getUserData(userId: string): any {
    try {
      const data = localStorage.getItem(`${this.USER_DATA_PREFIX}${userId}`);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Failed to parse user data:', error);
      return {};
    }
  }

  /**
   * Check if photo exists for user
   */
  hasPhoto(userId: string, username: string, email: string | null): boolean {
    return this.loadPhoto(userId, username, email) !== null;
  }

  /**
   * Get all photo keys for debugging
   */
  getPhotoKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(this.PHOTO_KEY_PREFIX) || key === this.CURRENT_PHOTO_KEY)) {
        keys.push(key);
      }
    }
    return keys;
  }

  /**
   * Clear all photo data (for logout/cleanup)
   */
  clearAllPhotos(): void {
    const keysToRemove = this.getPhotoKeys();
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log('All photos cleared from localStorage');
  }
}