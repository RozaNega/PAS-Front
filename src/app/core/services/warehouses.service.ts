import { Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../../types/api-response.type';
import { normalizePasListResponse, toCamelCaseDeep, unwrapPasEnvelope } from '../utils/pas-api-json.util';

/**
 * Warehouse shape returned by the backend (GET /api/Warehouses)
 * Mirrors PAS.Application/Features/Storage/Warehouses/Dtos/WarehouseDto.cs
 */
export interface WarehouseDto {
  id: string;
  warehouseName: string;
  locationCode: string;
  address: string;
  city: string;
  country: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  isActive: boolean;
  totalShelves?: number;
  occupiedShelves?: number;
  totalItems?: number;
  createdAt: string;
  updatedAt?: string;
}

/**
 * POST /api/Warehouses — matches PAS.Application CreateWarehouseCommand exactly
 * (the only fields accepted by the backend on create).
 */
export interface CreateWarehouseRequest {
  warehouseName: string;
  locationCode: string;
  address: string;
  city: string;
  country: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
}

/**
 * PUT /api/Warehouses/{id} — matches UpdateWarehouseCommand
 */
export interface UpdateWarehouseRequest {
  id: string;
  warehouseName?: string;
  locationCode?: string;
  address?: string;
  city?: string;
  country?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class WarehousesService {
  constructor(private apiService: ApiService) {}

  getAll(params?: {
    searchTerm?: string;
    isActive?: boolean;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<ApiResponse<WarehouseDto[]>> {
    return this.apiService.get<unknown>('Warehouses', params).pipe(
      map((raw) => normalizePasListResponse<WarehouseDto>(raw)),
      catchError((err) => {
        console.error('[WarehousesService] GET /api/Warehouses failed:', err?.status, err?.statusText, err?.message);
        return of({
          success: false,
          message: err?.message || 'Warehouses API unavailable',
          data: [],
          statusCode: err?.status ?? 0,
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
    console.log('[WarehousesService] create called with:', JSON.stringify(data));
    return this.apiService.post<string>('Warehouses', data);
  }

  update(data: UpdateWarehouseRequest): Observable<ApiResponse<unknown>> {
    return this.apiService.put<unknown>(`Warehouses/${data.id}`, data);
  }

  delete(id: string): Observable<ApiResponse<unknown>> {
    return this.apiService.delete<unknown>(`Warehouses/${id}`);
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
