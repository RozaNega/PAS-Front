export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  employeeCode: string;
  department: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  fullName: string;
  employeeCode: string;
  department: string;
  password: string;
  roleId: string;
}

export interface AuthResponse {
  succeeded: boolean;
  token: string;
  refreshToken: string;
  expiresAt: string;
  user: AuthUser;
  errors: string[];
}
