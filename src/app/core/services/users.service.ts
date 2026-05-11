import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface UserDto {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  role?: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId?: string;
}

export interface UpdateUserRequest {
  id: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  roleId?: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private apiService: ApiService) {}

  getAll(params?: any): Observable<ApiResponseModel<UserDto[]>> {
    return this.apiService.get<ApiResponseModel<UserDto[]>>('Users', params);
  }

  getById(id: string): Observable<ApiResponseModel<UserDto>> {
    return this.apiService.get<ApiResponseModel<UserDto>>(`Users/${id}`);
  }

  create(data: CreateUserRequest): Observable<ApiResponseModel<string>> {
    return this.apiService.post<ApiResponseModel<string>>('Users', data);
  }

  update(data: UpdateUserRequest): Observable<ApiResponseModel<any>> {
    return this.apiService.put<ApiResponseModel<any>>(`Users/${data.id}`, data);
  }

  delete(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<ApiResponseModel<any>>(`Users/${id}`);
  }

  getCurrentUser(): Observable<ApiResponseModel<UserDto>> {
    return this.apiService.get<ApiResponseModel<UserDto>>('Auth/me');
  }
}
