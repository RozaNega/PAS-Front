/**
 * Utility functions for debugging photo persistence issues
 */

export class PhotoDebugUtil {
  /**
   * Log all photo-related localStorage entries
   */
  static logPhotoStorage(): void {
    console.group('📸 Photo Storage Debug');
    
    const photoKeys: string[] = [];
    const userDataKeys: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        if (key.startsWith('user_photo_') || key === 'current_user_photo') {
          photoKeys.push(key);
        } else if (key.startsWith('user_data_')) {
          userDataKeys.push(key);
        }
      }
    }
    
    console.log('Photo Keys Found:', photoKeys.length);
    photoKeys.forEach(key => {
      const value = localStorage.getItem(key);
      console.log(`  ${key}: ${value ? `${value.substring(0, 50)}...` : 'null'}`);
    });
    
    console.log('User Data Keys Found:', userDataKeys.length);
    userDataKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          const parsed = JSON.parse(value);
          console.log(`  ${key}:`, {
            id: parsed.id,
            username: parsed.username,
            hasPhoto: !!parsed.photoUrl,
            photoPreview: parsed.photoUrl ? `${parsed.photoUrl.substring(0, 50)}...` : 'none'
          });
        } catch (e) {
          console.log(`  ${key}: Invalid JSON`);
        }
      }
    });
    
    console.groupEnd();
  }

  /**
   * Clear all photo-related storage (for testing)
   */
  static clearAllPhotoStorage(): void {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('user_photo_') || key === 'current_user_photo' || key.startsWith('user_data_'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`🗑️ Cleared ${keysToRemove.length} photo storage entries`);
  }

  /**
   * Test photo persistence for a specific user
   */
  static testPhotoPersistence(userId: string, username: string, email: string | null): void {
    console.group(`🧪 Testing Photo Persistence for User: ${userId}`);
    
    const testPhotoData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    // Save test photo
    localStorage.setItem(`user_photo_${userId}`, testPhotoData);
    localStorage.setItem(`user_photo_${username}`, testPhotoData);
    localStorage.setItem('current_user_photo', testPhotoData);
    if (email) {
      localStorage.setItem(`user_photo_${email}`, testPhotoData);
    }
    
    console.log('✅ Test photo saved with multiple keys');
    
    // Test retrieval
    const retrievedById = localStorage.getItem(`user_photo_${userId}`);
    const retrievedByUsername = localStorage.getItem(`user_photo_${username}`);
    const retrievedCurrent = localStorage.getItem('current_user_photo');
    const retrievedByEmail = email ? localStorage.getItem(`user_photo_${email}`) : null;
    
    console.log('Retrieval Results:');
    console.log(`  By ID (${userId}): ${retrievedById ? '✅ Found' : '❌ Not found'}`);
    console.log(`  By Username (${username}): ${retrievedByUsername ? '✅ Found' : '❌ Not found'}`);
    console.log(`  Current Photo: ${retrievedCurrent ? '✅ Found' : '❌ Not found'}`);
    if (email) {
      console.log(`  By Email (${email}): ${retrievedByEmail ? '✅ Found' : '❌ Not found'}`);
    }
    
    // Clean up test data
    localStorage.removeItem(`user_photo_${userId}`);
    localStorage.removeItem(`user_photo_${username}`);
    localStorage.removeItem('current_user_photo');
    if (email) {
      localStorage.removeItem(`user_photo_${email}`);
    }
    
    console.log('🧹 Test data cleaned up');
    console.groupEnd();
  }

  /**
   * Get storage usage statistics
   */
  static getStorageStats(): { totalKeys: number; photoKeys: number; userDataKeys: number; totalSize: number } {
    let totalKeys = 0;
    let photoKeys = 0;
    let userDataKeys = 0;
    let totalSize = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        totalKeys++;
        const value = localStorage.getItem(key) || '';
        totalSize += key.length + value.length;
        
        if (key.startsWith('user_photo_') || key === 'current_user_photo') {
          photoKeys++;
        } else if (key.startsWith('user_data_')) {
          userDataKeys++;
        }
      }
    }
    
    return { totalKeys, photoKeys, userDataKeys, totalSize };
  }
}

// Make it available globally for debugging in browser console
if (typeof window !== 'undefined') {
  (window as any).PhotoDebugUtil = PhotoDebugUtil;
}