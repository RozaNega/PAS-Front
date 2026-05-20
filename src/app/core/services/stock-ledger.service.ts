import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface StockLedgerDto {
  id: string;
  createdDate: string;
  itemId: string;
  itemName?: string;
  sku?: string;
  shelfId: string;
  shelfLocation?: string;
  warehouseName?: string;
  quantityChange: number;
  transactionType?: string;
  referenceId: string;
  referenceNumber?: string;
  batchNumber?: string;
  expiryDate?: string;
  reason?: string;
  remarks?: string;
  performedBy?: string;
}

export interface StockMovementDto {
  id: string;
  date: string;
  itemId: string;
  itemName?: string;
  sku?: string;
  shelfId: string;
  shelfLocation?: string;
  warehouseName?: string;
  quantityChange: number;
  transactionType?: string;
  referenceId: string;
  batchNumber?: string;
}

export interface PaginatedStockLedgerResponse {
  items: StockLedgerDto[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

@Injectable({ providedIn: 'root' })
export class StockLedgerService {
  constructor(private apiService: ApiService) {}

  getAll(params?: {
    itemId?: string;
    shelfId?: string;
    transactionType?: string;
    fromDate?: string;
    toDate?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<ApiResponseModel<PaginatedStockLedgerResponse>> {
    return this.apiService.get<ApiResponseModel<PaginatedStockLedgerResponse>>('StockLedger', params);
  }

  getByItem(itemId: string): Observable<ApiResponseModel<StockMovementDto[]>> {
    return this.apiService.get<ApiResponseModel<StockMovementDto[]>>(`StockLedger/by-item/${itemId}`);
  }

  getByDateRange(fromDate: string, toDate: string): Observable<ApiResponseModel<StockMovementDto[]>> {
    return this.apiService.get<ApiResponseModel<StockMovementDto[]>>('StockLedger/by-date', { fromDate, toDate });
  }
}
