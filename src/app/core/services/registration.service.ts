import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
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

type RegisterApiResponse = {
  success?: boolean;
  succeeded?: boolean;
  isSuccess?: boolean;
  message?: string;
  statusCode?: number;
  data?:
    | {
        message?: string;
        statusCode?: number;
        [key: string]: unknown;
      }
    | string
    | null;
  [key: string]: unknown;
};

@Injectable({
  providedIn: 'root',
})
export class RegistrationService {
  constructor(private apiService: ApiService) {}

  register(request: RegisterRequest): Observable<RegisterResponse> {
    console.log('📝 [RegistrationService] Attempting registration:', {
      username: request.username,
      email: request.email,
      fullName: request.fullName,
      department: request.department,
      roleName: request.roleName
    });

    return this.apiService.post<RegisterApiResponse>('Auth/register', request).pipe(
      map((response) => {
        console.log('✅ [RegistrationService] Registration response:', response);
        
        const success =
          response.success === true || (response as any).succeeded === true || (response as any).isSuccess === true;

        const nestedMessage =
          response.data && typeof response.data === 'object' && 'message' in response.data
            ? String(response.data.message ?? '')
            : '';

        const nestedStatusCode =
          response.data && typeof response.data === 'object' && 'statusCode' in response.data
            ? Number(response.data.statusCode)
            : undefined;

        const result = {
          success,
          message:
            response.message ||
            nestedMessage ||
            (success ? 'Account created successfully.' : 'Registration failed.'),
          data: response.data,
          statusCode: response.statusCode ?? nestedStatusCode,
        };

        console.log('🔍 [RegistrationService] Processed result:', result);
        return result;
      }),
    );
  }
}
