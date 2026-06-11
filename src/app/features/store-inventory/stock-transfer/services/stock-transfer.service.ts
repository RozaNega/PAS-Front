
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../../../core/services/api.service';
import { TransferRecordsService, CreateTransferRecordCommand } from '../../../../core/services/transfer-records.service';
import { ApiResponseModel } from '../../../../core/models/api-response.model';
import { normalizePasListResponse } from '../../../../core/utils/pas-api-json.util';

import { Injectable, inject } from '@angular/core';
import { Observable, map, catchError, of, forkJoin } from 'rxjs';
import { ApiResponseModel } from '../../../../core/models/api-response.model';
import { InventoryService } from '../../../../core/services/inventory.service';
import { WarehousesService, WarehouseDto } from '../../../../core/services/warehouses.service';
import { TransferRecordsService, CreateTransferRecordCommand } from '../../../../core/services/transfer-records.service';


export interface TransferItem {
  sku: string;
  itemId: string;
  name: string;
  available: number;
  toTransfer: number;
  price?: number;
  warehouseId?: string;
  shelfId?: string;
}

export interface WarehouseOption {
  id: string;
  name: string;
}


export interface StockTransferRequest {
  fromWarehouseId: string;
  toWarehouseId: string;
  items: Array<{ itemId: string; quantity: number }>;
  reason: string;
  requiredByDate: string;
  notes?: string;
}

export interface StockTransferResponse {
  id: string;
  transferNumber: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  createdAt: string;
  estimatedDate: string;
}


export interface TransferHistory {
  id: string;
  date: string;
  fromTo: string;
  items: number;
  qty: number;
  status: string;
  transferNumber?: string;
}


@Injectable({ providedIn: 'root' })
export class StockTransferService {

  constructor(
    private apiService: ApiService,
    private transferRecordsService: TransferRecordsService
  ) {}

