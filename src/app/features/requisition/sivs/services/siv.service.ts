import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { ApiResponse } from '../../../../types/api-response.type';
import { normalizePasListResponse, toCamelCaseDeep, unwrapPasEnvelope } from '../../../../core/utils/pas-api-json.util';

/** Store Issue Voucher from GET /api/StoreIssueVouchers */
export interface StoreIssueVoucherDto {
  id: string;
  sivNumber: string;
  serviceRequestId: string;
  serviceRequestNumber: string;
  issuedToId: string;
  issuedToName: string;
  issuedById: string;
  issuedByName: string;
  department: string;
  issueDate: string;
  status: string;
  totalItems: number;
  totalQuantity: number;
  notes?: string;
}

/** Store Issue Voucher Detail from GET /api/StoreIssueVouchers/{id} */
export interface StoreIssueVoucherDetailDto extends StoreIssueVoucherDto {
  items: StoreIssueVoucherItemDto[];
  createdAt: string;
  updatedAt?: string;
}

/** Store Issue Voucher Item */
export interface StoreIssueVoucherItemDto {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  unitOfMeasure: string;
  issuedQty: number;
  shelfId?: string;
  shelfLocation?: string;
  batchNumber?: string;
  expiryDate?: string;
}

/** POST /api/StoreIssueVouchers — CreateStoreIssueVoucherCommand */
export interface CreateStoreIssueVoucherRequest {
  serviceRequestId?: string;
  issuedToId?: string;
  department: string;
  notes?: string;
  items: CreateStoreIssueVoucherItemRequest[];
}

export interface CreateStoreIssueVoucherItemRequest {
  itemId: string;
  /** SR line id — many APIs accept this alongside itemId for stock reservation. */
  srDetailId?: string;
  issuedQty: number;
  shelfId?: string;
  batchNumber?: string;
}

function isGuidString(value: string | undefined | null): boolean {
  if (!value || typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

function buildCreateStoreIssueVoucherCommand(data: CreateStoreIssueVoucherRequest): Record<string, unknown> {
  const cmd: Record<string, unknown> = {
    department: data.department,
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
      if (i.batchNumber?.trim()) {
        row['batchNumber'] = i.batchNumber.trim();
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

@Injectable({ providedIn: 'root' })
export class StoreIssueVoucherService {
  constructor(private apiService: ApiService) {}

  getAll(params?: {
    status?: string;
    searchTerm?: string;
    department?: string;
    serviceRequestId?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<ApiResponse<StoreIssueVoucherDto[]>> {
    return this.apiService.get<unknown>('StoreIssueVouchers', params).pipe(
      map((raw) => normalizePasListResponse<StoreIssueVoucherDto>(raw)),
    );
  }

  getById(id: string): Observable<ApiResponse<StoreIssueVoucherDetailDto>> {
    return this.apiService.get<unknown>(`StoreIssueVouchers/${id}`).pipe(
      map((raw) => this.normalizeEnvelope<StoreIssueVoucherDetailDto>(raw)),
    );
  }

  create(data: CreateStoreIssueVoucherRequest): Observable<ApiResponse<string>> {
    const body = { command: buildCreateStoreIssueVoucherCommand(data) };
    return this.apiService.post<unknown>('StoreIssueVouchers', body).pipe(
      map((raw) => this.normalizeEnvelope<string>(raw)),
    );
  }

  delete(id: string): Observable<ApiResponse<unknown>> {
    return this.apiService.delete<unknown>(`StoreIssueVouchers/${id}`).pipe(
      map((raw) => this.normalizeEnvelope(raw)),
    );
  }

  print(id: string): Observable<ApiResponse<unknown>> {
    return this.apiService.get<unknown>(`StoreIssueVouchers/${id}/print`).pipe(
      map((raw) => this.normalizeEnvelope(raw)),
    );
  }

  private normalizeEnvelope<T>(raw: unknown): ApiResponse<T> {
    const env = unwrapPasEnvelope<unknown>(raw);
    const data =
      env.data !== undefined && env.data !== null
        ? (typeof env.data === 'object' ? toCamelCaseDeep<T>(env.data) : (env.data as T))
        : (undefined as unknown as T);
    return {
      success: env.success,
      message: env.message ?? '',
      data,
      statusCode: env.statusCode ?? 0,
    };
  }
}