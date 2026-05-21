import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../../types/api-response.type';
import { normalizeApiResponseModel, normalizePasListResponse } from '../utils/pas-api-json.util';

export interface CategoryDto {
  id: string;
  name: string;
  description?: string;
  parentCategoryId?: string;
  isActive: boolean;
  subCategoriesCount?: number;
  itemsCount?: number;
  parentCategoryName?: string;
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

  getAll(params?: { includeInactive?: boolean; parentCategoryId?: string; searchTerm?: string }): Observable<ApiResponse<CategoryDto[]>> {
    return this.apiService.get<unknown>('Categories', params).pipe(
      map(res => normalizePasListResponse<CategoryDto>(res) as ApiResponse<CategoryDto[]>)
    );
  }

  getById(id: string): Observable<ApiResponse<CategoryDto>> {
    return this.apiService.get<unknown>(`Categories/${id}`).pipe(
      map(res => normalizeApiResponseModel<CategoryDto>(res) as ApiResponse<CategoryDto>)
    );
  }

  getHierarchy(): Observable<ApiResponse<CategoryHierarchyDto[]>> {
    return this.apiService.get<unknown>('Categories/hierarchy').pipe(
      map(res => normalizePasListResponse<CategoryHierarchyDto>(res) as ApiResponse<CategoryHierarchyDto[]>)
    );
  }

  createCategory(data: { name: string; description?: string; parentCategoryId?: string | null }): Observable<ApiResponse<string>> {
    return this.apiService.post<unknown>('Categories', data).pipe(
      map(res => normalizeApiResponseModel<string>(res) as ApiResponse<string>)
    );
  }

  update(id: string, data: any): Observable<ApiResponse<any>> {
    return this.apiService.put<unknown>(`Categories/${id}`, data).pipe(
      map(res => normalizeApiResponseModel<any>(res) as ApiResponse<any>)
    );
  }

  delete(id: string): Observable<ApiResponse<any>> {
    return this.apiService.delete<unknown>(`Categories/${id}`).pipe(
      map(res => normalizeApiResponseModel<any>(res) as ApiResponse<any>)
    );
  }
}

