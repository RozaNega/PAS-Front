import { User } from './user.model';

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
  user: User;
  errors: string[];
}


