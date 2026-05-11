import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface DisposalRecordDto {
  id: string;
  itemId: string;
  itemName?: string;
  reason: string;
  disposalDate: string;
  status: string;
  approvedBy?: string;
  approvedDate?: string;
}

export interface CreateDisposalRecordCommand {
  itemId: string;
  reason: string;
  disposalDate: string;
}

export interface ApproveDisposalCommand {
  id: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class DisposalRecordsService {
  constructor(private apiService: ApiService) {}

  getAll(params?: any): Observable<ApiResponseModel<DisposalRecordDto[]>> {
    return this.apiService.get<ApiResponseModel<DisposalRecordDto[]>>('DisposalRecords', params);
  }

  getById(id: string): Observable<ApiResponseModel<DisposalRecordDto>> {
    return this.apiService.get<ApiResponseModel<DisposalRecordDto>>(`DisposalRecords/${id}`);
  }

  create(data: CreateDisposalRecordCommand): Observable<ApiResponseModel<string>> {
    return this.apiService.post<ApiResponseModel<string>>('DisposalRecords', data);
  }

  approve(id: string, data?: ApproveDisposalCommand): Observable<ApiResponseModel<any>> {
    return this.apiService.post<ApiResponseModel<any>>(`DisposalRecords/${id}/approve`, data || {});
  }

  delete(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<ApiResponseModel<any>>(`DisposalRecords/${id}`);
  }
}
