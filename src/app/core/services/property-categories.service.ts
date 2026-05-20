import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface PropertyCategoryDto {
  id: string;
  name?: string;
  description?: string;
  propertiesCount: number;
}

export interface PropertyCategoryDetailDto extends PropertyCategoryDto {
  properties: PropertyCategoryPropertyDto[];
  createdAt: string;
  updatedAt?: string;
}

export interface PropertyCategoryPropertyDto {
  id: string;
  tagNumber?: string;
  name?: string;
  locationName?: string;
}

export interface CreatePropertyCategoryCommand {
  name: string;
  description?: string;
}

export interface UpdatePropertyCategoryCommand {
  id: string;
  name?: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class PropertyCategoriesService {
  constructor(private apiService: ApiService) {}

  getAll(params?: { searchTerm?: string }): Observable<ApiResponseModel<PropertyCategoryDto[]>> {
    return this.apiService.get<ApiResponseModel<PropertyCategoryDto[]>>('PropertyCategories', params);
  }

  getById(id: string): Observable<ApiResponseModel<PropertyCategoryDetailDto>> {
    return this.apiService.get<ApiResponseModel<PropertyCategoryDetailDto>>(`PropertyCategories/${id}`);
  }

  create(data: CreatePropertyCategoryCommand): Observable<ApiResponseModel<string>> {
    return this.apiService.post<ApiResponseModel<string>>('PropertyCategories', data);
  }

  update(data: UpdatePropertyCategoryCommand): Observable<ApiResponseModel<any>> {
    return this.apiService.put<ApiResponseModel<any>>(`PropertyCategories/${data.id}`, data);
  }

  delete(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<ApiResponseModel<any>>(`PropertyCategories/${id}`);
  }
}
