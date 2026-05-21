import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface RoleDto {
  id: string;
  roleName: string;
  description?: string;
  userCount?: number;
  permissions?: string[];
}

export interface CreateRoleRequest {
  roleName: string;
  description?: string;
}

export interface UpdateRoleRequest {
  id: string;
  roleName?: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class RolesService {
  constructor(private apiService: ApiService) {}

  getAll(params?: any): Observable<ApiResponseModel<RoleDto[]>> {
    return this.apiService.get<ApiResponseModel<RoleDto[]>>('Roles', params);
  }

  getById(id: string): Observable<ApiResponseModel<RoleDto>> {
    return this.apiService.get<ApiResponseModel<RoleDto>>(`Roles/${id}`);
  }

  create(data: CreateRoleRequest): Observable<ApiResponseModel<string>> {
    return this.apiService.post<ApiResponseModel<string>>('Roles', data);
  }

  update(data: UpdateRoleRequest): Observable<ApiResponseModel<any>> {
    return this.apiService.put<ApiResponseModel<any>>(`Roles/${data.id}`, data);
  }

  delete(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<ApiResponseModel<any>>(`Roles/${id}`);
  }
}
