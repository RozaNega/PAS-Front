import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface ReturnMaterialRequestDto {
  id: string;
  returnNumber: string;
  serviceRequestId: string;
  returnDate: string;
  reason: string;
  status: string;
  items: any[];
  returnedBy: string;
}

export interface CreateReturnRequestCommand {
  serviceRequestId: string;
  returnDate: string;
  reason: string;
  items: any[];
}

@Injectable({ providedIn: 'root' })
export class ReturnMaterialRequestsService {
  constructor(private apiService: ApiService) {}

  getAll(params?: any): Observable<ApiResponseModel<ReturnMaterialRequestDto[]>> {
    return this.apiService.get<ApiResponseModel<ReturnMaterialRequestDto[]>>('ReturnMaterialRequests', params);
  }

  getById(id: string): Observable<ApiResponseModel<ReturnMaterialRequestDto>> {
    return this.apiService.get<ApiResponseModel<ReturnMaterialRequestDto>>(`ReturnMaterialRequests/${id}`);
  }

  create(data: CreateReturnRequestCommand): Observable<ApiResponseModel<string>> {
    return this.apiService.post<ApiResponseModel<string>>('ReturnMaterialRequests', data);
  }

  update(id: string, data: any): Observable<ApiResponseModel<any>> {
    return this.apiService.put<ApiResponseModel<any>>(`ReturnMaterialRequests/${id}`, data);
  }

  delete(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<ApiResponseModel<any>>(`ReturnMaterialRequests/${id}`);
  }
}
