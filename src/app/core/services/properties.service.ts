import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface PropertyDto {
  id: string;
  name: string;
  description?: string;
  locationId: string;
  locationName?: string;
  propertyTypeId: string;
  propertyTypeName?: string;
  propertyCategoryId: string;
  propertyCategoryName?: string;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  totalValue?: number;
  unitPrice?: number;
  quantity?: number;
  safetyBoxId?: string;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class PropertiesService {
  constructor(private apiService: ApiService) {}

  getAll(params?: any): Observable<ApiResponseModel<PropertyDto[]>> {
    return this.apiService.get<PropertyDto[]>('Properties', params);
  }

  getById(id: string): Observable<ApiResponseModel<PropertyDto>> {
    return this.apiService.get<PropertyDto>(`Properties/${id}`);
  }

  getByLocation(locationId: string): Observable<ApiResponseModel<PropertyDto[]>> {
    return this.apiService.get<PropertyDto[]>(`Properties/by-location/${locationId}`);
  }

  create(data: any): Observable<ApiResponseModel<string>> {
    return this.apiService.post<string>('Properties', data);
  }

  update(id: string, data: any): Observable<ApiResponseModel<any>> {
    return this.apiService.put<any>(`Properties/${id}`, data);
  }

  delete(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<any>(`Properties/${id}`);
  }

  transfer(id: string, data: any): Observable<ApiResponseModel<any>> {
    return this.apiService.post<any>(`Properties/${id}/transfer`, data);
  }
}
