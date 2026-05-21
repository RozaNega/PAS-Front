import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface UserDto {
  id: string;
  username: string;
  email: string;
  isActive: boolean;
  roleId: string;
  roleName: string;
  employeeId?: string;
  employeeCode?: string;
  employeeName?: string;
}

export interface UserDetailDto {
  id: string;
  username: string;
  email: string;
  isActive: boolean;
  roleId: string;
  roleName: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
}

/** POST /api/Users — RegisterUserCommand */
export interface RegisterUserCommand {
  username: string;
  password: string;
  email: string;
  fullName: string;
  department: string;
  employeeCode?: string | null;
  phoneNumber?: string | null;
  roleName?: string | null;
}

export interface UpdateUserCommand {
  id: string;
  username: string;
  email: string;
  roleId: string;
  isActive: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private apiService: ApiService) {}

  getAll(params?: {
    pageNumber?: number;
    pageSize?: number;
    searchTerm?: string;
    roleId?: string;
    isActive?: boolean;
  }): Observable<ApiResponseModel<PaginatedResponse<UserDto>>> {
    return this.apiService.get<ApiResponseModel<PaginatedResponse<UserDto>>>('Users', params);
  }

  getById(id: string): Observable<ApiResponseModel<UserDetailDto>> {
    return this.apiService.get<ApiResponseModel<UserDetailDto>>(`Users/${id}`);
  }

  register(data: RegisterUserCommand): Observable<ApiResponseModel<string>> {
    return this.apiService.post<ApiResponseModel<string>>('Users', data);
  }

  forgotPassword(email: string): Observable<ApiResponseModel<unknown>> {
    return this.apiService.post<ApiResponseModel<unknown>>('Auth/forgot-password', { email });
  }

  update(data: UpdateUserCommand): Observable<ApiResponseModel<any>> {
    return this.apiService.put<ApiResponseModel<any>>(`Users/${data.id}`, data);
  }

  delete(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<ApiResponseModel<any>>(`Users/${id}`);
  }

  changePassword(userId: string, currentPassword: string, newPassword: string): Observable<ApiResponseModel<any>> {
    return this.apiService.post<ApiResponseModel<any>>('Auth/change-password', {
      currentPassword,
      newPassword
    });
  }

}
