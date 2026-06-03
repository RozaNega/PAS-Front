import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../../config/api.config';
import { ApiResponse, PaginatedResult } from '../../../../types/api-response.type';
import {
  StoreIssueVoucher,
  StoreIssueVoucherDetail,
  CreateStoreIssueVoucherRequest,
  UpdateStoreIssueVoucherRequest,
  ApproveSIVRequest
} from '../models/siv.model';

@Injectable()
export class SIVService {
  constructor(private apiService: ApiService) {}

  getStoreIssueVouchers(params?: any): Observable<ApiResponse<PaginatedResult<StoreIssueVoucher>>> {
    return this.apiService.get<PaginatedResult<StoreIssueVoucher>>(API_ENDPOINTS.STORE_ISSUE_VOUCHERS.GET_ALL, params);
  }

  getStoreIssueVoucherById(id: string): Observable<ApiResponse<StoreIssueVoucherDetail>> {
    return this.apiService.get<StoreIssueVoucherDetail>(API_ENDPOINTS.STORE_ISSUE_VOUCHERS.GET_BY_ID(id));
  }

  createStoreIssueVoucher(request: CreateStoreIssueVoucherRequest): Observable<ApiResponse<string>> {
    return this.apiService.post<string>(API_ENDPOINTS.STORE_ISSUE_VOUCHERS.CREATE, request);
  }

  updateStoreIssueVoucher(request: UpdateStoreIssueVoucherRequest): Observable<ApiResponse<object>> {
    return this.apiService.put<object>(`${API_ENDPOINTS.STORE_ISSUE_VOUCHERS.GET_ALL}/${request.id}`, request);
  }

  approveSIV(request: ApproveSIVRequest): Observable<ApiResponse<object>> {
    return this.apiService.post<object>(`${API_ENDPOINTS.STORE_ISSUE_VOUCHERS.GET_ALL}/${request.id}/approve`, request);
  }

  deleteStoreIssueVoucher(id: string): Observable<ApiResponse<object>> {
    return this.apiService.delete<object>(API_ENDPOINTS.STORE_ISSUE_VOUCHERS.DELETE(id));
  }

  generateSIVPDF(id: string): Observable<Blob> {
    return this.apiService.getBlob(`${API_ENDPOINTS.STORE_ISSUE_VOUCHERS.GET_ALL}/${id}/pdf`);
  }

  getSIVStatistics(params?: any): Observable<ApiResponse<any>> {
    return this.apiService.get<any>(`${API_ENDPOINTS.STORE_ISSUE_VOUCHERS.GET_ALL}/statistics`, params);
  }
}
