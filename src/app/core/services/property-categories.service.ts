import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PropertyCategory {
  id: string;
  name: string;
  description: string;
  propertiesCount?: number;
  isActive?: boolean;
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
export class PropertyCategoriesService {
  private baseUrl = '/api/PropertyCategories';

  constructor(private http: HttpClient) {}

  getAll(searchTerm?: string): Observable<ApiResponse<PropertyCategory[]>> {
    const url = searchTerm
      ? `${this.baseUrl}?searchTerm=${encodeURIComponent(searchTerm)}`
      : this.baseUrl;
    return this.http.get<ApiResponse<PropertyCategory[]>>(url);
  }

  getById(id: string): Observable<ApiResponse<PropertyCategory>> {
    return this.http.get<ApiResponse<PropertyCategory>>(`${this.baseUrl}/${id}`);
  }

  create(category: { name: string; description?: string }): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(this.baseUrl, {
      name: category.name,
      description: category.description ?? ''
    });
  }

  update(id: string, category: { name: string; description?: string }): Observable<ApiResponse<unknown>> {
    return this.http.put<ApiResponse<unknown>>(`${this.baseUrl}/${id}`, {
      id,
      name: category.name,
      description: category.description ?? ''
    });
  }

  delete(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`);
  }
}
