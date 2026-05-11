import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { ApiResponseModel } from '../../../../core/models/api-response.model';

export interface SafetyBoxDto {
  id: string;
  boxNumber: string;
  locationId: string;
  shelfId: string;
  description?: string;
  capacity: number;
  currentCount: number;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SafetyBoxService {
  constructor(private apiService: ApiService) {}

  getAll(params?: any): Observable<ApiResponseModel<SafetyBoxDto[]>> {
    return this.apiService.get<ApiResponseModel<SafetyBoxDto[]>>('SafetyBoxes', params);
  }

  getById(id: string): Observable<ApiResponseModel<SafetyBoxDto>> {
    return this.apiService.get<ApiResponseModel<SafetyBoxDto>>(`SafetyBoxes/${id}`);
  }

  getByLocation(locationId: string): Observable<ApiResponseModel<SafetyBoxDto[]>> {
    return this.apiService.get<ApiResponseModel<SafetyBoxDto[]>>(`SafetyBoxes/by-location/${locationId}`);
  }

  create(data: any): Observable<ApiResponseModel<string>> {
    return this.apiService.post<ApiResponseModel<string>>('SafetyBoxes', data);
  }

  update(id: string, data: any): Observable<ApiResponseModel<any>> {
    return this.apiService.put<ApiResponseModel<any>>(`SafetyBoxes/${id}`, data);
  }

  delete(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<ApiResponseModel<any>>(`SafetyBoxes/${id}`);
  }
}
