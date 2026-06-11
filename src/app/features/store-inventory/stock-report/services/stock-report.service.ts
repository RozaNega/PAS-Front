import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
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
    );
  }

  private determineStockStatus(quantity: number, minimumThreshold: number): 'In Stock' | 'Low Stock' | 'Out of Stock' {
    if (quantity === 0) return 'Out of Stock';
    if (quantity <= minimumThreshold) return 'Low Stock';
    return 'In Stock';
  }
}
