import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface PropertyTypeDto {
  id: string;
  name?: string;
  description?: string;
  propertiesCount: number;
}

export interface CreatePropertyTypeCommand {
  name: string;
  description?: string;
}

export interface UpdatePropertyTypeCommand {
  id: string;
  name?: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class PropertyTypesService {
  constructor(private apiService: ApiService) {}

  getAll(params?: { searchTerm?: string }): Observable<ApiResponseModel<PropertyTypeDto[]>> {
    return this.apiService.get<ApiResponseModel<PropertyTypeDto[]>>('PropertyTypes', params);
  }

  getById(id: string): Observable<ApiResponseModel<PropertyTypeDto>> {
    return this.apiService.get<ApiResponseModel<PropertyTypeDto>>(`PropertyTypes/${id}`);
  }

  create(data: CreatePropertyTypeCommand): Observable<ApiResponseModel<string>> {
    return this.apiService.post<ApiResponseModel<string>>('PropertyTypes', data);
  }

  update(data: UpdatePropertyTypeCommand): Observable<ApiResponseModel<any>> {
    return this.apiService.put<ApiResponseModel<any>>(`PropertyTypes/${data.id}`, data);
  }

  delete(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<ApiResponseModel<any>>(`PropertyTypes/${id}`);
  }
}
