import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface SupplierDto {
  id: string;
  supplierName: string;
  contactPerson?: string;
  tinNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  receivingNotesCount: number;
  totalItemsReceived: number;
  totalPurchaseValue: number;
}

export interface SupplierDetailDto extends SupplierDto {
  receivingNotes: SupplierReceivingNoteDto[];
  contacts: SupplierContactDto[];
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface SupplierContactDto {
  name?: string;
  phone?: string;
  email?: string;
  position?: string;
  isPrimary: boolean;
}

export interface SupplierReceivingNoteDto {
  id: string;
  grnNumber?: string;
  receivedDate: string;
  status?: string;
  receivedBy?: string;
  itemsCount: number;
  totalQuantity: number;
  totalValue: number;
}

export interface CreateSupplierCommand {
  supplierName: string;
  contactPerson?: string;
  tinNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  contacts?: SupplierContactDto[];
}

export interface UpdateSupplierCommand {
  id: string;
  supplierName?: string;
  contactPerson?: string;
  tinNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class SuppliersService {
  constructor(private apiService: ApiService) {}

  getAll(params?: { searchTerm?: string }): Observable<ApiResponseModel<SupplierDto[]>> {
    return this.apiService.get<SupplierDto[]>('Suppliers', params);
  }

  getById(id: string): Observable<ApiResponseModel<SupplierDetailDto>> {
    return this.apiService.get<SupplierDetailDto>(`Suppliers/${id}`);
  }

  create(data: CreateSupplierCommand): Observable<ApiResponseModel<string>> {
    return this.apiService.post<string>('Suppliers', data);
  }

  update(data: UpdateSupplierCommand): Observable<ApiResponseModel<any>> {
    return this.apiService.put<any>(`Suppliers/${data.id}`, data);
  }

  delete(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<any>(`Suppliers/${id}`);
  }
}
