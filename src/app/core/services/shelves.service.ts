import { Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../../types/api-response.type';
import { normalizePasListResponse, toCamelCaseDeep, unwrapPasEnvelope } from '../utils/pas-api-json.util';

/** Shelf Location from GET /api/ShelfLocations (ASP.NET Core backend) */
export interface ShelfLocationDto {
  id: string;
  warehouseId: string;
  warehouseName: string;
  fullAddress?: string;
  qrCodeValue?: string;
  isActive: boolean;
  itemCount: number;
  totalQuantity: number;
  capacity: number;
  currentUtilization?: number;
  aisle?: string;
  rack?: string;
  shelfNumber?: string;
  zone?: string;
  binType?: string;
  length?: number;
  width?: number;
  height?: number;
  maxWeight?: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

  /** POST /api/ShelfLocations — CreateShelfLocationCommand */
export interface CreateShelfLocationRequest {
  warehouseId: string;
  warehouseName?: string;
  aisle?: string;
  rack?: string;
  shelfNumber?: string;
  zone?: string;
  binType?: string;
  length?: number;
  width?: number;
  height?: number;
  maxWeight?: number;
  capacity?: number;
}

/** PUT /api/ShelfLocations/{id} — UpdateShelfLocationCommand */
export interface UpdateShelfLocationRequest {
  id: string;
  warehouseId?: string;
  warehouseName?: string;
  aisle?: string;
  rack?: string;
  shelfNumber?: string;
  zone?: string;
  binType?: string;
  length?: number;
  width?: number;
  height?: number;
  maxWeight?: number;
  capacity?: number;
  isActive: boolean;
}

/**
 * Build a flat request body for POST /api/ShelfLocations.
 * The backend controller binds CreateShelfLocationCommand directly from
 * the request body — it does NOT expect a nested { command: { ... } } wrapper.
 */
function buildCreateCommand(data: CreateShelfLocationRequest): Record<string, unknown> {
  return {
    warehouseId: data.warehouseId,
    aisle: data.aisle,
    rack: data.rack,
    shelfNumber: data.shelfNumber,
    zone: data.zone,
    binType: data.binType,
    length: data.length,
    width: data.width,
    height: data.height,
    maxWeight: data.maxWeight,
    capacity: data.capacity,
  };
}

/**
 * Build a flat request body for PUT /api/ShelfLocations/{id}.
 */
function buildUpdateCommand(data: UpdateShelfLocationRequest): Record<string, unknown> {
  return {
    id: data.id,
    warehouseId: data.warehouseId,
    aisle: data.aisle,
    rack: data.rack,
    shelfNumber: data.shelfNumber,
    zone: data.zone,
    binType: data.binType,
    length: data.length,
    width: data.width,
    height: data.height,
    maxWeight: data.maxWeight,
    capacity: data.capacity,
    isActive: data.isActive,
  };
}

@Injectable({ providedIn: 'root' })
export class ShelvesService {
  constructor(private apiService: ApiService) {}

  getAll(params?: {
    warehouseId?: string;
    searchTerm?: string;
    isActive?: boolean;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<ApiResponse<ShelfLocationDto[]>> {
    return this.apiService.get<unknown>('ShelfLocations', params).pipe(
      map((raw) => normalizePasListResponse<ShelfLocationDto>(raw)),
      catchError((err) => {
        console.error('[ShelvesService] GET /api/ShelfLocations failed:', err?.status, err?.statusText, err?.message);
        return of({
          success: false,
          message: err?.message || 'ShelfLocations API unavailable',
          data: [],
          statusCode: err?.status ?? 0,
        } as ApiResponse<ShelfLocationDto[]>);
      }),
    );
  }

  getById(id: string): Observable<ApiResponse<ShelfLocationDto>> {
    return this.apiService.get<unknown>(`ShelfLocations/${id}`).pipe(
      map((raw) => this.normalizeEnvelope<ShelfLocationDto>(raw)),
    );
  }

  create(data: CreateShelfLocationRequest): Observable<ApiResponse<string>> {
    const body = buildCreateCommand(data);
    console.log('[ShelvesService] create POST body:', JSON.stringify(body));
    return this.apiService.post<string>('ShelfLocations', body);
  }

  update(data: UpdateShelfLocationRequest): Observable<ApiResponse<unknown>> {
    const body = buildUpdateCommand(data);
    return this.apiService.put<unknown>(`ShelfLocations/${data.id}`, body);
  }

  delete(id: string): Observable<ApiResponse<unknown>> {
    return this.apiService.delete<unknown>(`ShelfLocations/${id}`);
  }

  getShelves(params?: {
    warehouseId?: string;
    searchTerm?: string;
    isActive?: boolean;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<ApiResponse<ShelfLocationDto[]>> {
    return this.getAll(params);
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
