import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface TransferRecordDto {
  id: string;
  transferNumber: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  transferDate: string;
  status: string;
  items: any[];
  transferredBy: string;
}

export interface CreateTransferCommand {
  fromWarehouseId: string;
  toWarehouseId: string;
  transferDate: string;
  items: any[];
}

@Injectable({ providedIn: 'root' })
export class TransferRecordsService {
  constructor(private apiService: ApiService) {}

  getAll(params?: any): Observable<ApiResponseModel<TransferRecordDto[]>> {
    return this.apiService.get<ApiResponseModel<TransferRecordDto[]>>('TransferRecords', params);
  }

  getById(id: string): Observable<ApiResponseModel<TransferRecordDto>> {
    return this.apiService.get<ApiResponseModel<TransferRecordDto>>(`TransferRecords/${id}`);
  }

  create(data: CreateTransferCommand): Observable<ApiResponseModel<string>> {
    return this.apiService.post<ApiResponseModel<string>>('TransferRecords', data);
  }

  update(id: string, data: any): Observable<ApiResponseModel<any>> {
    return this.apiService.put<ApiResponseModel<any>>(`TransferRecords/${id}`, data);
  }

  delete(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<ApiResponseModel<any>>(`TransferRecords/${id}`);
  }
}
