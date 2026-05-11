import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { ApiResponseModel } from '../../../../core/models/api-response.model';

export interface SupplierDto {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SupplierService {
  constructor(private apiService: ApiService) {}

  getAll(params?: any): Observable<ApiResponseModel<SupplierDto[]>> {
    return this.apiService.get<ApiResponseModel<SupplierDto[]>>('Suppliers', params);
  }

  getById(id: string): Observable<ApiResponseModel<SupplierDto>> {
    return this.apiService.get<ApiResponseModel<SupplierDto>>(`Suppliers/${id}`);
  }

  create(data: any): Observable<ApiResponseModel<string>> {
    return this.apiService.post<ApiResponseModel<string>>('Suppliers', data);
  }

  update(id: string, data: any): Observable<ApiResponseModel<any>> {
    return this.apiService.put<ApiResponseModel<any>>(`Suppliers/${id}`, data);
  }

  delete(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<ApiResponseModel<any>>(`Suppliers/${id}`);
  }
}
