import { Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../../types/api-response.type';
import { normalizePasListResponse, toCamelCaseDeep, unwrapPasEnvelope } from '../utils/pas-api-json.util';

/** Inventory Stock from GET /api/InventoryStock */
export interface InventoryStockDto {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  shelfId: string;
  shelfLocation: string;
  warehouseId: string;
  warehouseName: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  unitOfMeasure: string;
  lastUpdated: string;
  minimumThreshold: number;
  maximumThreshold: number;
  unitPrice?: number;
}

/** Stock Movement from GET /api/StockLedger */
export interface StockMovementDto {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  shelfId: string;
  shelfLocation: string;
  movementType: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceNumber: string;
  referenceType: string;
  movementDate: string;
  performedBy: string;
  notes?: string;
}

/** POST /api/InventoryStock/adjust — AdjustStockCommand */
export interface AdjustStockRequest {
  itemId: string;
  shelfId: string;
  adjustmentType: 'increase' | 'decrease' | 'set';
  quantity: number;
  reason: string;
  notes?: string;
}

/** POST /api/InventoryStock/reserve — ReserveStockCommand */
export interface ReserveStockRequest {
  itemId: string;
  shelfId: string;
  quantity: number;
  referenceNumber: string;
  referenceType: string;
  notes?: string;
}

/** POST /api/InventoryStock/release — ReleaseStockCommand */
export interface ReleaseStockRequest {
  itemId: string;
  shelfId: string;
  quantity: number;
  referenceNumber: string;
  referenceType: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  constructor(private apiService: ApiService) {}



  // Stock Overview
  getStockOverview(params?: {
    warehouseId?: string;
    categoryId?: string;
    searchTerm?: string;
    lowStockOnly?: boolean;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<ApiResponse<InventoryStockDto[]>> {
    return this.apiService.get<unknown>('InventoryStock', params).pipe(
      map((raw) => normalizePasListResponse<InventoryStockDto>(raw)),
      catchError(() => {
        console.warn('InventoryStock API unavailable');
        return of({
          success: false,
          message: 'InventoryStock API unavailable',
          data: [],
          statusCode: 0,
        } as ApiResponse<InventoryStockDto[]>);
      }),
    );
  }

  // Stock by Shelf
  getStockByShelf(shelfId: string): Observable<ApiResponse<InventoryStockDto[]>> {
    return this.apiService.get<unknown>(`InventoryStock/by-shelf/${shelfId}`).pipe(
      map((raw) => normalizePasListResponse<InventoryStockDto>(raw)),
    );
  }

  // Stock by Item
  getStockByItem(itemId: string): Observable<ApiResponse<InventoryStockDto[]>> {
    return this.apiService.get<unknown>(`InventoryStock/by-item/${itemId}`).pipe(
      map((raw) => normalizePasListResponse<InventoryStockDto>(raw)),
    );
  }

  // Stock Movements
  getStockMovements(params?: {
    itemId?: string;
    shelfId?: string;
    warehouseId?: string;
    movementType?: string;
    dateFrom?: string;
    dateTo?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<ApiResponse<StockMovementDto[]>> {
    return this.apiService.get<unknown>('StockLedger', params).pipe(
      map((raw) => normalizePasListResponse<StockMovementDto>(raw)),
    );
  }

  // Stock Movements by Item
  getStockMovementsByItem(itemId: string, params?: {
    dateFrom?: string;
    dateTo?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<ApiResponse<StockMovementDto[]>> {
    return this.apiService.get<unknown>(`StockLedger/by-item/${itemId}`, params).pipe(
      map((raw) => normalizePasListResponse<StockMovementDto>(raw)),
    );
  }

  // Stock Movements by Date
  getStockMovementsByDate(params: {
    dateFrom: string;
    dateTo: string;
    warehouseId?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<ApiResponse<StockMovementDto[]>> {
    return this.apiService.get<unknown>('StockLedger/by-date', params).pipe(
      map((raw) => normalizePasListResponse<StockMovementDto>(raw)),
    );
  }

  // Stock Adjustments
  adjustStock(data: AdjustStockRequest): Observable<ApiResponse<unknown>> {
    return this.apiService.post<unknown>('InventoryStock/adjust', data).pipe(
      map((raw) => this.normalizeEnvelope(raw)),
    );
  }

  // Reserve Stock
  reserveStock(data: ReserveStockRequest): Observable<ApiResponse<unknown>> {
    return this.apiService.post<unknown>('InventoryStock/reserve', data).pipe(
      map((raw) => this.normalizeEnvelope(raw)),
    );
  }

  // Release Stock
  releaseStock(data: ReleaseStockRequest): Observable<ApiResponse<unknown>> {
    return this.apiService.post<unknown>('InventoryStock/release', data).pipe(
      map((raw) => this.normalizeEnvelope(raw)),
    );
  }

  // Low Stock Items
  getLowStockItems(params?: {
    warehouseId?: string;
    categoryId?: string;
    thresholdPercentage?: number;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<ApiResponse<InventoryStockDto[]>> {
    const lowStockParams = { ...params, lowStockOnly: true };
    return this.getStockOverview(lowStockParams);
  }

  // Get all shelves
  getAllShelves(params?: {
    warehouseId?: string;
    searchTerm?: string;
    isActive?: boolean;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<ApiResponse<any[]>> {
    return this.apiService.get<unknown>('ShelfLocations', params).pipe(
      map((raw) => normalizePasListResponse<any>(raw)),
      catchError(() => of({ success: false, message: 'ShelfLocations unavailable', data: [], statusCode: 0 } as ApiResponse<any[]>)),
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