import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../../config/api.config';
import { ApiResponse } from '../../../../types/api-response.type';

@Injectable({
  providedIn: 'root'
})
export class PropertyTypeService {
  constructor(private apiService: ApiService) {}

  getPropertyTypes(params?: any): Observable<ApiResponse<any[]>> {
    return this.apiService.get<ApiResponse<any[]>>(API_ENDPOINTS.PROPERTY_TYPES.GET_ALL, params);
  }
}
