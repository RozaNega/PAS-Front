import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';

import { AuthResult, AuthSession, AuthUser } from './auth-result.model';
import {
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from './login-request.model';

interface StoredUser extends AuthUser {
  password: string;
  roleName: string;
}

interface PasswordResetToken {
  email: string;
  token: string;
  expiresAt: string;
}

export interface PendingUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  roleName: string;
  department: string;
  employeeCode: string;
  phoneNumber?: string;
  password: string;
  submittedAt: string;
}

const USERS_STORAGE_KEY = 'ecx-auth-users';
const SESSION_STORAGE_KEY = 'ecx-auth-session';
const RESET_TOKENS_STORAGE_KEY = 'ecx-auth-reset-tokens';
const PENDING_USERS_STORAGE_KEY = 'ecx-auth-pending-users';
const DEMO_EMAIL = 'demo@africom.local';
const DEMO_PASSWORD = 'Password123!';
const DEMO_DISPLAY_NAME = 'Demo Admin';

const demoUser: StoredUser = {
  id: 'user-demo',
  displayName: DEMO_DISPLAY_NAME,
  phoneNumber: '+251 911 000 000',
  email: DEMO_EMAIL,
  roleName: 'Admin',
  password: DEMO_PASSWORD,
};

@Injectable({
  providedIn: 'root',
})
export class AuthApi {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly usersSignal = signal<StoredUser[]>(this.loadUsers());
  private readonly sessionSignal = signal<AuthSession | null>(this.loadSession());
  private readonly resetTokensSignal = signal<PasswordResetToken[]>(this.loadResetTokens());
  private readonly pendingUsersSignal = signal<PendingUser[]>(this.loadPendingUsers());
  private readonly initialized = this.initializeStore();

  readonly session = computed(() => this.sessionSignal());
  readonly isAuthenticated = computed(() => this.sessionSignal() !== null);
  readonly activeUser = computed(() => this.sessionSignal()?.user ?? null);
  readonly knownUsers = computed(() =>
    this.usersSignal().map(({ password: _password, ...user }) => user),
  );
  readonly accountCount = computed(() => this.usersSignal().length);
  readonly pendingResetCount = computed(() => this.resetTokensSignal().length);
  readonly pendingRegistrations = computed(() => this.pendingUsersSignal());
  readonly pendingRegistrationsCount = computed(() => this.pendingUsersSignal().length);

  login(request: LoginRequest): AuthResult {
    const email = this.normalizeEmail(request.email);
    const user = this.usersSignal().find((entry) => entry.email === email);

    if (!user || user.password !== request.password) {
      return {
        success: false,
        message: 'Invalid email or password. Try the demo account if you need a quick start.',
      };
    }

    const session = this.createSession(user, request.rememberMe ?? false);
    this.sessionSignal.set(session);
    this.persistSession(session);

    return {
      success: true,
      message: `Welcome back, ${user.displayName}.`,
      session,
    };
  }

  register(request: RegisterRequest): AuthResult {
    const email = this.normalizeEmail(request.email);
    const roleName = request.roleName.trim();

    if (!request.acceptedTerms) {
      return {
        success: false,
        message: 'You must accept the terms to create a local demo account.',
      };
    }

    if (this.usersSignal().some((entry) => entry.email === email)) {
      return {
        success: false,
        message: 'An account already exists for that email address.',
      };
    }

    const newUser: StoredUser = {
      id: this.createId('user'),
      displayName: request.displayName.trim(),
      phoneNumber: request.phoneNumber?.trim() ?? '',
      email,
      roleName,
      password: request.password,
    };

    const nextUsers = [...this.usersSignal(), newUser];
    this.usersSignal.set(nextUsers);
    this.persistUsers(nextUsers);

    return {
      success: true,
      message: `Account created for ${newUser.displayName} as ${newUser.roleName}. You can sign in right away.`,
    };
  }

