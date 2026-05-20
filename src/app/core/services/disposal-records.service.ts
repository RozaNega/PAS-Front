import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface DisposalRecordDto {
  id: string;
  itemId: string;
  itemName?: string;
  sku?: string;
  unitOfMeasure?: string;
  quantity: number;
  disposalDate: string;
  disposedBy: string;
  disposedByName?: string;
  reason?: string;
  status?: string;
  approvedById?: string;
  approvedByName?: string;
  approvedDate?: string;
  approvalRemarks?: string;
  estimatedValue: number;
  actualValue: number;
}

export interface DisposalRecordDetailDto extends DisposalRecordDto {
  items: DisposalItemDetailDto[];
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  auditHistory: DisposalAuditDto[];
}

export interface DisposalItemDetailDto {
  itemId: string;
  itemName?: string;
  sku?: string;
  quantity: number;
  availableStock: number;
  unitCost: number;
  totalValue: number;
  reason?: string;
}

export interface DisposalAuditDto {
  date: string;
  action: string;
  performedBy: string;
  remarks?: string;
}

export interface PaginatedDisposalResponse {
  items: DisposalRecordDto[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface CreateDisposalRecordCommand {
  items: { itemId: string; quantity: number; reason?: string }[];
  reason?: string;
}

export interface ApproveDisposalCommand {
  id: string;
  isApproved: boolean;
  remarks?: string;
  actualValue?: number;
}

@Injectable({ providedIn: 'root' })
export class DisposalRecordsService {
  constructor(private apiService: ApiService) {}

  getAll(params?: {
    itemId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<ApiResponseModel<PaginatedDisposalResponse>> {
    return this.apiService.get<ApiResponseModel<PaginatedDisposalResponse>>('DisposalRecords', params);
  }

  getById(id: string): Observable<ApiResponseModel<DisposalRecordDetailDto>> {
    return this.apiService.get<ApiResponseModel<DisposalRecordDetailDto>>(`DisposalRecords/${id}`);
  }

  create(data: CreateDisposalRecordCommand): Observable<ApiResponseModel<string>> {
    return this.apiService.post<ApiResponseModel<string>>('DisposalRecords', data);
  }

  approve(id: string, data: ApproveDisposalCommand): Observable<ApiResponseModel<any>> {
    return this.apiService.post<ApiResponseModel<any>>(`DisposalRecords/${id}/approve`, data);
  }
}