  getWarehouses(): Observable<ApiResponseModel<WarehouseOption[]>> {
    return this.apiService.get<unknown>('Warehouses').pipe(
      map((raw) => {
        const n = normalizePasListResponse<any>(raw);
        if (n.success && n.data.length > 0) {
          return { success: true, message: '', data: n.data.map((w: any) => ({ id: w.id, name: w.warehouseName || w.name })), statusCode: 200 } as ApiResponseModel<WarehouseOption[]>;
        }
        return { success: true, message: 'No warehouses found', data: [], statusCode: 200 } as ApiResponseModel<WarehouseOption[]>;
      }),
      catchError(() => {
        return of({ success: false, message: 'Failed to load warehouses', data: [], statusCode: 500 } as ApiResponseModel<WarehouseOption[]>);

export interface BulkTransferResult {
  success: boolean;
  message: string;
  created: number;
  failed: number;
  errors: string[];
}

@Injectable({
  providedIn: 'root'
})
export class StockTransferService {
  private readonly warehousesService = inject(WarehousesService);
  private readonly inventory = inject(InventoryService);
  private readonly transferRecords = inject(TransferRecordsService);

  getWarehouses(): Observable<ApiResponseModel<any[]>> {
    return this.warehousesService.getAll({ isActive: true }).pipe(
      map((res) => ({
        success: res.success,
        message: res.message,
        data: Array.isArray(res.data) ? (res.data as WarehouseDto[]).map(wh => ({ id: wh.id, warehouseName: wh.warehouseName })) : [],
        statusCode: res.statusCode,
      })),
      catchError((error: any) => {
        console.error('Failed to load warehouses:', error);
        return of({
          success: false,
          message: error?.error?.message || error?.message || 'Failed to load warehouses',
          data: [],
          statusCode: error?.status || 500
        } as ApiResponseModel<any[]>);

      })
    );
  }

  getItemsInWarehouse(warehouseId: string): Observable<ApiResponseModel<TransferItem[]>> {

    return this.apiService.get<unknown>('InventoryStock', { warehouseId, pageSize: 200 }).pipe(
      map((raw) => {
        const n = normalizePasListResponse<any>(raw);
        if (n.success && n.data.length > 0) {
          return { success: true, message: '', data: n.data.map((item: any) => ({

    return this.inventory.getStockOverview({ warehouseId, pageSize: 100 }).pipe(
      map((res) => {
        if (res.success !== false && Array.isArray(res.data)) {
          const items = res.data.map(item => ({

            sku: item.sku || '',
            itemId: item.itemId || item.id || '',
            name: item.itemName || '',

            available: item.availableStock ?? item.currentStock ?? 0,
            toTransfer: 0,
            price: item.unitPrice || 0,
            warehouseId: item.warehouseId || warehouseId,
            shelfId: item.shelfId || ''
          })), statusCode: 200 } as ApiResponseModel<TransferItem[]>;

            available: item.currentQuantity ?? item.currentStock ?? 0,
            toTransfer: 0,
            price: item['unitPrice'] || 0
          }));
          return { ...res, data: items } as ApiResponseModel<TransferItem[]>;

        }
        return { success: true, message: 'No items in this warehouse', data: [], statusCode: 200 } as ApiResponseModel<TransferItem[]>;
      }),

      catchError(() => {
        return of({ success: false, message: 'Failed to load items', data: [], statusCode: 500 } as ApiResponseModel<TransferItem[]>);
      })
    );
  }

  createTransfer(request: StockTransferRequest): Observable<ApiResponseModel<StockTransferResponse>> {
    if (request.items.length === 0) {
      return of({ success: false, message: 'No items selected', data: {} as StockTransferResponse, statusCode: 400 } as ApiResponseModel<StockTransferResponse>);
    }

    const command: CreateTransferRecordCommand = {
      itemId: request.items[0].itemId,
      quantity: request.items[0].quantity,
      fromLocationId: request.fromWarehouseId,
      toLocationId: request.toWarehouseId,
      reason: request.reason || undefined,
      remarks: request.notes || undefined,
    };

    return this.transferRecordsService.create(command).pipe(
      map((res) => ({
        success: res.success,
        message: res.message || (res.success ? 'Transfer created successfully' : 'Failed to create transfer'),
        data: res.success ? {
          id: res.data || '',
          transferNumber: res.data || '',
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
          estimatedDate: request.requiredByDate
        } : {} as StockTransferResponse,
        statusCode: res.statusCode
      }) as ApiResponseModel<StockTransferResponse>),
      catchError((error: any) => {
        console.error('[StockTransfer] createTransfer POST failed:', error?.status, error?.message, JSON.stringify(error?.error));
        const body = error?.error;
        let detail = '';
        if (typeof body === 'string') detail = body;
        else if (body?.errors) detail = Object.values(body.errors).flat().join('; ');
        else if (body?.message) detail = body.message;
        else if (body?.title) detail = body.title;
        else detail = error?.message || 'Unknown error';
        return of({
          success: false,
          message: `Backend returned ${error?.status}: ${detail}`,
          data: {} as StockTransferResponse,
          statusCode: error?.status || 500
        } as ApiResponseModel<StockTransferResponse>);
      })
    );
  }

  getTransferHistory(): Observable<ApiResponseModel<TransferHistory[]>> {
    return this.transferRecordsService.getAll({ pageNumber: 1, pageSize: 100 }).pipe(
      map((res) => {
        if (res.success && res.data?.items?.length) {
          return { success: true, message: '', data: res.data.items.map((t: any) => ({
            id: t.id || '',
            date: t.transferDate ? new Date(t.transferDate).toLocaleDateString() : (t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ''),
            fromTo: `${t.fromLocation || t.fromLocationName || 'Source'} → ${t.toLocation || t.toLocationName || 'Destination'}`,
            items: 1,
            qty: t.quantity || 0,
            status: (t.status || 'pending').toLowerCase(),
            transferNumber: t.transferNumber || ''
          })), statusCode: 200 } as ApiResponseModel<TransferHistory[]>;

      catchError((error: any) => {
        console.error('Failed to load items:', error);
        return of({
          success: false,
          message: error?.error?.message || error?.message || 'Failed to load items',
          data: [],
          statusCode: error?.status || 500
        } as ApiResponseModel<TransferItem[]>);
      })
    );
  }

  createTransfer(
    fromWarehouseId: string,
    toWarehouseId: string,
    items: Array<{ itemId: string; quantity: number }>,
    reason: string,
    notes?: string
  ): Observable<ApiResponseModel<BulkTransferResult>> {
    if (items.length === 0) {
      return of({
        success: false,
        message: 'No items to transfer',
        data: { success: false, message: 'No items to transfer', created: 0, failed: 0, errors: [] },
        statusCode: 400
      } as ApiResponseModel<BulkTransferResult>);
    }

    const commands: CreateTransferRecordCommand[] = items.map(item => ({
      itemId: item.itemId,
      quantity: item.quantity,
      fromLocationId: fromWarehouseId,
      toLocationId: toWarehouseId,
      reason,
      remarks: notes,
      reference: `TR-${Date.now()}`
    }));

    const calls = commands.map(cmd =>
      this.transferRecords.create(cmd).pipe(
        map(res => ({ success: res.success, message: res.message, index: commands.indexOf(cmd) })),
        catchError(err => of({ success: false, message: err?.error?.message || err?.message || 'Request failed', index: commands.indexOf(cmd) }))
      )
    );

    return forkJoin(calls).pipe(
      map((results) => {
        const created = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        const errors = results.filter(r => !r.success).map(r => r.message);

        if (failed === 0) {
          return {
            success: true,
            message: `${created} transfer record(s) created successfully`,
            data: { success: true, message: '', created, failed: 0, errors: [] },
            statusCode: 200
          } as ApiResponseModel<BulkTransferResult>;
        }

        if (created > 0) {
          return {
            success: true,
            message: `${created} created, ${failed} failed: ${errors.join('; ')}`,
            data: { success: true, message: '', created, failed, errors },
            statusCode: 207
          } as ApiResponseModel<BulkTransferResult>;
        }

        return {
          success: false,
          message: errors.join('; ') || 'All transfer requests failed',
          data: { success: false, message: '', created: 0, failed, errors },
          statusCode: 500
        } as ApiResponseModel<BulkTransferResult>;
      })
    );
  }

  getTransferHistory(filters?: {
    fromLocationId?: string;
    toLocationId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }): Observable<ApiResponseModel<TransferHistory[]>> {
    return this.transferRecords.getAll(filters).pipe(
      map((res) => {
        if (res.success !== false && res.data && Array.isArray((res.data as any).items)) {
          const items = (res.data as any).items as any[];
          const history = items.map((transfer: any) => ({
            id: transfer.id || '',
            date: new Date(transfer.transferDate || transfer.createdAt).toLocaleDateString() || '',
            fromTo: `${transfer.fromLocationName || transfer.fromLocation || 'WH'} → ${transfer.toLocationName || transfer.toLocation || 'WH'}`,
            items: 1,
            qty: transfer.quantity || 0,
            status: transfer.status || 'pending',
            transferNumber: transfer.transferNumber || ''
          }));
          return { ...res, data: history } as ApiResponseModel<TransferHistory[]>;
        }
        if (res.success !== false && Array.isArray(res.data)) {
          const history = (res.data as any[]).map((transfer: any) => ({
            id: transfer.id || '',
            date: new Date(transfer.transferDate || transfer.createdAt).toLocaleDateString() || '',
            fromTo: `${transfer.fromLocationName || transfer.fromLocation || 'WH'} → ${transfer.toLocationName || transfer.toLocation || 'WH'}`,
            items: 1,
            qty: transfer.quantity || 0,
            status: transfer.status || 'pending',
            transferNumber: transfer.transferNumber || ''
          }));
          return { ...res, data: history } as ApiResponseModel<TransferHistory[]>;

        }
        return { success: true, message: '', data: [], statusCode: 200 } as ApiResponseModel<TransferHistory[]>;
      }),

      catchError(() => {
        return of({ success: true, message: '', data: [], statusCode: 200 } as ApiResponseModel<TransferHistory[]>);
      })
    );
  }

  getTransferById(id: string): Observable<ApiResponseModel<any>> {
    return this.transferRecordsService.getById(id);
  }

  cancelTransfer(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.put<any>(`TransferRecords/${id}`, { status: 'cancelled' });
  }

      catchError((error: any) => {
        console.error('Failed to load transfer history:', error);
        return of({
          success: false,
          message: error?.error?.message || error?.message || 'Failed to load transfer history',
          data: [],
          statusCode: error?.status || 500
        } as ApiResponseModel<TransferHistory[]>);
      })
    );
  }

}
