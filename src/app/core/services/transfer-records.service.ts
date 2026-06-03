import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface TransferListDto {
  id: string;
  transferNumber: string;
  itemName: string;
  quantity: number;
  fromLocation: string;
  toLocation: string;
  transferDate: string;
  status: string;
  initiatedBy: string;
}

export interface TransferRecordDetailDto {
  id: string;
  transferNumber: string;
  itemId: string;
  itemName: string;
  itemSKU: string;
  quantity: number;
  fromLocationId: string;
  fromLocationName: string;
  fromLocationType: string;
  toLocationId: string;
  toLocationName: string;
  toLocationType: string;
  fromShelfId?: string;
  fromShelfLocation?: string;
  toShelfId?: string;
  toShelfLocation?: string;
  transferDate: string;
  initiatedById: string;
  initiatedByName: string;
  approvedById?: string;
  approvedByName?: string;
  approvedDate?: string;
  status: string;
  batchNumber?: string;
  expiryDate?: string;
  reason?: string;
  remarks?: string;
  reference?: string;
  history: TransferHistoryDto[];
  createdAt: string;
  updatedAt?: string;
}

export interface TransferHistoryDto {
  date: string;
  action: string;
  performedBy: string;
  remarks?: string;
}

export interface PaginatedTransferResponse {
  items: TransferListDto[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface CreateTransferRecordCommand {
  itemId: string;
  quantity: number;
  toLocationId: string;
  toShelfId?: string;
  batchNumber?: string;
  expiryDate?: string;
  reason?: string;
  remarks?: string;
  reference?: string;
}

export interface ApproveTransferCommand {
  id: string;
  isApproved: boolean;
  remarks?: string;
}

@Injectable({ providedIn: 'root' })
export class TransferRecordsService {
  constructor(private apiService: ApiService) {}

  getAll(params?: {
    itemId?: string;
    fromLocationId?: string;
    toLocationId?: string;
    fromDate?: string;
    toDate?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<ApiResponseModel<PaginatedTransferResponse>> {
    return this.apiService.get<PaginatedTransferResponse>('TransferRecords', params);
  }

  getById(id: string): Observable<ApiResponseModel<TransferRecordDetailDto>> {
    return this.apiService.get<TransferRecordDetailDto>(`TransferRecords/${id}`);
  }

  create(data: CreateTransferRecordCommand): Observable<ApiResponseModel<string>> {
    return this.apiService.post<string>('TransferRecords', data);
  }

  approve(id: string, data: ApproveTransferCommand): Observable<ApiResponseModel<any>> {
    return this.apiService.post<any>(`TransferRecords/${id}/approve`, data);
  }
}
