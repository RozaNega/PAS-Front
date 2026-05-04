import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface InventoryStockDto {
  id: string;
  itemId: string;
  shelfId: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lastUpdated: string;
}

export interface WarehouseDto {
  id: string;
  name: string;
  location: string;
  isActive: boolean;
}

export interface ShelfLocationDto {
  id: string;
  warehouseId: string;
  code: string;
  location: string;
  capacity: number;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  constructor(private apiService: ApiService) {}

  // Inventory Stock
  getAllStock(params?: any): Observable<ApiResponseModel<InventoryStockDto[]>> {
    return this.apiService.get<ApiResponseModel<InventoryStockDto[]>>('InventoryStock', params);
  }

  getStockByShelf(shelfId: string): Observable<ApiResponseModel<InventoryStockDto[]>> {
    return this.apiService.get<ApiResponseModel<InventoryStockDto[]>>(`InventoryStock/by-shelf/${shelfId}`);
  }

  getStockByItem(itemId: string): Observable<ApiResponseModel<InventoryStockDto[]>> {
    return this.apiService.get<ApiResponseModel<InventoryStockDto[]>>(`InventoryStock/by-item/${itemId}`);
  }

  reserveStock(data: any): Observable<ApiResponseModel<any>> {
    return this.apiService.post<ApiResponseModel<any>>('InventoryStock/reserve', data);
  }

  releaseStock(data: any): Observable<ApiResponseModel<any>> {
    return this.apiService.post<ApiResponseModel<any>>('InventoryStock/release', data);
  }

  adjustStock(data: any): Observable<ApiResponseModel<any>> {
    return this.apiService.post<ApiResponseModel<any>>('InventoryStock/adjust', data);
  }

  // Warehouses
  getAllWarehouses(params?: { searchTerm?: string }): Observable<ApiResponseModel<WarehouseDto[]>> {
    return this.apiService.get<ApiResponseModel<WarehouseDto[]>>('Warehouses', params);
  }

  getWarehouseById(id: string): Observable<ApiResponseModel<WarehouseDto>> {
    return this.apiService.get<ApiResponseModel<WarehouseDto>>(`Warehouses/${id}`);
  }

  createWarehouse(data: any): Observable<ApiResponseModel<string>> {
    return this.apiService.post<ApiResponseModel<string>>('Warehouses', data);
  }

  updateWarehouse(id: string, data: any): Observable<ApiResponseModel<any>> {
    return this.apiService.put<ApiResponseModel<any>>(`Warehouses/${id}`, data);
  }

  deleteWarehouse(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<ApiResponseModel<any>>(`Warehouses/${id}`);
  }

  // Shelf Locations
  getAllShelves(params?: { warehouseId?: string; searchTerm?: string }): Observable<ApiResponseModel<ShelfLocationDto[]>> {
    return this.apiService.get<ApiResponseModel<ShelfLocationDto[]>>('ShelfLocations', params);
  }

  getShelfById(id: string): Observable<ApiResponseModel<ShelfLocationDto>> {
    return this.apiService.get<ApiResponseModel<ShelfLocationDto>>(`ShelfLocations/${id}`);
  }

  createShelf(data: any): Observable<ApiResponseModel<string>> {
    return this.apiService.post<ApiResponseModel<string>>('ShelfLocations', data);
  }

  updateShelf(id: string, data: any): Observable<ApiResponseModel<any>> {
    return this.apiService.put<ApiResponseModel<any>>(`ShelfLocations/${id}`, data);
  }

  deleteShelf(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<ApiResponseModel<any>>(`ShelfLocations/${id}`);
  }
}
