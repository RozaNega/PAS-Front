import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../../config/api.config';
import { ApiResponse } from '../../../../types/api-response.type';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  constructor(private apiService: ApiService) {}

  getLocations(params?: any): Observable<ApiResponse<any[]>> {
    return this.apiService.get<ApiResponse<any[]>>(API_ENDPOINTS.LOCATIONS.GET_ALL, params);
  }
}
