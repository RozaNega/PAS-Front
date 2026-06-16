export interface AuthUser {
  id: string;
  displayName: string;
  phoneNumber: string;
  email: string;
  roleName?: string;
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
  data?: { username?: string };
}
