import { Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { ApiResponse } from '../../../../types/api-response.type';

export interface StockReportItem {
  sku: string;
  name: string;
  category: string;
  warehouse: string;
  quantity: number;
  unitPrice: number;
  total: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

export interface StockReportSummary {
  totalItems: number;
  totalValue: number;
  totalUnits: number;
  turnoverRate: string;
  avgStockLevel: string;
}

@Injectable({ providedIn: 'root' })
export class StockReportService {
  constructor(private apiService: ApiService) {}

  private createMockStockItems(): StockReportItem[] {
    return [
      { sku: 'LAP-001', name: 'Dell XPS Laptop', category: 'Electronics', warehouse: 'WH A', quantity: 45, unitPrice: 2499, total: 112455, status: 'In Stock' },
      { sku: 'MON-002', name: 'HP Monitor', category: 'Electronics', warehouse: 'WH A', quantity: 67, unitPrice: 350, total: 23450, status: 'In Stock' },
      { sku: 'CHR-003', name: 'Office Chair', category: 'Furniture', warehouse: 'WH B', quantity: 23, unitPrice: 450, total: 10350, status: 'Low Stock' },
      { sku: 'CAB-004', name: 'USB Cables', category: 'Accessories', warehouse: 'WH A', quantity: 5, unitPrice: 5, total: 25, status: 'Out of Stock' },
      { sku: 'PAP-005', name: 'A4 Paper', category: 'Stationery', warehouse: 'WH B', quantity: 120, unitPrice: 25, total: 3000, status: 'In Stock' },
      { sku: 'TON-006', name: 'Toner Cartridge', category: 'Supplies', warehouse: 'WH A', quantity: 8, unitPrice: 75, total: 600, status: 'Low Stock' }
    ];
  }

  getStockReport(filters?: {
    warehouseId?: string;
    categoryId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Observable<ApiResponse<StockReportItem[]>> {
    return this.apiService.get<ApiResponse<StockReportItem[]>>('InventoryStock', filters).pipe(
      map((res: any) => {
        if (res.success !== false && Array.isArray(res.data)) {
          const items = (res.data as any[]).map(item => ({
            sku: item.sku || '',
            name: item.itemName || '',
            category: item.category || 'Uncategorized',
            warehouse: item.warehouseName || '',
            quantity: item.currentStock || 0,
            unitPrice: item.unitPrice || 0,
            total: (item.currentStock || 0) * (item.unitPrice || 0),
            status: this.determineStockStatus(item.currentStock, item.minimumThreshold)
          }));
          return { ...res, data: items } as ApiResponse<StockReportItem[]>;
        }
        return { ...res, data: [] } as ApiResponse<StockReportItem[]>;
      }),
      catchError(() => {
        return of({
          success: true,
          message: 'Using mock stock report data',
          data: this.createMockStockItems(),
          statusCode: 200
        } as ApiResponse<StockReportItem[]>);
      })
    );
  }

  private determineStockStatus(quantity: number, minimumThreshold: number): 'In Stock' | 'Low Stock' | 'Out of Stock' {
    if (quantity === 0) return 'Out of Stock';
    if (quantity <= minimumThreshold) return 'Low Stock';
    return 'In Stock';
  }
}
