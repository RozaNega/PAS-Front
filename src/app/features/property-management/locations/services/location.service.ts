import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { ApiResponseModel } from '../../../../core/models/api-response.model';

export interface LocationDto {
  id: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  constructor(private apiService: ApiService) {}

  getAll(params?: any): Observable<ApiResponseModel<LocationDto[]>> {
    return this.apiService.get<ApiResponseModel<LocationDto[]>>('Locations', params);
  }

  getById(id: string): Observable<ApiResponseModel<LocationDto>> {
    return this.apiService.get<ApiResponseModel<LocationDto>>(`Locations/${id}`);
  }

  create(data: any): Observable<ApiResponseModel<string>> {
    return this.apiService.post<ApiResponseModel<string>>('Locations', data);
  }

  update(id: string, data: any): Observable<ApiResponseModel<any>> {
    return this.apiService.put<ApiResponseModel<any>>(`Locations/${id}`, data);
  }

  delete(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<ApiResponseModel<any>>(`Locations/${id}`);
  }
}
