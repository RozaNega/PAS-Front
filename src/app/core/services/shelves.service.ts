import { Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../../types/api-response.type';
import { normalizePasListResponse, toCamelCaseDeep, unwrapPasEnvelope } from '../utils/pas-api-json.util';

/** Shelf Location from GET /api/ShelfLocations */
export interface ShelfLocationDto {
  id: string;
  warehouseId: string;
  warehouseName: string;
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
  currentUtilization?: number;
  isActive: boolean;
  description?: string;
  createdAt: string;
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

  private createMockShelves(): ShelfLocationDto[] {
    return [
      {
        id: 'a1111111-1111-1111-1111-111111111111',
        warehouseId: '11111111-1111-1111-1111-111111111111',
        warehouseName: 'Main Warehouse',
        aisle: 'A',
        rack: 'R1',
        shelfNumber: 'S1',
        zone: 'Zone-A',
        binType: 'Standard',
        length: 120,
        width: 60,
        height: 40,
        maxWeight: 500,
        capacity: 100,
        currentUtilization: 65,
        isActive: true,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'a2222222-2222-2222-2222-222222222222',
        warehouseId: '11111111-1111-1111-1111-111111111111',
        warehouseName: 'Main Warehouse',
        aisle: 'A',
        rack: 'R1',
        shelfNumber: 'S2',
        zone: 'Zone-A',
        binType: 'Standard',
        length: 120,
        width: 60,
        height: 40,
        maxWeight: 500,
        capacity: 100,
        currentUtilization: 45,
        isActive: true,
        createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'a3333333-3333-3333-3333-333333333333',
        warehouseId: '11111111-1111-1111-1111-111111111111',
        warehouseName: 'Main Warehouse',
        aisle: 'B',
        rack: 'R2',
        shelfNumber: 'S1',
        zone: 'Zone-B',
        binType: 'Heavy Duty',
        length: 150,
        width: 80,
        height: 50,
        maxWeight: 1000,
        capacity: 150,
        currentUtilization: 80,
        isActive: true,
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'a4444444-4444-4444-4444-444444444444',
        warehouseId: '22222222-2222-2222-2222-222222222222',
        warehouseName: 'Branch Warehouse A',
        aisle: 'A',
        rack: 'R1',
        shelfNumber: 'S1',
        zone: 'Zone-A',
        binType: 'Standard',
        length: 100,
        width: 50,
        height: 35,
        maxWeight: 300,
        capacity: 75,
        currentUtilization: 40,
        isActive: true,
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  }

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
