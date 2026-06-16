import { Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../../types/api-response.type';
import { normalizePasListResponse, toCamelCaseDeep, unwrapPasEnvelope } from '../utils/pas-api-json.util';

/** Inventory Stock from GET /api/InventoryStock (matches backend InventoryStockDto) */
export interface InventoryStockDto {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  shelfId: string;
  shelfLocation: string;
  warehouseName: string;
  currentQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  unitOfMeasure: string;
  batchNumber: string | null;
  expiryDate: string | null;
  lastReceived: string | null;
  lastIssued: string | null;

  // Backward compatibility - old field names from previous API
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  warehouseId: string;
  minimumThreshold: number;
  maximumThreshold: number;

  unitPrice?: number;

  lastUpdated: string;
  
  // Allow additional properties for mock data
  [key: string]: any;

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
  inventoryId?: string;
  newQuantity: number;
  reason: string;
  remarks?: string;
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




  private createMockInventoryStock(): InventoryStockDto[] {
    return [
      {
        id: 'inv-001',
        itemId: 'item-001',
        itemName: 'Office Laptop',
        sku: 'LAP-HP-001',
        shelfId: 'shelf-001',
        shelfLocation: 'A-R1-S1',
        warehouseName: 'Main Warehouse',
        currentQuantity: 25,
        reservedQuantity: 5,
        availableQuantity: 20,
        unitOfMeasure: 'Units',
        batchNumber: null,
        expiryDate: null,
        lastReceived: new Date().toISOString(),
        lastIssued: null,
        // Backward compatibility
        currentStock: 25,
        reservedStock: 5,
        availableStock: 20,
        warehouseId: 'wh-001',
        minimumThreshold: 10,
        maximumThreshold: 50,
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'inv-002',
        itemId: 'item-002',
        itemName: 'Office Chair',
        sku: 'CHR-STD-001',
        shelfId: 'shelf-002',
        shelfLocation: 'A-R1-S2',
        warehouseName: 'Main Warehouse',
        currentQuantity: 45,
        reservedQuantity: 10,
        availableQuantity: 35,
        unitOfMeasure: 'Units',
        batchNumber: null,
        expiryDate: null,
        lastReceived: new Date().toISOString(),
        lastIssued: null,
        // Backward compatibility
        currentStock: 45,
        reservedStock: 10,
        availableStock: 35,
        warehouseId: 'wh-001',
        minimumThreshold: 20,
        maximumThreshold: 100,
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'inv-003',
        itemId: 'item-003',
        itemName: 'Desk Printer',
        sku: 'PRT-JET-001',
        shelfId: 'shelf-003',
        shelfLocation: 'B-R2-S1',
        warehouseName: 'Main Warehouse',
        currentQuantity: 12,
        reservedQuantity: 2,
        availableQuantity: 10,
        unitOfMeasure: 'Units',
        batchNumber: null,
        expiryDate: null,
        lastReceived: new Date().toISOString(),
        lastIssued: null,
        // Backward compatibility
        currentStock: 12,
        reservedStock: 2,
        availableStock: 10,
        warehouseId: 'wh-001',
        minimumThreshold: 5,
        maximumThreshold: 20,
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'inv-004',
        itemId: 'item-004',
        itemName: 'Printer Paper',
        sku: 'PAP-A4-001',
        shelfId: 'shelf-004',
        shelfLocation: 'A-R1-S1-BW',
        warehouseName: 'Branch Warehouse A',
        currentQuantity: 500,
        reservedQuantity: 100,
        availableQuantity: 400,
        unitOfMeasure: 'Boxes',
        batchNumber: null,
        expiryDate: null,
        lastReceived: new Date().toISOString(),
        lastIssued: null,
        // Backward compatibility
        currentStock: 500,
        reservedStock: 100,
        availableStock: 400,
        warehouseId: 'wh-002',
        minimumThreshold: 200,
        maximumThreshold: 1000,
        lastUpdated: new Date().toISOString(),
      },
    ];
  }


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
      map((raw) => {
        const normalized = normalizePasListResponse<InventoryStockDto>(raw);
        // Ensure backward compatible fields are present (server may return either format)
        if (normalized.data) {
          normalized.data = normalized.data.map(item => ({
            ...item,
            currentQuantity: item.currentQuantity ?? item.currentStock ?? 0,
            reservedQuantity: item.reservedQuantity ?? item.reservedStock ?? 0,
            availableQuantity: item.availableQuantity ?? item.availableStock ?? (item.currentQuantity ?? item.currentStock ?? 0),
            currentStock: item.currentStock ?? item.currentQuantity ?? 0,
            reservedStock: item.reservedStock ?? item.reservedQuantity ?? 0,
            availableStock: item.availableStock ?? item.availableQuantity ?? (item.currentStock ?? item.currentQuantity ?? 0),
            warehouseId: item.warehouseId ?? item.shelfId ?? '',
            minimumThreshold: item.minimumThreshold ?? 10,
            maximumThreshold: item.maximumThreshold ?? 100,
            lastUpdated: item.lastUpdated ?? item.lastReceived ?? item.lastIssued ?? new Date().toISOString(),
          }));
        }
        return normalized;
      }),
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

  // Create inventory record (for items that exist in ItemMaster but not in InventoryStock)
  createInventoryRecord(data: {
    itemId: string;
    itemName: string;
    sku: string;
  }): Observable<ApiResponse<unknown>> {
    return this.apiService.post<unknown>('inventory/stock', {
      itemId: data.itemId,
      itemName: data.itemName,
      sku: data.sku,
    }).pipe(
      map((raw) => this.normalizeEnvelope(raw)),
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