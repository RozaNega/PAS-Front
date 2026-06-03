import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type CategoryDto = Category;

export interface Category {
  id: number;
  categoryName: string;
  description: string;
  isActive: boolean;
  name?: string;
  parentCategoryId?: number;
  parentCategoryName?: string;
  itemsCount?: number;
  subCategoriesCount?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;
}

@Injectable({
  providedIn: 'root'
})
export class CategoriesService {
  private baseUrl = '/api/Categories';

  constructor(private http: HttpClient) {}

  getCategories(pageNumber: number = 1, pageSize: number = 10): Observable<ApiResponse<PaginatedResponse<Category>>> {
    return this.http.get<ApiResponse<PaginatedResponse<Category>>>(`${this.baseUrl}?pageNumber=${pageNumber}&pageSize=${pageSize}`);
  }

  getCategory(id: number): Observable<ApiResponse<Category>> {
    return this.http.get<ApiResponse<Category>>(`${this.baseUrl}/${id}`);
  }

  getAll(pageNumber?: number, pageSize?: number): Observable<ApiResponse<PaginatedResponse<Category>>> {
    return this.getCategories(pageNumber, pageSize);
  }

  createCategory(category: Partial<Category>): Observable<ApiResponse<Category>> {
    return this.http.post<ApiResponse<Category>>(this.baseUrl, category);
  }

  update(id: number, category: Partial<Category>): Observable<ApiResponse<Category>> {
    return this.updateCategory(id, category);
  }

  updateCategory(id: number, category: Partial<Category>): Observable<ApiResponse<Category>> {
    return this.http.put<ApiResponse<Category>>(`${this.baseUrl}/${id}`, category);
  }

  delete(id: number): Observable<ApiResponse<null>> {
    return this.deleteCategory(id);
  }

  deleteCategory(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`);
  }

  toggleCategoryStatus(id: number, isActive: boolean): Observable<ApiResponse<Category>> {
    return this.http.patch<ApiResponse<Category>>(`${this.baseUrl}/${id}/toggle-status`, { isActive });
  }
}
