import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

export interface RegisterRequest {
  username: string;
  password: string;
  confirmPassword: string;
  email: string;
  fullName: string;
  roleName: string;
  department: string;
  employeeCode: string;
  phoneNumber: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data?: string;
  statusCode?: number;
}

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {
  constructor(private apiService: ApiService) {}

  register(request: RegisterRequest): Observable<RegisterResponse> {
    return this.apiService.post<RegisterResponse>('auth/register', request);
  }
}
