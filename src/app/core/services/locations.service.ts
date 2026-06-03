import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface LocationDto {
  id: string;
  name?: string;
  locationType?: string;
  propertiesCount: number;
  safetyBoxesCount: number;
}

export interface CreateLocationCommand {
  name: string;
  locationType?: string;
}

export interface UpdateLocationCommand {
  id: string;
  name?: string;
  locationType?: string;
}

@Injectable({ providedIn: 'root' })
export class LocationsService {
  constructor(private apiService: ApiService) {}

  getAll(params?: { locationType?: string; searchTerm?: string }): Observable<ApiResponseModel<LocationDto[]>> {
    return this.apiService.get<LocationDto[]>('Locations', params);
  }

  getById(id: string): Observable<ApiResponseModel<LocationDto>> {
    return this.apiService.get<LocationDto>(`Locations/${id}`);
  }

  create(data: CreateLocationCommand): Observable<ApiResponseModel<string>> {
    return this.apiService.post<string>('Locations', data);
  }

  update(data: UpdateLocationCommand): Observable<ApiResponseModel<any>> {
    return this.apiService.put<any>(`Locations/${data.id}`, data);
  }

  delete(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<any>(`Locations/${id}`);
  }
}
