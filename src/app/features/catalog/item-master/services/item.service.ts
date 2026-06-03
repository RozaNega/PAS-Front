import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../../config/api.config';
import { ApiResponse, PaginatedResult } from '../../../../types/api-response.type';

@Injectable({
  providedIn: 'root'
})
export class ItemService {
  constructor(private apiService: ApiService) {}

  getItems(params?: any): Observable<ApiResponse<PaginatedResult<any>>> {
    return this.apiService.get<PaginatedResult<any>>(API_ENDPOINTS.ITEMS.GET_ALL, params);
  }
}
