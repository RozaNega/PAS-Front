import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';
import { ApiResponse } from '../../../../types/api-response.type';
import { normalizePasListResponse, toCamelCaseDeep, unwrapPasEnvelope } from '../../../../core/utils/pas-api-json.util';

/** Service Request from GET /api/ServiceRequests */
export interface ServiceRequestDto {
  id: string;
  srNumber: string;
  requesterId: string;
  requesterName: string;
  department?: string;
  purpose?: string;
  urgency?: string;
  notes?: string;
  approvedById?: string;
  approvedByName?: string;
  requestDate: string;
  status: string;
  stockVerificationStatus: string;
  totalItems: number;
  totalQuantity: number;
  issuedQuantity: number;

  createdAt: string;
  updatedAt?: string;
}

/** Service Request Detail from GET /api/ServiceRequests/{id} */
export interface ServiceRequestDetailDto extends ServiceRequestDto {
  items: ServiceRequestItemDto[];
  stockVerifiedById?: string;
  stockVerifiedByName?: string;
  stockVerificationDate?: string;
  stockVerificationNotes?: string;
  createdAt: string;
  updatedAt?: string;
  pendingQty: number;
  shelfId?: string;
  shelfLocation?: string;
}

/** Service Request Item */
export interface ServiceRequestItemDto {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  unitOfMeasure: string;
  requestedQty: number;
  issuedQty: number;
  pendingQty: number;
  shelfId?: string;
  shelfLocation?: string;
}

/** POST /api/ServiceRequests — CreateServiceRequestCommand */
export interface CreateServiceRequestRequest {
  department: string;
  purpose: string;
  urgency: string;
  notes?: string;
  items: CreateServiceRequestItemRequest[];
}

export interface CreateServiceRequestItemRequest {
  itemId: string;
  requestedQty: number;
  shelfId?: string;
}

/** POST /api/ServiceRequests/{id}/approve — ApproveServiceRequestCommand */
export interface ApproveServiceRequestRequest {
  id: string;
  remarks?: string;
}

/** POST /api/ServiceRequests/{id}/reject — RejectServiceRequestCommand */
export interface RejectServiceRequestRequest {
  id: string;
  reason: string;
}

/** POST /api/ServiceRequests/{id}/issue — IssueServiceRequestCommand */
export interface IssueServiceRequestRequest {
  id: string;
  items: IssueItemRequest[];
}

export interface IssueItemRequest {
  srDetailId: string;
  issuedQty: number;
  shelfId?: string;
}

/** POST /api/ServiceRequests/{id}/verify-stock — VerifyStockCommand */
export interface VerifyStockRequest {
  id: string;
  isAvailable: boolean;
  notes?: string;
}

/** POST /api/ServiceRequests/{id}/cancel — CancelServiceRequestCommand */
export interface CancelServiceRequestRequest {
  id: string;
  reason?: string;
  notifyApprover: boolean;
  sendEmailConfirmation: boolean;
}

