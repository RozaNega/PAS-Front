import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface ReturnListDto {
  id: string;
  returnNumber: string;
  itemName: string;
  quantity: number;
  reason: string;
  requestDate: string;
  status: string;
  requestedBy: string;
}

export interface ReturnMaterialRequestDetailDto {
  id: string;
  returnNumber: string;
  itemId: string;
  itemName: string;
  itemSKU: string;
  quantity: number;
  reason: string;
  requestDate: string;
  requestedById: string;
  requestedByName: string;
  approvedById?: string;
  approvedByName?: string;
  approvedDate?: string;
  status: string;
  sourceLocationId?: string;
  sourceLocationName?: string;
  sourceShelfId?: string;
  sourceShelfLocation?: string;
  supplierId?: string;
  supplierName?: string;
  returnType?: string;
  batchNumber?: string;
  expiryDate?: string;
  reference?: string;
  remarks?: string;
  history: ReturnHistoryDto[];
  createdAt: string;
  updatedAt?: string;
}

export interface ReturnHistoryDto {
  date: string;
  action: string;
  performedBy: string;
  remarks?: string;
}

export interface PaginatedReturnResponse {
  items: ReturnListDto[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface CreateReturnRequestCommand {
  itemId: string;
  quantity: number;
  reason: string;
  returnType: string;
  sourceShelfId?: string;
  batchNumber: string;
  expiryDate: string;
  reference: string;
  remarks: string;
}

@Injectable({ providedIn: 'root' })
export class ReturnMaterialRequestsService {
  constructor(private apiService: ApiService) {}

  getAll(params?: {
    itemId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<ApiResponseModel<PaginatedReturnResponse>> {
    return this.apiService.get<PaginatedReturnResponse>(
      'ReturnMaterialRequests',
      params,
    );
  }

  getById(id: string): Observable<ApiResponseModel<ReturnMaterialRequestDetailDto>> {
    return this.apiService.get<ReturnMaterialRequestDetailDto>(
      `ReturnMaterialRequests/${id}`,
    );
  }

  create(data: CreateReturnRequestCommand): Observable<ApiResponseModel<string>> {
    return this.apiService.post<string>('ReturnMaterialRequests', data);
  }
}
