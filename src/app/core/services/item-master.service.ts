import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../../types/api-response.type';
import { normalizePasListResponse, normalizeApiResponseModel } from '../utils/pas-api-json.util';

export interface ItemMasterListDto {
  id: string;
  itemName: string;
  sku: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  unitOfMeasure: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  minStockLevel: number;
  requiresInspection: boolean;
  isLowStock: boolean;
  stockQuantity: number;
  minimumThreshold?: number;
  maximumThreshold?: number;
  isActive: boolean;
}

export interface ItemMasterWriteRequest {
  sku: string;
  itemName: string;
  categoryId: string;
  unitOfMeasure: string;
  requiresInspection: boolean;
  minStockLevel: number;
  categoryName?: string;
  stockQuantity?: number;
  isActive?: boolean;
}

export interface ItemMasterBulkUpdateRequest {
  categoryId?: string;
  unitOfMeasure?: string;
  requiresInspection?: boolean;
  minStockLevel?: number;
  categoryName?: string;
}

export interface PaginatedItemResponse {
  items: ItemMasterListDto[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

@Injectable({ providedIn: 'root' })
export class ItemMasterService {
  constructor(private apiService: ApiService) {}

  getItemMasters(params?: any): Observable<ApiResponse<PaginatedItemResponse>> {
    return this.apiService.get<unknown>('ItemMasters', params).pipe(
      map(res => normalizeApiResponseModel<PaginatedItemResponse>(res) as ApiResponse<PaginatedItemResponse>)
    );
  }

  getItemMasterById(id: string): Observable<ApiResponse<ItemMasterListDto>> {
    return this.apiService.get<unknown>(`ItemMasters/${id}`).pipe(
      map(res => normalizeApiResponseModel<ItemMasterListDto>(res) as ApiResponse<ItemMasterListDto>)
    );
  }

  createItemMaster(item: Partial<ItemMasterWriteRequest> & Record<string, unknown>): Observable<ApiResponse<string>> {
    return this.apiService.post<unknown>('ItemMasters', item).pipe(
      map(res => normalizeApiResponseModel<string>(res) as ApiResponse<string>)
    );
  }

  updateItemMaster(id: string, item: Partial<ItemMasterWriteRequest> & Record<string, unknown>): Observable<ApiResponse<object>> {
    return this.apiService.put<unknown>(`ItemMasters/${id}`, item).pipe(
      map(res => normalizeApiResponseModel<object>(res) as ApiResponse<object>)
    );
  }

  deleteItemMaster(id: string): Observable<ApiResponse<object>> {
    return this.apiService.delete<unknown>(`ItemMasters/${id}`).pipe(
      map(res => normalizeApiResponseModel<object>(res) as ApiResponse<object>)
    );
  }

  getItemsByCategory(categoryId: string): Observable<ApiResponse<ItemMasterListDto[]>> {
    return this.apiService.get<unknown>(`ItemMasters/by-category/${categoryId}`).pipe(
      map(res => normalizePasListResponse<ItemMasterListDto>(res) as ApiResponse<ItemMasterListDto[]>)
    );
  }

  getLowStockItems(): Observable<ApiResponse<ItemMasterListDto[]>> {
    return this.apiService.get<unknown>('ItemMasters/low-stock').pipe(
      map(res => normalizePasListResponse<ItemMasterListDto>(res) as ApiResponse<ItemMasterListDto[]>)
    );
  }
}

