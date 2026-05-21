import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../../types/api-response.type';
import { normalizePasListResponse, toCamelCaseDeep, unwrapPasEnvelope } from '../utils/pas-api-json.util';

/** Row from GET /api/Employees (EmployeeDto) */
export interface EmployeeDto {
  id: string;
  employeeCode: string;
  fullName: string;
  department: string;
  position?: string;
  email?: string;
  phone?: string;
  hireDate?: string;
  isActive: boolean;
}

/** POST /api/Employees — CreateEmployeeCommand */
export interface CreateEmployeeRequest {
  employeeCode: string;
  fullName: string;
  department: string;
  position?: string | null;
  email?: string | null;
  phone?: string | null;
  hireDate?: string | null;
}

/** PUT /api/Employees/{id} — UpdateEmployeeCommand */
export interface UpdateEmployeeRequest {
  id: string;
  employeeCode?: string | null;
  fullName?: string | null;
  department?: string | null;
  position?: string | null;
  email?: string | null;
  phone?: string | null;
  hireDate?: string | null;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class EmployeesService {
  constructor(private apiService: ApiService) {}

  getAll(params?: {
    department?: string;
    searchTerm?: string;
    withUserAccountOnly?: boolean;
  }): Observable<ApiResponse<EmployeeDto[]>> {
    return this.apiService.get<unknown>('Employees', params).pipe(
      map((raw) => normalizePasListResponse<EmployeeDto>(raw)),
    );
  }

  getById(id: string): Observable<ApiResponse<EmployeeDto>> {
    return this.apiService.get<unknown>(`Employees/${id}`).pipe(
      map((raw) => this.normalizeEnvelope<EmployeeDto>(raw)),
    );
  }

  create(data: CreateEmployeeRequest): Observable<ApiResponse<string>> {
    return this.apiService.post<unknown>('Employees', data).pipe(
      map((raw) => this.normalizeEnvelope<string>(raw)),
    );
  }

  update(data: UpdateEmployeeRequest): Observable<ApiResponse<unknown>> {
    return this.apiService.put<unknown>(`Employees/${data.id}`, data).pipe(
      map((raw) => this.normalizeEnvelope(raw)),
    );
  }

  delete(id: string): Observable<ApiResponse<unknown>> {
    return this.apiService.delete<unknown>(`Employees/${id}`).pipe(
      map((raw) => this.normalizeEnvelope(raw)),
    );
  }

  private normalizeEnvelope<T>(raw: unknown): ApiResponse<T> {
    const env = unwrapPasEnvelope<unknown>(raw);
    const data =
      env.data !== undefined && env.data !== null
        ? (typeof env.data === 'object' ? toCamelCaseDeep<T>(env.data) : (env.data as T))
        : (undefined as unknown as T);
    return {
      success: env.success,
      message: env.message ?? '',
      data,
      statusCode: env.statusCode ?? 0,
    };
  }
}
