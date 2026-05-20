import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface CategoryDto {
  id: string;
  name?: string;
  description?: string;
  parentCategoryId?: string;
  parentCategoryName?: string;
  subCategoriesCount: number;
  itemsCount: number;
  // Backward-compat field used by existing components
  isActive?: boolean;
}

export interface CategoryDetailDto extends CategoryDto {
  subCategories: CategoryDto[];
  items: CategoryItemDto[];
  createdAt: string;
  updatedAt?: string;
}

export interface CategoryItemDto {
  id: string;
  sku?: string;
  itemName?: string;
  unitOfMeasure?: string;
  currentStock: number;
}

export interface CategoryHierarchyDto {
  id: string;
  name?: string;
  description?: string;
  children: CategoryHierarchyDto[];
}

export interface CreateCategoryCommand {
  name: string;
  description?: string;
  parentCategoryId?: string | null;
}

export interface UpdateCategoryCommand {
  id: string;
  name?: string;
  description?: string;
  parentCategoryId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  constructor(private apiService: ApiService) {}

  getAll(params?: { includeInactive?: boolean; parentCategoryId?: string; searchTerm?: string }): Observable<ApiResponseModel<CategoryDto[]>> {
    return this.apiService.get<ApiResponseModel<CategoryDto[]>>('Categories', params);
  }

  getById(id: string): Observable<ApiResponseModel<CategoryDetailDto>> {
    return this.apiService.get<ApiResponseModel<CategoryDetailDto>>(`Categories/${id}`);
  }

  getHierarchy(): Observable<ApiResponseModel<CategoryHierarchyDto[]>> {
    return this.apiService.get<ApiResponseModel<CategoryHierarchyDto[]>>('Categories/hierarchy');
  }

  create(data: CreateCategoryCommand): Observable<ApiResponseModel<string>> {
    return this.apiService.post<ApiResponseModel<string>>('Categories', data);
  }

  /** @deprecated use create() */
  createCategory(data: CreateCategoryCommand): Observable<ApiResponseModel<string>> {
    return this.create(data);
  }

  update(data: UpdateCategoryCommand): Observable<ApiResponseModel<any>> {
    return this.apiService.put<ApiResponseModel<any>>(`Categories/${data.id}`, data);
  }

  /** @deprecated use update(UpdateCategoryCommand) */
  updateById(id: string, data: Omit<UpdateCategoryCommand, 'id'>): Observable<ApiResponseModel<any>> {
    return this.update({ id, ...data });
  }

  delete(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<ApiResponseModel<any>>(`Categories/${id}`);
  }
}
