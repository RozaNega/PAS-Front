import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface RoleDto {
  id: string;
  roleName: string;
  description?: string;
  userCount: number;
  permissions?: string[];
}

export interface UserRoleDto {
  userId: string;
  username: string;
  employeeName: string;
  roles: RoleAssignmentDto[];
}

export interface RoleAssignmentDto {
  roleId: string;
  roleName: string;
  isAssigned: boolean;
}

export interface CreateRoleCommand {
  roleName: string;
  description?: string;
}

export interface UpdateRoleCommand {
  id: string;
  roleName?: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class RolesService {
  constructor(private apiService: ApiService) {}

  getAll(params?: { searchTerm?: string }): Observable<ApiResponseModel<RoleDto[]>> {
    return this.apiService.get<ApiResponseModel<RoleDto[]>>('Roles', params);
  }

  getUserRoles(userId: string): Observable<ApiResponseModel<UserRoleDto>> {
    return this.apiService.get<ApiResponseModel<UserRoleDto>>(`Roles/user/${userId}`);
  }

  create(data: CreateRoleCommand): Observable<ApiResponseModel<string>> {
    return this.apiService.post<ApiResponseModel<string>>('Roles', data);
  }

  update(data: UpdateRoleCommand): Observable<ApiResponseModel<any>> {
    return this.apiService.put<ApiResponseModel<any>>(`Roles/${data.id}`, data);
  }

  delete(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<ApiResponseModel<any>>(`Roles/${id}`);
  }
}
