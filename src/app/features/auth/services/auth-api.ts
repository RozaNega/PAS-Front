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
}

interface PasswordResetToken {
  email: string;
  token: string;
  expiresAt: string;
}

const USERS_STORAGE_KEY = 'ecx-auth-users';
const SESSION_STORAGE_KEY = 'ecx-auth-session';
const RESET_TOKENS_STORAGE_KEY = 'ecx-auth-reset-tokens';
const DEMO_EMAIL = 'demo@ecx.local';
const DEMO_PASSWORD = 'Password123!';
const DEMO_DISPLAY_NAME = 'Demo Admin';

const demoUser: StoredUser = {
  id: 'user-demo',
  displayName: DEMO_DISPLAY_NAME,
  email: DEMO_EMAIL,
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
  private readonly initialized = this.initializeStore();

  readonly session = computed(() => this.sessionSignal());
  readonly isAuthenticated = computed(() => this.sessionSignal() !== null);
  readonly activeUser = computed(() => this.sessionSignal()?.user ?? null);
  readonly knownUsers = computed(() =>
    this.usersSignal().map(({ password: _password, ...user }) => user),
  );
  readonly accountCount = computed(() => this.usersSignal().length);
  readonly pendingResetCount = computed(() => this.resetTokensSignal().length);

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
      email,
      password: request.password,
    };

    const nextUsers = [...this.usersSignal(), newUser];
    this.usersSignal.set(nextUsers);
    this.persistUsers(nextUsers);

    return {
      success: true,
      message: `Account created for ${newUser.displayName}. You can sign in right away.`,
    };
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

    return {
      success: true,
      message: 'Password updated. Sign in with your new credentials.',
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
    this.persistSession(null);
    this.persistUsers([demoUser]);
    this.persistResetTokens([]);
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
      email: user.email,
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

  private get storage(): Storage | null {
    if (!isPlatformBrowser(this.platformId) || typeof localStorage === 'undefined') {
      return null;
    }

    return localStorage;
  }
}
