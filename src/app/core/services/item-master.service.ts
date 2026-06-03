import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ItemMaster {
  id: number;
  itemName: string;
  sku: string;
  description: string;
  categoryName: string;
  unitOfMeasure: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  minStockLevel: number;
  requiresInspection: boolean;
  isLowStock: boolean;
  stockQuantity: number;
  isActive: boolean;
  [key: string]: unknown;
}

export interface ItemMasterPaginatedResponse {
  items: ItemMaster[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export type ItemMasterListDto = ItemMaster;

export interface ItemMasterApiResponse {
  success: boolean;
  message: string;
  data: ItemMasterPaginatedResponse | ItemMaster | string | null;
  statusCode: number;
}

@Injectable({
  providedIn: 'root'
})
export class ItemMasterService {
  private baseUrl = '/api/ItemMasters';

  constructor(private http: HttpClient) {}

  getItemMasters(pageNumber: number = 1, pageSize: number = 50): Observable<ItemMasterApiResponse> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<ItemMasterApiResponse>(this.baseUrl, { params });
  }

  getItemMaster(id: number): Observable<ItemMasterApiResponse> {
    return this.http.get<ItemMasterApiResponse>(`${this.baseUrl}/${id}`);
  }

  createItemMaster(item: Partial<ItemMaster>): Observable<ItemMasterApiResponse> {
    return this.http.post<ItemMasterApiResponse>(this.baseUrl, item);
  }

  updateItemMaster(id: number, item: Partial<ItemMaster>): Observable<ItemMasterApiResponse> {
    return this.http.put<ItemMasterApiResponse>(`${this.baseUrl}/${id}`, item);
  }

  deleteItemMaster(id: number): Observable<ItemMasterApiResponse> {
    return this.http.delete<ItemMasterApiResponse>(`${this.baseUrl}/${id}`);
  }

  searchItemMasters(searchTerm: string): Observable<ItemMaster[]> {
    let params = new HttpParams().set('searchTerm', searchTerm);
    return this.http.get<ItemMasterApiResponse>(this.baseUrl, { params }).pipe(
      map(response => {
        if (response.success && response.data && typeof response.data === 'object' && 'items' in response.data) {
          return (response.data as ItemMasterPaginatedResponse).items;
        }
        return [];
      })
    );
  }
}
