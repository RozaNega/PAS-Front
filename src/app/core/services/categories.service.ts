import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface CategoryDto {
  id: string;
  name: string;
  description?: string;
  parentCategoryId?: string;
  isActive: boolean;
}

export interface CategoryHierarchyDto {
  id: string;
  name: string;
  description?: string;
  children: CategoryHierarchyDto[];
}

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  constructor(private apiService: ApiService) {}

  getAll(params?: { includeInactive?: boolean; parentCategoryId?: string; searchTerm?: string }): Observable<ApiResponseModel<CategoryDto[]>> {
    return this.apiService.get<ApiResponseModel<CategoryDto[]>>('Categories', params);
  }

  getById(id: string): Observable<ApiResponseModel<CategoryDto>> {
    return this.apiService.get<ApiResponseModel<CategoryDto>>(`Categories/${id}`);
  }

  getHierarchy(): Observable<ApiResponseModel<CategoryHierarchyDto[]>> {
    return this.apiService.get<ApiResponseModel<CategoryHierarchyDto[]>>('Categories/hierarchy');
  }

  createCategory(data: { name: string; description?: string; parentCategoryId?: string | null }): Observable<ApiResponseModel<string>> {
    return this.apiService.post<ApiResponseModel<string>>('Categories', data);
  }

  create(data: any): Observable<ApiResponseModel<string>> {
    return this.apiService.post<ApiResponseModel<string>>('Categories', data);
  }

  update(id: string, data: any): Observable<ApiResponseModel<any>> {
    return this.apiService.put<ApiResponseModel<any>>(`Categories/${id}`, data);
  }

  delete(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<ApiResponseModel<any>>(`Categories/${id}`);
  }
}
