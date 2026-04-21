import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../config/api.config';
import { ApiResponse } from '../../../types/api-response.type';

export interface InventoryValuationReport {
  generatedAt: string;
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  items: InventoryValuationItem[];
  byLocation: InventoryValuationLocation[];
}

export interface InventoryValuationItem {
  itemId: string;
  itemName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  locations: string[];
}

export interface InventoryValuationLocation {
  locationName: string;
  itemCount: number;
  quantity: number;
  totalValue: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  constructor(private readonly apiService: ApiService) {}

  getInventoryValuation(params?: Record<string, unknown>): Observable<ApiResponse<InventoryValuationReport>> {
    return this.apiService.get<ApiResponse<InventoryValuationReport>>(API_ENDPOINTS.REPORTS.INVENTORY_VALUATION, params);
  }

  getDisposalReport(params?: Record<string, unknown>): Observable<ApiResponse<unknown>> {
    return this.apiService.get<ApiResponse<unknown>>(API_ENDPOINTS.REPORTS.DISPOSAL, params);
  }

  getStockMovementReport(params?: Record<string, unknown>): Observable<ApiResponse<unknown>> {
    return this.apiService.get<ApiResponse<unknown>>(API_ENDPOINTS.REPORTS.STOCK_MOVEMENT, params);
  }

  getRequisitionHistoryReport(params?: Record<string, unknown>): Observable<ApiResponse<unknown>> {
    return this.apiService.get<ApiResponse<unknown>>(API_ENDPOINTS.REPORTS.REQUISITION_HISTORY, params);
  }
}
