import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../../../../core/services/api.service';
import { API_ENDPOINTS } from '../../../../config/api.config';
import { ApiResponse, PaginatedResult } from '../../../../types/api-response.type';
import { unwrapPasEnvelope } from '../../../../core/utils/pas-api-json.util';
import {
  StoreIssueVoucher,
  StoreIssueVoucherDetail,
  CreateStoreIssueVoucherRequest,
  UpdateStoreIssueVoucherRequest,
  ApproveSIVRequest
} from '../models/siv.model';

function isGuidString(value: string | undefined | null): boolean {
  if (!value || typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

function buildCreateSIVCommand(data: CreateStoreIssueVoucherRequest): Record<string, unknown> {
  const cmd: Record<string, unknown> = {
    department: data.department || 'General',
    notes: data.notes ?? '',
    items: data.items.map((i) => {
      const row: Record<string, unknown> = {
        itemId: i.itemId,
        issuedQty: i.issuedQty,
      };
      if (i.srDetailId) {
        row['srDetailId'] = i.srDetailId;
      }
      if (i.shelfId && isGuidString(i.shelfId)) {
        row['shelfId'] = i.shelfId;
      }
      return row;
    }),
  };

  if (data.serviceRequestId && isGuidString(data.serviceRequestId)) {
    cmd['serviceRequestId'] = data.serviceRequestId;
  }
  if (data.issuedToId) {
    cmd['issuedToId'] = data.issuedToId;
  }

  return cmd;
}

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
    const body = { command: buildCreateSIVCommand(request) };
    return this.apiService.post<unknown>(API_ENDPOINTS.STORE_ISSUE_VOUCHERS.CREATE, body).pipe(
      map((raw) => {
        const env = unwrapPasEnvelope<unknown>(raw);
        return {
          success: env.success !== false,
          message: env.message ?? '',
          data: env.data as string,
          statusCode: env.statusCode ?? 0,
        };
      }),
    );
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
