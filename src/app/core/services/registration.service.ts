import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';
import { Observable, map } from 'rxjs';

export interface RegisterRequest {
  username: string;
  password: string;
  confirmPassword: string;
  email: string;
  fullName: string;
  roleName: string;
  department: string;
  employeeCode?: string;
  phoneNumber?: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data?: unknown;
  statusCode?: number;
}

@Injectable({
  providedIn: 'root',
})
export class RegistrationService {
  constructor(private apiService: ApiService) {}

  register(request: RegisterRequest): Observable<RegisterResponse> {
    return this.apiService.post<unknown>('Auth/register', request).pipe(
      map((response) => this.toRegisterResponse(response, 'Account created successfully.')),
    );
  }

  registerPending(request: RegisterRequest): Observable<RegisterResponse> {
    return this.apiService.post<unknown>('Auth/register-pending', request).pipe(
      map((response) => this.toRegisterResponse(response, 'Registration submitted for admin approval.')),
    );
  }

  private toRegisterResponse(response: ApiResponseModel<unknown>, defaultSuccessMessage: string): RegisterResponse {
    return {
      success: response.success,
      message: response.message || (response.success ? defaultSuccessMessage : 'Registration failed.'),
      data: response.data,
      statusCode: response.statusCode,
    };
  }
}
