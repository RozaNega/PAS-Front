import { Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { ApiResponse } from '../../../../types/api-response.type';

export interface TransferItem {
  sku: string;
  itemId: string;
  name: string;
  available: number;
  toTransfer: number;
  price?: number;
}

export interface StockTransferRequest {
  fromWarehouseId: string;
  toWarehouseId: string;
  items: Array<{
    itemId: string;
    quantity: number;
  }>;
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
  status: 'completed' | 'in-progress' | 'pending';
  transferNumber?: string;
}

@Injectable({
  providedIn: 'root'
})
export class StockTransferService {
  constructor(private apiService: ApiService) {}

  private createMockWarehouses() {
    return [
      { id: 'wh-001', warehouseName: 'Main Warehouse' },
      { id: 'wh-002', warehouseName: 'Secondary Warehouse' },
      { id: 'wh-003', warehouseName: 'Distribution Center' }
    ];
  }

  private createMockItems() {
    return [
      { sku: 'SKU-001', itemId: 'item-001', itemName: 'Office Chair', currentStock: 45, unitPrice: 250 },
      { sku: 'SKU-002', itemId: 'item-002', itemName: 'Desk Lamp', currentStock: 120, unitPrice: 85 },
      { sku: 'SKU-003', itemId: 'item-003', itemName: 'Monitor Stand', currentStock: 32, unitPrice: 120 },
      { sku: 'SKU-004', itemId: 'item-004', itemName: 'Keyboard', currentStock: 78, unitPrice: 95 },
      { sku: 'SKU-005', itemId: 'item-005', itemName: 'Mouse Pad', currentStock: 200, unitPrice: 15 }
    ];
  }

  private createMockTransferHistory(): TransferHistory[] {
    return [
      {
        id: 'tr-001',
        date: new Date(Date.now() - 86400000).toLocaleDateString(),
        fromTo: 'Main Warehouse → Secondary Warehouse',
        items: 3,
        qty: 45,
        status: 'completed',
        transferNumber: 'TR-2024-001'
      },
      {
        id: 'tr-002',
        date: new Date(Date.now() - 172800000).toLocaleDateString(),
        fromTo: 'Secondary Warehouse → Distribution Center',
        items: 2,
        qty: 28,
        status: 'in-progress',
        transferNumber: 'TR-2024-002'
      },
      {
        id: 'tr-003',
        date: new Date(Date.now() - 259200000).toLocaleDateString(),
        fromTo: 'Distribution Center → Main Warehouse',
        items: 1,
        qty: 15,
        status: 'pending',
        transferNumber: 'TR-2024-003'
      }
    ];
  }

  // Get warehouses
  getWarehouses(): Observable<ApiResponse<any[]>> {
    return this.apiService.get<ApiResponse<any[]>>('Warehouses', { isActive: true }).pipe(
      catchError(() => {
        return of({
          success: true,
          message: 'Using mock warehouse data',
          data: this.createMockWarehouses(),
          statusCode: 200
        } as ApiResponse<any[]>);
      })
    );
  }

  // Get items in warehouse
  getItemsInWarehouse(warehouseId: string): Observable<ApiResponse<TransferItem[]>> {
    return this.apiService.get('InventoryStock', {
      warehouseId,
      pageSize: 100
    }).pipe(
      map((res: any) => {
        if (res.success !== false && Array.isArray(res.data)) {
          const items = (res.data as any[]).map(item => ({
            sku: item.sku || '',
            itemId: item.itemId || '',
            name: item.itemName || '',
            available: item.currentStock || 0,
            toTransfer: 0,
            price: item.unitPrice || 0
          }));
          return { ...res, data: items } as ApiResponse<TransferItem[]>;
        }
        return { ...res, data: [] } as ApiResponse<TransferItem[]>;
      }),
      catchError(() => {
        const mockItems = this.createMockItems().map(item => ({
          sku: item.sku,
          itemId: item.itemId,
          name: item.itemName,
          available: item.currentStock,
          toTransfer: 0,
          price: item.unitPrice
        }));
        return of({
          success: true,
          message: 'Using mock inventory data',
          data: mockItems,
          statusCode: 200
        } as ApiResponse<TransferItem[]>);
      })
    );
  }

  // Create stock transfer
  createTransfer(request: StockTransferRequest): Observable<ApiResponse<StockTransferResponse>> {
    return this.apiService.post<ApiResponse<StockTransferResponse>>('StockTransfers', request).pipe(
      catchError((error: any) => {
        console.error('Transfer creation failed:', error);
        return of({
          success: false,
          message: error?.error?.message || 'Failed to create transfer',
          data: {} as StockTransferResponse,
          statusCode: error?.status || 500
        } as ApiResponse<StockTransferResponse>);
      })
    );
  }

  // Get transfer history
  getTransferHistory(filters?: {
    fromWarehouseId?: string;
    toWarehouseId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Observable<ApiResponse<TransferHistory[]>> {
    return this.apiService.get('StockTransfers', filters).pipe(
      map((res: any) => {
        if (res.success !== false && Array.isArray(res.data)) {
          const history = (res.data as any[]).map(transfer => ({
            id: transfer.id || '',
            date: new Date(transfer.createdAt).toLocaleDateString() || '',
            fromTo: `${transfer.fromWarehouse?.warehouseName || 'WH'} → ${transfer.toWarehouse?.warehouseName || 'WH'}`,
            items: transfer.items?.length || 0,
            qty: transfer.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0,
            status: transfer.status || 'pending',
            transferNumber: transfer.transferNumber || ''
          }));
          return { ...res, data: history } as ApiResponse<TransferHistory[]>;
        }
        return { ...res, data: [] } as ApiResponse<TransferHistory[]>;
      }),
      catchError(() => {
        return of({
          success: true,
          message: 'Using mock transfer history',
          data: this.createMockTransferHistory(),
          statusCode: 200
        } as ApiResponse<TransferHistory[]>);
      })
    );
  }

  // Get transfer by ID
  getTransferById(id: string): Observable<ApiResponse<any>> {
    return this.apiService.get(`StockTransfers/${id}`);
  }

  // Cancel transfer
  cancelTransfer(id: string): Observable<ApiResponse<any>> {
    return this.apiService.put(`StockTransfers/${id}`, { status: 'cancelled' });
  }
}
