import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export type LowStockAlertStatus = 'New' | 'Acknowledged' | 'Ordered' | 'Resolved';

export interface LowStockAlertDto {
  id: string;
  itemId: string;
  itemName?: string;
  sku?: string;
  currentQuantity: number;
  minQuantity: number;
  deficit: number;
  status: LowStockAlertStatus;
  severity: 'Critical' | 'Warning' | 'Info';
  warehouseId?: string;
  warehouseName?: string;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface PaginatedLowStockAlertResponse {
  items: LowStockAlertDto[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface LowStockCheckResultDto {
  alertsCreated: number;
  itemsChecked: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  details: LowStockAlertDto[];
}

@Injectable({ providedIn: 'root' })
export class LowStockAlertService {
  constructor(private apiService: ApiService) {}

  getAll(params?: {
    status?: LowStockAlertStatus;
    severity?: 'Critical' | 'Warning' | 'Info';
    warehouseId?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<ApiResponseModel<PaginatedLowStockAlertResponse>> {
    return this.apiService.get<PaginatedLowStockAlertResponse>('LowStockAlerts', params);
  }

  getById(id: string): Observable<ApiResponseModel<LowStockAlertDto>> {
    return this.apiService.get<LowStockAlertDto>(`LowStockAlerts/${id}`);
  }

  /** Trigger the scheduled low-stock check on demand. */
  check(): Observable<ApiResponseModel<LowStockCheckResultDto>> {
    return this.apiService.post<LowStockCheckResultDto>('LowStockAlerts/check', {});
  }

  acknowledge(id: string): Observable<ApiResponseModel<LowStockAlertDto>> {
    return this.apiService.post<LowStockAlertDto>(`LowStockAlerts/${id}/acknowledge`, {});
  }

  resolve(id: string): Observable<ApiResponseModel<LowStockAlertDto>> {
    return this.apiService.post<LowStockAlertDto>(`LowStockAlerts/${id}/resolve`, {});
  }
}