function isGuidString(value: string | undefined | null): boolean {
  if (!value || typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

/** Backend expects MediatR-style `{ command: { ... } }` bodies for ServiceRequests writes. */
function buildCreateServiceRequestCommand(data: CreateServiceRequestRequest): Record<string, unknown> {
  return {
    department: data.department,
    purpose: data.purpose,
    urgency: data.urgency,
    notes: data.notes ?? '',
    items: data.items.map((i) => {
      const row: Record<string, unknown> = {
        itemId: i.itemId,
        requestedQty: i.requestedQty,
      };
      if (i.shelfId && isGuidString(i.shelfId)) {
        row['shelfId'] = i.shelfId;
      }
      return row;
    }),
  };
}

@Injectable({ providedIn: 'root' })
export class ServiceRequestService {
  constructor(private apiService: ApiService) {}

  getAll(params?: {
    status?: string;
    searchTerm?: string;
    department?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<ApiResponse<ServiceRequestDto[]>> {
    return this.apiService.get<unknown>('ServiceRequests', params).pipe(
      map((raw) => normalizePasListResponse<ServiceRequestDto>(raw)),
    );
  }

  getById(id: string): Observable<ApiResponse<ServiceRequestDetailDto>> {
    return this.apiService.get<unknown>(`ServiceRequests/${id}`).pipe(
      map((raw) => this.normalizeEnvelope<ServiceRequestDetailDto>(raw)),
    );
  }

  create(data: CreateServiceRequestRequest): Observable<ApiResponse<string>> {
    const body = { command: buildCreateServiceRequestCommand(data) };
    return this.apiService.post<unknown>('ServiceRequests', body).pipe(
      map((raw) => this.normalizeEnvelope<string>(raw)),
    );
  }

  approve(data: ApproveServiceRequestRequest): Observable<ApiResponse<unknown>> {
    const body = { Id: data.id, remarks: data.remarks ?? '' };
    return this.apiService.post<unknown>(`ServiceRequests/${data.id}/approve`, body).pipe(
      map((raw) => this.normalizeEnvelope(raw)),
    );
  }

  reject(data: RejectServiceRequestRequest): Observable<ApiResponse<unknown>> {
    const body = { Id: data.id, reason: data.reason };
    return this.apiService.post<unknown>(`ServiceRequests/${data.id}/reject`, body).pipe(
      map((raw) => this.normalizeEnvelope(raw)),
    );
  }

  issue(data: IssueServiceRequestRequest): Observable<ApiResponse<string>> {
    const items = data.items.map((i) => {
      const row: Record<string, unknown> = {
        srDetailId: i.srDetailId,
        issuedQty: i.issuedQty,
      };
      if (i.shelfId && isGuidString(i.shelfId)) {
        row['shelfId'] = i.shelfId;
      }
      return row;
    });
    const body = { Id: data.id, items };
    return this.apiService.post<unknown>(`ServiceRequests/${data.id}/issue`, body).pipe(
      map((raw) => this.normalizeEnvelope<string>(raw)),
    );
  }

  verifyStock(data: VerifyStockRequest): Observable<ApiResponse<unknown>> {
    const body = { Id: data.id, isAvailable: data.isAvailable, notes: data.notes ?? '' };
    return this.apiService.post<unknown>(`ServiceRequests/${data.id}/verify-stock`, body).pipe(
      map((raw) => this.normalizeEnvelope(raw)),
    );
  }

  cancel(data: CancelServiceRequestRequest): Observable<ApiResponse<unknown>> {
    const body = {
      Id: data.id,
      reason: data.reason,
      notifyApprover: data.notifyApprover,
      sendEmailConfirmation: data.sendEmailConfirmation,
    };
    return this.apiService.post<unknown>(`ServiceRequests/${data.id}/cancel`, body).pipe(
      map((raw) => this.normalizeEnvelope(raw)),
    );
  }

  delete(id: string): Observable<ApiResponse<unknown>> {
    return this.apiService.delete<unknown>(`ServiceRequests/${id}`).pipe(
      map((raw) => this.normalizeEnvelope(raw)),
    );
  }

  addComment(id: string, comment: string): Observable<ApiResponse<unknown>> {
    const body = { Id: id, comment };
    return this.apiService.post<unknown>(`ServiceRequests/${id}/comments`, body).pipe(
      map((raw) => this.normalizeEnvelope(raw)),
    );
  }

  getTimeline(id: string): Observable<ApiResponse<unknown>> {
    return this.apiService.get<unknown>(`ServiceRequests/${id}/timeline`).pipe(
      map((raw) => this.normalizeEnvelope(raw)),
    );
  }

  getActivity(id: string): Observable<ApiResponse<unknown[]>> {
    return this.apiService.get<unknown>(`ServiceRequests/${id}/activity`).pipe(
      map((raw) => this.normalizeEnvelope<unknown[]>(raw)),
    );
  }

  getServiceRequests(params?: any): Observable<ApiResponse<ServiceRequestDto[]>> {
    return this.getAll(params);
  }

  getServiceRequestById(id: string): Observable<ApiResponse<ServiceRequestDetailDto>> {
    return this.getById(id);
  }

  issueServiceRequest(data: IssueServiceRequestRequest): Observable<ApiResponse<string>> {
    return this.issue(data);
  }

  approveServiceRequest(data: ApproveServiceRequestRequest): Observable<ApiResponse<unknown>> {
    return this.approve(data);
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
