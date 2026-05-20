/** User object persisted in localStorage under key `user`. */
export interface StoredUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  roles: string[];
  permissions: string[];
  isActive?: boolean;
  profileImageUrl?: string;
  /** @deprecated Use profileImageUrl — kept for backward compatibility */
  photoUrl?: string;
  department?: string;
  employeeCode?: string;
  position?: string;
  phone?: string;
  joinDate?: string;
}

export const USER_STORAGE_KEY = 'user';
export const PROFILE_IMAGE_PREFIX = 'pas_profile_';
export const DEFAULT_AVATAR_PATH = 'assets/images/default-avatar.svg';
