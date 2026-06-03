import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { ApiResponseModel } from '../../../../core/models/api-response.model';

export interface PropertyCategoryDto {
  id: string;
  name: string;
  description?: string;
  code: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PropertyCategoryService {
  constructor(private apiService: ApiService) {}

  getAll(params?: any): Observable<ApiResponseModel<PropertyCategoryDto[]>> {
    return this.apiService.get<PropertyCategoryDto[]>('PropertyCategories', params);
  }

  getById(id: string): Observable<ApiResponseModel<PropertyCategoryDto>> {
    return this.apiService.get<PropertyCategoryDto>(`PropertyCategories/${id}`);
  }

  create(data: any): Observable<ApiResponseModel<string>> {
    return this.apiService.post<string>('PropertyCategories', data);
  }

  update(id: string, data: any): Observable<ApiResponseModel<any>> {
    return this.apiService.put<any>(`PropertyCategories/${id}`, data);
  }

  delete(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<any>(`PropertyCategories/${id}`);
  }
}
