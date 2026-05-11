import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { ApiResponseModel } from '../../../../core/models/api-response.model';

export interface ReceivingNoteDto {
  id: string;
  noteNumber: string;
  supplierId: string;
  supplierName?: string;
  receivingDate: string;
  receivedBy: string;
  items: any[];
  totalQuantity: number;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReceivingNoteService {
  constructor(private apiService: ApiService) {}

  getAll(params?: any): Observable<ApiResponseModel<ReceivingNoteDto[]>> {
    return this.apiService.get<ApiResponseModel<ReceivingNoteDto[]>>('ReceivingNotes', params);
  }

  getById(id: string): Observable<ApiResponseModel<ReceivingNoteDto>> {
    return this.apiService.get<ApiResponseModel<ReceivingNoteDto>>(`ReceivingNotes/${id}`);
  }

  create(data: any): Observable<ApiResponseModel<string>> {
    return this.apiService.post<ApiResponseModel<string>>('ReceivingNotes', data);
  }

  update(id: string, data: any): Observable<ApiResponseModel<any>> {
    return this.apiService.put<ApiResponseModel<any>>(`ReceivingNotes/${id}`, data);
  }

  delete(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<ApiResponseModel<any>>(`ReceivingNotes/${id}`);
  }
}
