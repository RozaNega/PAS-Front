import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface EmployeeDto {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  userId?: string;
  isActive: boolean;
}

export interface CreateEmployeeRequest {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  userId?: string;
}

export interface UpdateEmployeeRequest {
  id: string;
  employeeNumber?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  userId?: string;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class EmployeesService {
  constructor(private apiService: ApiService) {}

  getAll(params?: any): Observable<ApiResponseModel<EmployeeDto[]>> {
    return this.apiService.get<ApiResponseModel<EmployeeDto[]>>('Employees', params);
  }

  getById(id: string): Observable<ApiResponseModel<EmployeeDto>> {
    return this.apiService.get<ApiResponseModel<EmployeeDto>>(`Employees/${id}`);
  }

  create(data: CreateEmployeeRequest): Observable<ApiResponseModel<string>> {
    return this.apiService.post<ApiResponseModel<string>>('Employees', data);
  }

  update(data: UpdateEmployeeRequest): Observable<ApiResponseModel<any>> {
    return this.apiService.put<ApiResponseModel<any>>(`Employees/${data.id}`, data);
  }

  delete(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<ApiResponseModel<any>>(`Employees/${id}`);
  }
}
