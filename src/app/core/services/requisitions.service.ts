import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponseModel } from '../models/api-response.model';

export interface ServiceRequestDto {
  id: string;
  requestNumber: string;
  requesterId: string;
  requesterName?: string;
  department?: string;
  itemId: string;
  itemName?: string;
  quantity: number;
  reason?: string;
  status: string;
  requestDate: string;
  approvedBy?: string;
  approvedDate?: string;
}

export interface CreateServiceRequestDto {
  items: {
    itemId: string;
    srDetailId?: string;
    requestedQty: number;
    preferredShelfId: string;
    notes?: string;
  }[];
  remarks: string;
}

export interface StoreIssueVoucherDto {
  id: string;
  voucherNumber: string;
  serviceRequestId: string;
  issuedBy: string;
  issueDate: string;
  items: any[];
  status: string;
}

@Injectable({ providedIn: 'root' })
export class RequisitionsService {
  constructor(private apiService: ApiService) {}

  // Service Requests
  getAllServiceRequests(params?: any): Observable<ApiResponseModel<ServiceRequestDto[]>> {
    return this.apiService.get<ApiResponseModel<ServiceRequestDto[]>>('ServiceRequests', params);
  }

  getServiceRequestById(id: string): Observable<ApiResponseModel<ServiceRequestDto>> {
    return this.apiService.get<ApiResponseModel<ServiceRequestDto>>(`ServiceRequests/${id}`);
  }

  createServiceRequest(data: CreateServiceRequestDto): Observable<ApiResponseModel<string>> {
    return this.apiService.post<ApiResponseModel<string>>('ServiceRequests', data);
  }

  updateServiceRequest(id: string, data: any): Observable<ApiResponseModel<any>> {
    return this.apiService.put<ApiResponseModel<any>>(`ServiceRequests/${id}`, data);
  }

  deleteServiceRequest(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<ApiResponseModel<any>>(`ServiceRequests/${id}`);
  }

  approveServiceRequest(id: string, data?: any): Observable<ApiResponseModel<any>> {
    return this.apiService.post<ApiResponseModel<any>>(`ServiceRequests/${id}/approve`, data || {});
  }

  rejectServiceRequest(id: string, data?: any): Observable<ApiResponseModel<any>> {
    return this.apiService.post<ApiResponseModel<any>>(`ServiceRequests/${id}/reject`, data || {});
  }

  issueServiceRequest(id: string, data?: any): Observable<ApiResponseModel<any>> {
    return this.apiService.post<ApiResponseModel<any>>(`ServiceRequests/${id}/issue`, data || {});
  }

  // Store Issue Vouchers
  getAllSIVs(params?: any): Observable<ApiResponseModel<StoreIssueVoucherDto[]>> {
    return this.apiService.get<ApiResponseModel<StoreIssueVoucherDto[]>>('StoreIssueVouchers', params);
  }

  getSIVById(id: string): Observable<ApiResponseModel<StoreIssueVoucherDto>> {
    return this.apiService.get<ApiResponseModel<StoreIssueVoucherDto>>(`StoreIssueVouchers/${id}`);
  }

  createSIV(data: any): Observable<ApiResponseModel<string>> {
    return this.apiService.post<ApiResponseModel<string>>('StoreIssueVouchers', data);
  }

  deleteSIV(id: string): Observable<ApiResponseModel<any>> {
    return this.apiService.delete<ApiResponseModel<any>>(`StoreIssueVouchers/${id}`);
  }
}
