import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface ItemMasterListDto {
  id: string;
  itemName: string;
  sku: string;
  description?: string;
  unitOfMeasure: string;
  stockQuantity: number;
  categoryId?: string;
  categoryName?: string;
  isActive: boolean;
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

  getItemMasters(params?: any): Observable<ApiResponseModel<PaginatedItemResponse>> {
    return this.apiService.get<ApiResponseModel<PaginatedItemResponse>>('ItemMasters', params);
  }

  getItemMasterById(id: string): Observable<ApiResponseModel<ItemMasterListDto>> {
    return this.apiService.get<ApiResponseModel<ItemMasterListDto>>(`ItemMasters/${id}`);
  }

  createItemMaster(item: Partial<ItemMasterListDto>): Observable<ApiResponseModel<string>> {
    return this.apiService.post<ApiResponseModel<string>>('ItemMasters', item);
  }

  updateItemMaster(id: string, item: Partial<ItemMasterListDto>): Observable<ApiResponseModel<object>> {
    return this.apiService.put<ApiResponseModel<object>>(`ItemMasters/${id}`, item);
  }

  deleteItemMaster(id: string): Observable<ApiResponseModel<object>> {
    return this.apiService.delete<ApiResponseModel<object>>(`ItemMasters/${id}`);
  }

  getItemsByCategory(categoryId: string): Observable<ApiResponseModel<ItemMasterListDto[]>> {
    return this.apiService.get<ApiResponseModel<ItemMasterListDto[]>>(`ItemMasters/by-category/${categoryId}`);
  }

  getLowStockItems(): Observable<ApiResponseModel<ItemMasterListDto[]>> {
    return this.apiService.get<ApiResponseModel<ItemMasterListDto[]>>('ItemMasters/low-stock');
  }
}
