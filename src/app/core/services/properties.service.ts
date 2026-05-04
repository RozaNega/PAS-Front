import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface PropertyDto {
  id: string;
  name: string;
  description?: string;
  locationId: string;
  propertyTypeId: string;
  propertyCategoryId: string;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  safetyBoxId?: string;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class PropertiesService {
  constructor(private apiService: ApiService) {}

  getAll(params?: any): Observable<ApiResponseModel<PropertyDto[]>> {
    return this.apiService.get<ApiResponseModel<PropertyDto[]>>('Properties', params);
  }

  getById(id: string): Observable<ApiResponseModel<PropertyDto>> {
    return this.apiService.get<ApiResponseModel<PropertyDto>>(`Properties/${id}`);
  }

  getByLocation(locationId: string): Observable<ApiResponseModel<PropertyDto[]>> {
    return this.apiService.get<ApiResponseModel<PropertyDto[]>>(`Properties/by-location/${locationId}`);
  }

  create(data: any): Observable<ApiResponseModel<string>> {
    return this.apiService.post<ApiResponseModel<string>>('Properties', data);
  }

  update(id: string, data: any): Observable<ApiResponseModel<any>> {
    return this.apiService.put<ApiResponseModel<any>>(`Properties/${id}`, data);
  }

  delete(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<ApiResponseModel<any>>(`Properties/${id}`);
  }

  transfer(id: string, data: any): Observable<ApiResponseModel<any>> {
    return this.apiService.post<ApiResponseModel<any>>(`Properties/${id}/transfer`, data);
  }
}
