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

export interface PaginatedUserResponse {
  items: UserDto[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface RegisterUserCommand {
  username: string;
  password: string;
  email?: string;
  fullName?: string;
  department?: string;
  employeeCode?: string;
  phoneNumber?: string;
  roleName?: string;
}

export interface UpdateUserCommand {
  id: string;
  username?: string;
  email?: string;
  roleId: string;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private apiService: ApiService) {}

  getAll(params?: { searchTerm?: string; roleId?: string; isActive?: boolean; pageNumber?: number; pageSize?: number }): Observable<ApiResponseModel<PaginatedUserResponse>> {
    return this.apiService.get<ApiResponseModel<PaginatedUserResponse>>('Users', params);
  }

  getById(id: string): Observable<ApiResponseModel<UserDetailDto>> {
    return this.apiService.get<ApiResponseModel<UserDetailDto>>(`Users/${id}`);
  }

  create(data: RegisterUserCommand): Observable<ApiResponseModel<string>> {
    return this.apiService.post<ApiResponseModel<string>>('Users', data);
  }

  update(data: UpdateUserCommand): Observable<ApiResponseModel<any>> {
    return this.apiService.put<ApiResponseModel<any>>(`Users/${data.id}`, data);
  }

  delete(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<ApiResponseModel<any>>(`Users/${id}`);
  }

  activate(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.post<ApiResponseModel<any>>(`Users/${id}/activate`, {});
  }

  deactivate(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.post<ApiResponseModel<any>>(`Users/${id}/deactivate`, {});
  }

  uploadProfilePhoto(file: File): Observable<ApiResponseModel<string>> {
    const formData = new FormData();
    formData.append('Photo', file);
    return this.apiService.post<ApiResponseModel<string>>('Auth/upload-profile-photo', formData);
  }
}
