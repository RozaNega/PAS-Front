import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { ApiResponseModel } from '../../../../core/models/api-response.model';

export interface PropertyTypeDto {
  id: string;
  name: string;
  description?: string;
  code: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PropertyTypeService {
  constructor(private apiService: ApiService) {}

  getAll(params?: any): Observable<ApiResponseModel<PropertyTypeDto[]>> {
    return this.apiService.get<ApiResponseModel<PropertyTypeDto[]>>('PropertyTypes', params);
  }

  getById(id: string): Observable<ApiResponseModel<PropertyTypeDto>> {
    return this.apiService.get<ApiResponseModel<PropertyTypeDto>>(`PropertyTypes/${id}`);
  }

  create(data: any): Observable<ApiResponseModel<string>> {
    return this.apiService.post<ApiResponseModel<string>>('PropertyTypes', data);
  }

  update(id: string, data: any): Observable<ApiResponseModel<any>> {
    return this.apiService.put<ApiResponseModel<any>>(`PropertyTypes/${id}`, data);
  }

  delete(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<ApiResponseModel<any>>(`PropertyTypes/${id}`);
  }
}
