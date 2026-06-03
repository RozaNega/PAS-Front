import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface InspectionDto {
  id: string;
  receivingNoteId: string;
  grnNumber?: string;
  inspectorId: string;
  inspectorName?: string;
  isPassed: boolean;
  status?: string;
  deviationNotes?: string;
  inspectionDate: string;
  receivedQuantity: number;
  items: InspectionItemDto[];
}

export interface InspectionItemDto {
  itemId: string;
  itemName?: string;
  sku?: string;
  receivedQuantity: number;
  inspectedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  remarks?: string;
  isPassed: boolean;
}

export interface PaginatedInspectionResponse {
  items: InspectionDto[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface CreateInspectionCommand {
  receivingNoteId: string;
  items: InspectionItemCommand[];
  deviationNotes?: string;
  deviations?: InspectionDeviationCommand[];
}

export interface InspectionItemCommand {
  itemId: string;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  remarks?: string;
}

export interface InspectionDeviationCommand {
  type?: string;
  description?: string;
  severity?: string;
  correctiveAction?: string;
}

@Injectable({ providedIn: 'root' })
export class InspectionsService {
  constructor(private apiService: ApiService) {}

  getAll(params?: {
    receivingNoteId?: string;
    isPassed?: boolean;
    fromDate?: string;
    toDate?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<ApiResponseModel<PaginatedInspectionResponse>> {
    return this.apiService.get<PaginatedInspectionResponse>('Inspections', params);
  }

  getById(id: string): Observable<ApiResponseModel<InspectionDto>> {
    return this.apiService.get<InspectionDto>(`Inspections/${id}`);
  }

  create(data: CreateInspectionCommand): Observable<ApiResponseModel<string>> {
    return this.apiService.post<string>('Inspections', data);
  }
}
