import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, take } from 'rxjs';
import { DEFAULT_AVATAR_PATH, StoredUser, USER_STORAGE_KEY } from '../models/stored-user.model';
import { TokenService } from './token.service';
import { UserStorageService } from './user-storage.service';
import { EmployeesService } from './employees.service';
import { isInlineImageData } from '../utils/profile-image.util';

export type CurrentUser = StoredUser;

@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  private readonly currentUserSubject = new BehaviorSubject<CurrentUser | null>(null);
  readonly currentUser$ = this.currentUserSubject.asObservable();

  /** Raw profile image URL (null when none). Use getDisplayUrl() for img src. */
  readonly profileImageUrl$ = this.currentUser$.pipe(
    map((user) => user?.profileImageUrl ?? user?.photoUrl ?? null),
  );

  /** Prevents repeated Employees/by-user calls per user id in one session. */
  private lastEmployeeProfileHydrateUserId = '';

  constructor(
    private readonly tokenService: TokenService,
    private readonly userStorage: UserStorageService,
    private readonly employeesService: EmployeesService,
  ) {
    this.hydrateFromStorage();
  }

  /** Backwards-compatible API used by older callers */
  loadCurrentUser(): void {
    this.hydrateFromStorage();
  }

  getCurrentUser(): Observable<CurrentUser | null> {
    return this.currentUser$;
  }

  getCurrentUserValue(): CurrentUser | null {
    return this.currentUserSubject.value;
  }

  getUserId(): string | null {
    return this.currentUserSubject.value?.id ?? null;
  }

  getProfileImageUrl(): string | null {
    const user = this.currentUserSubject.value;
    return user?.profileImageUrl ?? user?.photoUrl ?? null;
  }

  getDisplayUrl(url?: string | null): string {
    if (!url?.trim()) {
      return DEFAULT_AVATAR_PATH;
    }

    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }

    const separator = url.includes('?') ? '&' : '?';
    return `${url.split('?')[0]}${separator}t=${Date.now()}`;
  }

  setUser(user: CurrentUser | null): void {
    if (!user) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
      this.lastEmployeeProfileHydrateUserId = '';
      this.currentUserSubject.next(null);
      return;
    }

    let normalized = this.normalizeUser(user as Partial<StoredUser> & Record<string, unknown>);
    normalized = this.applyPhoneFromJwtIfMissing(normalized);
    const withPhoto = this.mergeStoredProfileImage(normalized);
    const img = withPhoto.profileImageUrl ?? withPhoto.photoUrl;
    if (img && isInlineImageData(img)) {
      this.userStorage.saveProfileImage(withPhoto.id, img);
    }
    this.userStorage.writeUser(withPhoto);
    this.tokenService.setUser(this.stripForTokenStorage(withPhoto));
    this.currentUserSubject.next(withPhoto);
    this.scheduleEmployeeProfileHydrationIfNeeded(withPhoto);
  }

  updateUser(data: Partial<CurrentUser>): void {
    const current = this.ensureCurrentUser();
    if (!current) {
      return;
    }

    const updated = this.mergeStoredProfileImage({ ...current, ...data });
    this.setUser(updated);
  }

  updateProfileImage(url: string | null): void {
    const current = this.ensureCurrentUser();
    if (!current) {
      console.warn('[CurrentUserService] Cannot save profile image — no user session.');
      return;
    }

    const profileImageUrl = url?.trim() || undefined;
    const updated: CurrentUser = {
      ...current,
      profileImageUrl,
      photoUrl: profileImageUrl,
    };

    if (profileImageUrl && isInlineImageData(profileImageUrl)) {
      this.userStorage.saveProfileImage(updated.id, profileImageUrl);
    } else if (!profileImageUrl) {
      this.userStorage.saveProfileImage(updated.id, null);
    }

    this.userStorage.writeUser(updated);
    this.tokenService.setUser(this.stripForTokenStorage(updated));
    this.currentUserSubject.next(updated);
  }

  private stripForTokenStorage(user: CurrentUser): CurrentUser {
    const img = user.profileImageUrl ?? user.photoUrl;
    if (!img || !isInlineImageData(img)) {
      return user;
    }
    const { profileImageUrl: _p, photoUrl: _o, ...rest } = user;
    return rest;
  }

  clear(): void {
    const user = this.currentUserSubject.value;
    const image = user?.profileImageUrl ?? user?.photoUrl;
    if (user?.id && image && isInlineImageData(image)) {
      this.userStorage.saveProfileImage(user.id, image);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
    this.lastEmployeeProfileHydrateUserId = '';
    this.currentUserSubject.next(null);
  }

  reload(): void {
    this.hydrateFromStorage();
  }

  /** @deprecated */
  reloadUserData(): void {
    this.reload();
  }

  /** @deprecated */
  updatePhoto(url: string | null): void {
    this.updateProfileImage(url);
  }

  hydrateFromStorage(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    let user: CurrentUser | null =
      this.userStorage.readUser() ??
      (this.tokenService.getUser()
        ? this.normalizeUser(this.tokenService.getUser() as Record<string, unknown>)
        : null);

    if (!user && this.tokenService.isTokenValid()) {
      user = this.buildUserFromToken();
    }

    if (user) {
      let normalized = this.normalizeUser(user as Partial<StoredUser> & Record<string, unknown>);
      normalized = this.applyPhoneFromJwtIfMissing(normalized);
      const merged = this.mergeStoredProfileImage(normalized);
      this.currentUserSubject.next(merged);
      this.userStorage.writeUser(merged);
      this.tokenService.setUser(merged);
      this.scheduleEmployeeProfileHydrationIfNeeded(merged);
    }
  }

  private ensureCurrentUser(): CurrentUser | null {
    const existing = this.currentUserSubject.value;
    if (existing?.id) {
      return existing;
    }

    this.hydrateFromStorage();
    return this.currentUserSubject.value;
  }

  /**
   * Fetch all missing profile fields (department, employeeCode, phone, position, joinDate)
   * from `Employees/by-user/{userId}` once per session per user id.
   */
  private scheduleEmployeeProfileHydrationIfNeeded(user: CurrentUser): void {
    const id = user.id?.trim();
    if (!id) return;

    // Skip if all key profile fields are already set
    const allPresent = user.phone?.trim() && user.department?.trim() && user.employeeCode?.trim();
    if (allPresent) return;

    // Prevent duplicate calls for the same user in one session
    if (this.lastEmployeeProfileHydrateUserId === id) return;
    this.lastEmployeeProfileHydrateUserId = id;

    this.employeesService
      .getByUserId(id)
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          const d = res.data as any;
          if (!d) return;

          // Build a partial update with only the fields we got back and the user is still missing
          const update: Partial<CurrentUser> = {};

          const phone =
            d.phone?.trim() ||
            d.Phone?.trim() ||
            d.phoneNumber?.trim() ||
            d.PhoneNumber?.trim() ||
            d.mobile?.trim() ||
            this.extractContactPhone(d as Record<string, unknown>);
          if (phone && !user.phone?.trim()) {
            update.phone = phone;
          }

          const department = d.department?.trim() || d.Department?.trim();
          if (department && !user.department?.trim()) {
            update.department = department;
          }

          const employeeCode =
            d.employeeCode?.trim() || d.EmployeeCode?.trim() || d.employee_code?.trim();
          if (employeeCode && !user.employeeCode?.trim()) {
            update.employeeCode = employeeCode;
          }

          const position =
            d.position?.trim() || d.Position?.trim() || d.jobTitle?.trim() || d.JobTitle?.trim();
          if (position && !user.position?.trim()) {
            update.position = position;
          }

          const joinDate =
            d.joinDate?.trim() || d.JoinDate?.trim() || d.hireDate?.trim() || d.HireDate?.trim();
          if (joinDate && !user.joinDate?.trim()) {
            update.joinDate = joinDate;
          }

          if (Object.keys(update).length > 0) {
            this.updateUser(update);
          }
        },
        error: () => {},
      });
  }

  private mergeStoredProfileImage(user: CurrentUser): CurrentUser {
    const stored = this.userStorage.loadProfileImage(user.id, user.username, user.email);
    const image = user.profileImageUrl ?? user.photoUrl ?? stored ?? undefined;

    if (!image) {
      return user;
    }

    return { ...user, profileImageUrl: image, photoUrl: image };
  }

  private buildUserFromToken(): CurrentUser | null {
    const decoded = this.tokenService.getDecodedToken();
    if (!decoded) {
      return null;
    }

    const roles = Array.isArray(decoded.role) ? decoded.role : decoded.role ? [decoded.role] : [];

    return this.normalizeUser({
      ...(decoded as unknown as Record<string, unknown>),
      id: decoded.sub || '',
      username: decoded.unique_name || decoded.name || '',
      fullName: decoded.fullName || decoded.FullName || decoded.name || '',
      email: decoded.email || '',
      roles,
      permissions: [],
    });
  }

  /** When login payload omits phone, JWT claims often still carry it — merge into stored user. */
  private applyPhoneFromJwtIfMissing(user: CurrentUser): CurrentUser {
    if (user.phone?.trim()) {
      return user;
    }
    const decoded = this.tokenService.getDecodedToken();
    if (!decoded) {
      return user;
    }
    const phone = this.extractContactPhone(decoded as unknown as Record<string, unknown>);
    return phone?.trim() ? { ...user, phone: phone.trim() } : user;
  }

  /** Collect phone/mobile from nested API user objects and JWT claim shapes. */
  private extractContactPhone(
    raw: unknown,
    visited = new WeakSet<object>(),
    depth = 0,
  ): string | undefined {
    if (depth > 5 || raw == null || typeof raw !== 'object') {
      return undefined;
    }
    if (visited.has(raw)) {
      return undefined;
    }
    visited.add(raw);

    const r = raw as Record<string, unknown>;
    const DIRECT_KEYS = [
      'phone',
      'Phone',
      'mobile',
      'Mobile',
      'phoneNumber',
      'PhoneNumber',
      'mobilePhone',
      'MobilePhone',
      'cellPhone',
      'CellPhone',
      'contactNumber',
      'ContactNumber',
      'telephone',
      'Telephone',
      'primaryPhone',
      'PrimaryPhone',
      'tel',
      'Tel',
      'sms',
      'phone_number',
      'mobile_phone',
    ];

    for (const k of DIRECT_KEYS) {
      const v = r[k];
      if (typeof v === 'string') {
        const t = v.trim();
        if (t) return t;
      }
      if (typeof v === 'number' && Number.isFinite(v)) {
        const s = String(v);
        if (s.trim()) return s.trim();
      }
    }

    const NEST_KEYS = [
      'employee',
      'Employee',
      'profile',
      'Profile',
      'user',
      'User',
      'userDto',
      'UserDto',
      'personalInfo',
      'PersonalInfo',
      'data',
      'Data',
    ];
    for (const key of NEST_KEYS) {
      const child = r[key];
      if (child && typeof child === 'object') {
        const found = this.extractContactPhone(child, visited, depth + 1);
        if (found) return found;
      }
    }

    return undefined;
  }

  private normalizeUser(raw: Partial<StoredUser> | Record<string, unknown>): CurrentUser {
    const r = raw as Record<string, unknown>;
    const roles =
      (r['roles'] as string[]) ??
      (r['Roles'] as string[]) ??
      (r['role'] ? [String(r['role'])] : []);

    return {
      id: String(r['id'] ?? r['Id'] ?? r['sub'] ?? ''),
      username: String(r['username'] ?? r['UserName'] ?? ''),
      fullName: String(r['fullName'] ?? r['FullName'] ?? r['username'] ?? r['UserName'] ?? 'User'),
      email: String(r['email'] ?? r['Email'] ?? ''),
      roles,
      permissions: (r['permissions'] as string[]) ?? (r['Permissions'] as string[]) ?? [],
      isActive: r['isActive'] as boolean | undefined,
      profileImageUrl: (r['profileImageUrl'] as string) ?? (r['photoUrl'] as string) ?? undefined,
      photoUrl: (r['profileImageUrl'] as string) ?? (r['photoUrl'] as string) ?? undefined,
      department: r['department'] as string | undefined,
      employeeCode: r['employeeCode'] as string | undefined,
      position: r['position'] as string | undefined,
      phone:
        (
          (r['phone'] ?? r['Phone'] ?? r['phoneNumber'] ?? r['PhoneNumber']) as string | undefined
        )?.trim() || this.extractContactPhone(r),
      joinDate: r['joinDate'] as string | undefined,
    };
  }
}
