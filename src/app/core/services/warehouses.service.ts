import { Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../../types/api-response.type';
import { normalizePasListResponse, toCamelCaseDeep, unwrapPasEnvelope } from '../utils/pas-api-json.util';

/** Warehouse from GET /api/Warehouses */
export interface WarehouseDto {
  id: string;
  warehouseName: string;
  warehouseCode: string;
  location: string;
  description?: string;
  isActive: boolean;
  capacity?: number;
  currentUtilization?: number;
  managerName?: string;
  contactNumber?: string;
  createdAt: string;
  updatedAt?: string;
}

/** POST /api/Warehouses — CreateWarehouseCommand */
export interface CreateWarehouseRequest {
  warehouseName: string;
  warehouseCode: string;
  location: string;
  description?: string;
  capacity?: number;
  managerName?: string;
  contactNumber?: string;
}

/** PUT /api/Warehouses/{id} — UpdateWarehouseCommand */
export interface UpdateWarehouseRequest {
  id: string;
  warehouseName?: string;
  warehouseCode?: string;
  location?: string;
  description?: string;
  capacity?: number;
  managerName?: string;
  contactNumber?: string;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class WarehousesService {
  constructor(private apiService: ApiService) {}

  private createMockWarehouses(): WarehouseDto[] {
    return [
      {
        id: 'wh-001',
        warehouseName: 'Main Warehouse',
        warehouseCode: 'MW-001',
        location: 'Addis Ababa, Main District',
        description: 'Primary storage facility',
        isActive: true,
        capacity: 5000,
        currentUtilization: 65,
        managerName: 'Ahmed Hassan',
        contactNumber: '+251 911 000 001',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'wh-002',
        warehouseName: 'Branch Warehouse A',
        warehouseCode: 'BW-A-001',
        location: 'Addis Ababa, Branch Zone',
        description: 'Secondary storage facility',
        isActive: true,
        capacity: 3000,
        currentUtilization: 45,
        managerName: 'Fatima Ali',
        contactNumber: '+251 911 000 002',
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'wh-003',
        warehouseName: 'Cold Storage Facility',
        warehouseCode: 'CS-001',
        location: 'Addis Ababa, Industrial Area',
        description: 'Temperature controlled storage',
        isActive: true,
        capacity: 1500,
        currentUtilization: 80,
        managerName: 'Mohammed Seid',
        contactNumber: '+251 911 000 003',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  }

  getAll(params?: {
    searchTerm?: string;
    isActive?: boolean;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<ApiResponse<WarehouseDto[]>> {
    return this.apiService.get<unknown>('Warehouses', params).pipe(
      map((raw) => normalizePasListResponse<WarehouseDto>(raw)),
      catchError(() => {
        console.warn('Warehouses API unavailable, using mock data');
        return of({
          success: true,
          message: 'Mock data (API unavailable)',
          data: this.createMockWarehouses(),
          statusCode: 200,
        } as ApiResponse<WarehouseDto[]>);
      }),
    );
  }

  getById(id: string): Observable<ApiResponse<WarehouseDto>> {
    return this.apiService.get<unknown>(`Warehouses/${id}`).pipe(
      map((raw) => this.normalizeEnvelope<WarehouseDto>(raw)),
    );
  }

  create(data: CreateWarehouseRequest): Observable<ApiResponse<string>> {
    return this.apiService.post<unknown>('Warehouses', data).pipe(
      map((raw) => this.normalizeEnvelope<string>(raw)),
    );
  }

  update(data: UpdateWarehouseRequest): Observable<ApiResponse<unknown>> {
    return this.apiService.put<unknown>(`Warehouses/${data.id}`, data).pipe(
      map((raw) => this.normalizeEnvelope(raw)),
    );
  }

  delete(id: string): Observable<ApiResponse<unknown>> {
    return this.apiService.delete<unknown>(`Warehouses/${id}`).pipe(
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