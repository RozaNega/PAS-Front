import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface ReceivingNoteListDto {
  id: string;
  grnNumber?: string;
  supplierName?: string;
  receivedDate: string;
  status?: string;
  receivedBy?: string;
  itemCount: number;
  totalQuantity: number;
  hasInspection: boolean;
}

export interface ReceivingNoteDetailDto {
  id: string;
  grnNumber?: string;
  supplierId: string;
  supplierName?: string;
  receivedDate: string;
  status?: string;
  receivedById: string;
  receivedByName?: string;
  hasInspection: boolean;
  totalItems: number;
  totalQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  inspection?: InspectionSummaryDto;
  items: ReceivingItemDetailDto[];
  attachments: ReceivingNoteAttachmentDto[];
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface InspectionSummaryDto {
  id: string;
  isPassed: boolean;
  deviationNotes?: string;
  inspectionDate: string;
  inspectorName?: string;
  acceptedQuantity: number;
  rejectedQuantity: number;
}

export interface ReceivingItemDetailDto {
  itemId: string;
  itemName?: string;
  sku?: string;
  unitOfMeasure?: string;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  pendingQuantity: number;
  remarks?: string;
  requiresInspection: boolean;
}

export interface ReceivingNoteAttachmentDto {
  id: string;
  fileName?: string;
  contentType?: string;
  fileSize: number;
  uploadedAt: string;
}

export interface PaginatedReceivingNoteResponse {
  items: ReceivingNoteListDto[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface CreateReceivingNoteCommand {
  grnNumber?: string;
  supplierId: string;
  poNumber?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  deliveryNoteNumber?: string;
  vehicleNumber?: string;
  driverName?: string;
  remarks?: string;
  items: ReceivingNoteItemDto[];
}

export interface ReceivingNoteItemDto {
  itemId: string;
  quantity: number;
  unitPrice: number;
}

export interface ApproveReceivingNoteCommand {
  id: string;
  isApproved: boolean;
  remarks?: string;
}

@Injectable({ providedIn: 'root' })
export class ReceivingNotesService {
  constructor(private apiService: ApiService) {}

  getAll(params?: {
    status?: string;
    supplierId?: string;
    fromDate?: string;
    toDate?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<ApiResponseModel<PaginatedReceivingNoteResponse>> {
    return this.apiService.get<ApiResponseModel<PaginatedReceivingNoteResponse>>('ReceivingNotes', params);
  }

  getById(id: string): Observable<ApiResponseModel<ReceivingNoteDetailDto>> {
    return this.apiService.get<ApiResponseModel<ReceivingNoteDetailDto>>(`ReceivingNotes/${id}`);
  }

  create(data: CreateReceivingNoteCommand): Observable<ApiResponseModel<string>> {
    return this.apiService.post<ApiResponseModel<string>>('ReceivingNotes', data);
  }

  approve(id: string, data: ApproveReceivingNoteCommand): Observable<ApiResponseModel<any>> {
    return this.apiService.post<ApiResponseModel<any>>(`ReceivingNotes/${id}/approve`, data);
  }
}