  registerPending(request: RegisterRequest): AuthResult {
    const email = this.normalizeEmail(request.email);

    if (this.usersSignal().some((entry) => entry.email === email)) {
      return { success: false, message: 'An account already exists for that email address.' };
    }

    const pendingUser: PendingUser = {
      id: this.createId('pending'),
      username: request.displayName.toLowerCase().replace(/\s+/g, '_'),
      fullName: request.displayName.trim(),
      email,
      roleName: request.roleName.trim(),
      department: '',
      employeeCode: '',
      phoneNumber: request.phoneNumber?.trim() ?? '',
      password: request.password,
      submittedAt: new Date().toISOString(),
    };

    const nextPending = [...this.pendingUsersSignal(), pendingUser];
    this.pendingUsersSignal.set(nextPending);
    this.persistPendingUsers(nextPending);

    return {
      success: true,
      message: 'Registration submitted for admin approval. You will be notified once approved.',
    };
  }

  getPendingRegistrations(): PendingUser[] {
    return this.pendingUsersSignal();
  }

  approvePendingRegistration(id: string): AuthResult {
    const pending = this.pendingUsersSignal().find((p) => p.id === id);
    if (!pending) {
      return { success: false, message: 'Pending registration not found.' };
    }

    const newUser: StoredUser = {
      id: this.createId('user'),
      displayName: pending.fullName,
      phoneNumber: pending.phoneNumber ?? '',
      email: pending.email,
      roleName: pending.roleName,
      password: pending.password,
    };

    const nextUsers = [...this.usersSignal(), newUser];
    this.usersSignal.set(nextUsers);
    this.persistUsers(nextUsers);

    const nextPending = this.pendingUsersSignal().filter((p) => p.id !== id);
    this.pendingUsersSignal.set(nextPending);
    this.persistPendingUsers(nextPending);

    return { success: true, message: `${pending.fullName} approved as ${pending.roleName}.` };
  }

  rejectPendingRegistration(id: string): AuthResult {
    const pending = this.pendingUsersSignal().find((p) => p.id === id);
    if (!pending) {
      return { success: false, message: 'Pending registration not found.' };
    }

    const nextPending = this.pendingUsersSignal().filter((p) => p.id !== id);
    this.pendingUsersSignal.set(nextPending);
    this.persistPendingUsers(nextPending);

    return { success: true, message: `${pending.fullName}'s registration has been rejected.` };
  }

  requestPasswordReset(request: ForgotPasswordRequest): AuthResult {
    const email = this.normalizeEmail(request.email);
    const user = this.usersSignal().find((entry) => entry.email === email);

    if (!user) {
      return {
        success: false,
        message: 'We could not find an account for that email address.',
      };
    }

    const token = this.createToken('reset');
    const resetRecord: PasswordResetToken = {
      email,
      token,
      expiresAt: this.createExpiry(30),
    };

    const nextTokens = [
      ...this.resetTokensSignal().filter((entry) => entry.email !== email),
      resetRecord,
    ];
    this.resetTokensSignal.set(nextTokens);
    this.persistResetTokens(nextTokens);

    return {
      success: true,
      message: `Reset token created for ${user.displayName}.`,
      resetToken: token,
    };
  }

  resetPassword(request: ResetPasswordRequest): AuthResult {
    const token = request.token.trim();
    const resetRecord = this.resetTokensSignal().find((entry) => entry.token === token);

    if (!resetRecord) {
      return {
        success: false,
        message: 'That reset token is invalid or has already been used.',
      };
    }

    if (new Date(resetRecord.expiresAt).getTime() < Date.now()) {
      this.removeResetToken(token);
      return {
        success: false,
        message: 'That reset token has expired. Request a new one and try again.',
      };
    }

    const nextUsers = this.usersSignal().map((entry) =>
      entry.email === resetRecord.email ? { ...entry, password: request.password } : entry,
    );

    this.usersSignal.set(nextUsers);
    this.persistUsers(nextUsers);
    this.removeResetToken(token);

    const user = this.usersSignal().find((entry) => entry.email === resetRecord.email);

    return {
      success: true,
      message: 'Password updated. Sign in with your new credentials.',
      data: { username: user?.displayName || user?.email },
    };
  }

  logout(): void {
    this.sessionSignal.set(null);
    this.persistSession(null);
  }

  clearAll(): void {
    this.sessionSignal.set(null);
    this.usersSignal.set([demoUser]);
    this.resetTokensSignal.set([]);
    this.pendingUsersSignal.set([]);
    this.persistSession(null);
    this.persistUsers([demoUser]);
    this.persistResetTokens([]);
    this.persistPendingUsers([]);
  }

