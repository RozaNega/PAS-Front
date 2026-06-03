import { Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../../types/api-response.type';
import { normalizePasListResponse, toCamelCaseDeep, unwrapPasEnvelope } from '../utils/pas-api-json.util';

/** Shelf Location from GET /api/ShelfLocations */
export interface ShelfLocationDto {
  id: string;
  shelfCode: string;
  shelfName: string;
  warehouseId: string;
  warehouseName: string;
  aisle?: string;
  section?: string;
  level?: string;
  position?: string;
  capacity?: number;
  currentUtilization?: number;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

/** POST /api/ShelfLocations — CreateShelfLocationCommand */
export interface CreateShelfLocationRequest {
  shelfCode: string;
  shelfName: string;
  warehouseId: string;
  aisle?: string;
  section?: string;
  level?: string;
  position?: string;
  capacity?: number;
  description?: string;
}

/** PUT /api/ShelfLocations/{id} — UpdateShelfLocationCommand */
export interface UpdateShelfLocationRequest {
  id: string;
  shelfCode?: string;
  shelfName?: string;
  warehouseId?: string;
  aisle?: string;
  section?: string;
  level?: string;
  position?: string;
  capacity?: number;
  description?: string;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class ShelvesService {
  constructor(private apiService: ApiService) {}

  private createMockShelves(): ShelfLocationDto[] {
    return [
      {
        id: 'shelf-001',
        shelfCode: 'A-R1-S1',
        shelfName: 'Aisle A, Rack 1, Shelf 1',
        warehouseId: 'wh-001',
        warehouseName: 'Main Warehouse',
        aisle: 'A',
        section: 'R1',
        level: 'S1',
        position: '1',
        capacity: 100,
        currentUtilization: 65,
        isActive: true,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'shelf-002',
        shelfCode: 'A-R1-S2',
        shelfName: 'Aisle A, Rack 1, Shelf 2',
        warehouseId: 'wh-001',
        warehouseName: 'Main Warehouse',
        aisle: 'A',
        section: 'R1',
        level: 'S2',
        position: '2',
        capacity: 100,
        currentUtilization: 45,
        isActive: true,
        createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'shelf-003',
        shelfCode: 'B-R2-S1',
        shelfName: 'Aisle B, Rack 2, Shelf 1',
        warehouseId: 'wh-001',
        warehouseName: 'Main Warehouse',
        aisle: 'B',
        section: 'R2',
        level: 'S1',
        position: '1',
        capacity: 150,
        currentUtilization: 80,
        isActive: true,
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'shelf-004',
        shelfCode: 'A-R1-S1-BW',
        shelfName: 'Aisle A, Rack 1, Shelf 1',
        warehouseId: 'wh-002',
        warehouseName: 'Branch Warehouse A',
        aisle: 'A',
        section: 'R1',
        level: 'S1',
        position: '1',
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
      catchError(() => {
        console.warn('ShelfLocations API unavailable, using mock data');
        const mockData = this.createMockShelves();
        const filtered = params?.warehouseId
          ? mockData.filter(s => s.warehouseId === params.warehouseId)
          : mockData;
        return of({
          success: true,
          message: 'Mock data (API unavailable)',
          data: filtered,
          statusCode: 200,
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
    const body = { command: { ...data } };
    return this.apiService.post<unknown>('ShelfLocations', body).pipe(
      map((raw) => this.normalizeEnvelope<string>(raw)),
    );
  }

  update(data: UpdateShelfLocationRequest): Observable<ApiResponse<unknown>> {
    const body = { command: { ...data } };
    return this.apiService.put<unknown>(`ShelfLocations/${data.id}`, body).pipe(
      map((raw) => this.normalizeEnvelope(raw)),
    );
  }

  delete(id: string): Observable<ApiResponse<unknown>> {
    return this.apiService.delete<unknown>(`ShelfLocations/${id}`).pipe(
      map((raw) => this.normalizeEnvelope(raw)),
    );
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