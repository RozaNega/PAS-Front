export interface AuthUser {
  id: string;
  displayName: string;
  email: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  expiresAt: string;
  rememberMe: boolean;
}

export interface AuthResult {
  success: boolean;
  message: string;
  session?: AuthSession;
  resetToken?: string;
}
