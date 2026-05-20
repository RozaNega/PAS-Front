import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface EmployeeDto {
  id: string;
  employeeCode?: string;
  fullName?: string;
  department?: string;
}

export interface EmployeeDetailDto {
  id: string;
  employeeCode?: string;
  fullName?: string;
  department?: string;
  email?: string;
  isActive: boolean;
  userAccount?: UserAccountSummaryDto;
  recentActivities: EmployeeActivityDto[];
}

export interface UserAccountSummaryDto {
  id: string;
  username?: string;
  email?: string;
  role?: string;
  isActive: boolean;
  lastLoginAt?: string;
}

export interface EmployeeActivityDto {
  date: string;
  action?: string;
  entity?: string;
  description?: string;
}

export interface CreateEmployeeCommand {
  employeeCode?: string;
  fullName?: string;
  department?: string;
  position?: string;
  email?: string;
  phone?: string;
  hireDate?: string;
}

export interface UpdateEmployeeCommand {
  id: string;
  employeeCode?: string;
  fullName?: string;
  department?: string;
  position?: string;
  email?: string;
  phone?: string;
  hireDate?: string;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class EmployeesService {
  constructor(private apiService: ApiService) {}

  getAll(params?: { department?: string; searchTerm?: string; withUserAccountOnly?: boolean }): Observable<ApiResponseModel<EmployeeDto[]>> {
    return this.apiService.get<ApiResponseModel<EmployeeDto[]>>('Employees', params);
  }

  getById(id: string): Observable<ApiResponseModel<EmployeeDetailDto>> {
    return this.apiService.get<ApiResponseModel<EmployeeDetailDto>>(`Employees/${id}`);
  }

  getByUserId(userId: string): Observable<ApiResponseModel<EmployeeDetailDto>> {
    return this.apiService.get<ApiResponseModel<EmployeeDetailDto>>(`Employees/by-user/${userId}`);
  }

  create(data: CreateEmployeeCommand): Observable<ApiResponseModel<string>> {
    return this.apiService.post<ApiResponseModel<string>>('Employees', data);
  }

  update(data: UpdateEmployeeCommand): Observable<ApiResponseModel<any>> {
    return this.apiService.put<ApiResponseModel<any>>(`Employees/${data.id}`, data);
  }

  delete(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<ApiResponseModel<any>>(`Employees/${id}`);
  }
}