  private initializeStore(): boolean {
    const users = this.usersSignal();

    if (users.length === 0) {
      this.usersSignal.set([demoUser]);
      this.persistUsers([demoUser]);
    }

    return true;
  }

  private createSession(user: StoredUser, rememberMe: boolean): AuthSession {
    return {
      user: this.publicUser(user),
      token: this.createToken('session'),
      rememberMe,
      expiresAt: this.createExpiry(rememberMe ? 60 * 24 * 30 : 8 * 60),
    };
  }

  private publicUser(user: StoredUser): AuthUser {
    return {
      id: user.id,
      displayName: user.displayName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      roleName: user.roleName,
    };
  }

  private normalizeEmail(value: string): string {
    return value.trim().toLowerCase();
  }

  private createId(prefix: string): string {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private createToken(prefix: string): string {
    return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private createExpiry(minutesFromNow: number): string {
    return new Date(Date.now() + minutesFromNow * 60_000).toISOString();
  }

  private loadUsers(): StoredUser[] {
    const storage = this.storage;

    if (!storage) {
      return [demoUser];
    }

    const rawUsers = storage.getItem(USERS_STORAGE_KEY);

    if (!rawUsers) {
      return [demoUser];
    }

    try {
      const parsed = JSON.parse(rawUsers) as StoredUser[];
      return parsed.length > 0 ? parsed : [demoUser];
    } catch {
      return [demoUser];
    }
  }

  private loadSession(): AuthSession | null {
    const storage = this.storage;

    if (!storage) {
      return null;
    }

    const rawSession = storage.getItem(SESSION_STORAGE_KEY);

    if (!rawSession) {
      return null;
    }

    try {
      const parsed = JSON.parse(rawSession) as AuthSession;

      if (new Date(parsed.expiresAt).getTime() < Date.now()) {
        storage.removeItem(SESSION_STORAGE_KEY);
        return null;
      }

      return parsed;
    } catch {
      storage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
  }

  private loadResetTokens(): PasswordResetToken[] {
    const storage = this.storage;

    if (!storage) {
      return [];
    }

    const rawTokens = storage.getItem(RESET_TOKENS_STORAGE_KEY);

    if (!rawTokens) {
      return [];
    }

    try {
      const parsed = JSON.parse(rawTokens) as PasswordResetToken[];
      const activeTokens = parsed.filter(
        (entry) => new Date(entry.expiresAt).getTime() >= Date.now(),
      );

      if (activeTokens.length !== parsed.length) {
        this.persistResetTokens(activeTokens);
      }

      return activeTokens;
    } catch {
      storage.removeItem(RESET_TOKENS_STORAGE_KEY);
      return [];
    }
  }

  private removeResetToken(token: string): void {
    const nextTokens = this.resetTokensSignal().filter((entry) => entry.token !== token);
    this.resetTokensSignal.set(nextTokens);
    this.persistResetTokens(nextTokens);
  }

  private persistUsers(users: StoredUser[]): void {
    const storage = this.storage;

    if (!storage) {
      return;
    }

    storage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }

  private persistSession(session: AuthSession | null): void {
    const storage = this.storage;

    if (!storage) {
      return;
    }

    if (!session) {
      storage.removeItem(SESSION_STORAGE_KEY);
      return;
    }

    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  private persistResetTokens(tokens: PasswordResetToken[]): void {
    const storage = this.storage;

    if (!storage) {
      return;
    }

    storage.setItem(RESET_TOKENS_STORAGE_KEY, JSON.stringify(tokens));
  }

  private loadPendingUsers(): PendingUser[] {
    const storage = this.storage;
    if (!storage) return [];
    const raw = storage.getItem(PENDING_USERS_STORAGE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as PendingUser[];
    } catch {
      return [];
    }
  }

  private persistPendingUsers(users: PendingUser[]): void {
    const storage = this.storage;
    if (!storage) return;
    storage.setItem(PENDING_USERS_STORAGE_KEY, JSON.stringify(users));
  }

  private get storage(): Storage | null {
    if (!isPlatformBrowser(this.platformId) || typeof localStorage === 'undefined') {
      return null;
    }

    return localStorage;
  }
}
