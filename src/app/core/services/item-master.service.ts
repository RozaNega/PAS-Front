import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface ItemMasterListDto {
  id: string;
  sku?: string;
  itemName?: string;
  categoryId?: string;
  categoryName?: string;
  unitOfMeasure?: string;
  currentStock?: number;
  reservedStock?: number;
  availableStock?: number;
  isLowStock?: boolean;
  // Backward-compat aliases used by existing components
  description?: string;
  isActive?: boolean;
  /** @deprecated use availableStock */
  stockQuantity?: number;
}

export interface ItemMasterDetailDto {
  id: string;
  sku?: string;
  itemName?: string;
  categoryId: string;
  categoryName?: string;
  unitOfMeasure?: string;
  requiresInspection: boolean;
  minStockLevel: number;
  totalStock: number;
  availableStock: number;
  stockLocations: ItemStockLocationDto[];
  recentMovements: ItemMovementDto[];
  createdAt: string;
  updatedAt?: string;
}

export interface ItemStockLocationDto {
  shelfId: string;
  shelfLocation?: string;
  warehouseName?: string;
  currentQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
}

export interface ItemMovementDto {
  date: string;
  transactionType?: string;
  quantityChange: number;
  reference?: string;
  shelfLocation?: string;
}

export interface LowStockItemDto {
  itemId: string;
  itemName?: string;
  sku?: string;
  currentStock: number;
  minStockLevel: number;
  deficit: number;
  locations: string[];
}

export interface PaginatedItemResponse {
  items: ItemMasterListDto[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface CreateItemMasterCommand {
  sku?: string;
  itemName?: string;
  categoryId: string;
  unitOfMeasure?: string;
  requiresInspection: boolean;
  minStockLevel: number;
}

export interface UpdateItemMasterCommand {
  id: string;
  sku?: string;
  itemName?: string;
  categoryId: string;
  unitOfMeasure?: string;
  requiresInspection: boolean;
  minStockLevel: number;
}

@Injectable({ providedIn: 'root' })
export class ItemMasterService {
  constructor(private apiService: ApiService) {}

  getAll(params?: {
    searchTerm?: string;
    categoryId?: string;
    lowStockOnly?: boolean;
    requiresInspection?: boolean;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<ApiResponseModel<PaginatedItemResponse>> {
    return this.apiService.get<ApiResponseModel<PaginatedItemResponse>>('ItemMasters', params);
  }

  /** @deprecated use getAll() */
  getItemMasters(params?: any): Observable<ApiResponseModel<PaginatedItemResponse>> {
    return this.getAll(params);
  }

  getById(id: string): Observable<ApiResponseModel<ItemMasterDetailDto>> {
    return this.apiService.get<ApiResponseModel<ItemMasterDetailDto>>(`ItemMasters/${id}`);
  }

  create(data: CreateItemMasterCommand): Observable<ApiResponseModel<string>> {
    return this.apiService.post<ApiResponseModel<string>>('ItemMasters', data);
  }

  update(data: UpdateItemMasterCommand): Observable<ApiResponseModel<any>> {
    return this.apiService.put<ApiResponseModel<any>>(`ItemMasters/${data.id}`, data);
  }

  delete(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<ApiResponseModel<any>>(`ItemMasters/${id}`);
  }

  getByCategory(categoryId: string): Observable<ApiResponseModel<ItemMasterListDto[]>> {
    return this.apiService.get<ApiResponseModel<ItemMasterListDto[]>>(`ItemMasters/by-category/${categoryId}`);
  }

  getLowStockItems(): Observable<ApiResponseModel<LowStockItemDto[]>> {
    return this.apiService.get<ApiResponseModel<LowStockItemDto[]>>('ItemMasters/low-stock');
  }
}
