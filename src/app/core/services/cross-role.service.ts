import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ServiceRequestService } from '../../features/requisition/service-requests/services/service-request.service';
import {
  ServiceRequest as ApiServiceRequest,
  ServiceRequestDetail,
  IssueServiceRequestRequest,
} from '../../features/requisition/service-requests/models/service-request.model';
import { RequisitionsService, StoreIssueVoucherDto } from './requisitions.service';
import { WorkflowService, ApiServiceRequestRow } from './workflow.service';

export type FlowStatus = 'Pending' | 'Approved' | 'Issued' | 'Rejected' | 'Cancelled';
export type FlowUrgency = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface FlowRequest {
  id: string;
  srNumber: string;
  requesterId: string;
  requesterName: string;
  department: string;
  purpose: string;
  urgency: FlowUrgency;
  requestDate: string;
  status: FlowStatus;
  rawStatus: string;
  totalItems: number;
  totalQuantity: number;
  issuedQuantity: number;
  approvedByName?: string;
  waitingDays: number;
}

export interface FlowSIV {
  id: string;
  sivNumber: string;
  serviceRequestId: string;
  srNumber: string;
  requesterName: string;
  department: string;
  issuedBy: string;
  issueDate: string;
  status: 'Pending' | 'Issued';
  totalItems: number;
  items: Array<{ itemName: string; quantity: number }>;
}

@Injectable({ providedIn: 'root' })
export class CrossRoleService {
  private readonly serviceRequestService = inject(ServiceRequestService);
  private readonly requisitionsService = inject(RequisitionsService);
  private readonly workflowService = inject(WorkflowService);

  /** All backend requests, normalized to FlowRequest. Optionally pass backend query params. */
  getAllRequests(params?: Record<string, unknown>): Observable<FlowRequest[]> {
    return this.serviceRequestService.getServiceRequests(params).pipe(
      map((res) => (res.data?.items ?? []).map((r) => this.toFlowRequest(r))),
      catchError(() => of([] as FlowRequest[])),
    );
  }

  /** Pending requests (employee submitted, not yet approved). */
  getPendingRequests(): Observable<FlowRequest[]> {
    return this.getAllRequests().pipe(
      map((requests) => requests.filter((r) => r.status === 'Pending')),
    );
  }

  /** Approved requests waiting for storekeeper to issue. */
  getApprovedRequests(): Observable<FlowRequest[]> {
    return this.getAllRequests().pipe(
      map((requests) => requests.filter((r) => r.status === 'Approved')),
    );
  }

  /** All issued/completed requests. */
  getIssuedRequests(): Observable<FlowRequest[]> {
    return this.getAllRequests().pipe(
      map((requests) => requests.filter((r) => r.status === 'Issued')),
    );
  }

  /**
   * Requests belonging to a specific employee.
   * Filters by requesterId; also matches by name/email as fallback.
   */
  getRequestsForEmployee(
    employeeId: string,
    identity?: { email?: string; fullName?: string; username?: string },
    statusFilter?: FlowStatus,
  ): Observable<FlowRequest[]> {
    return this.getAllRequests().pipe(
      map((requests) => {
        const idStr = (employeeId || '').trim().toLowerCase();
        const nameKeys = [identity?.fullName, identity?.username, identity?.email?.split('@')[0]]
          .map((v) => v?.trim().toLowerCase())
          .filter((v): v is string => !!v && v.length > 0);

        let filtered = requests.filter((r) => {
          if (idStr && r.requesterId.toLowerCase() === idStr) return true;
          const rName = r.requesterName.toLowerCase();
          return nameKeys.some((key) => rName === key || rName.includes(key));
        });

        if (statusFilter) {
          filtered = filtered.filter((r) => r.status === statusFilter);
        }

        return filtered.sort(
          (a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime(),
        );
      }),
    );
  }

  /** Get a single request detail (items with srDetailId for issuing). */
  getRequestDetail(id: string): Observable<ServiceRequestDetail | null> {
    return this.serviceRequestService.getServiceRequestById(id).pipe(
      map((res) => res.data ?? null),
      catchError(() => of(null)),
    );
  }

  /**
   * Issue a request (storekeeper action).
   * Calls ServiceRequests/{id}/issue and merges the status update into WorkflowService.
   */
  issueRequest(
    id: string,
    items: Array<{ srDetailId: string; issuedQty: number; shelfId?: string }>,
  ): Observable<boolean> {
    const payload: IssueServiceRequestRequest = { id, items };
    return this.serviceRequestService.issueServiceRequest(payload).pipe(
      map(() => true),
      catchError(() => of(false)),
    );
  }

  /** All SIVs, enriched with request data. */
  getAllSIVs(): Observable<FlowSIV[]> {
    return forkJoin({
      sivs: this.requisitionsService.getAllSIVs().pipe(
        map((res) => res.data ?? []),
        catchError(() => of([] as StoreIssueVoucherDto[])),
      ),
      requests: this.getAllRequests(),
    }).pipe(
      map(({ sivs, requests }) => {
        const requestById = new Map(requests.map((r) => [r.id, r]));
        return sivs.map((siv) =>
          this.toFlowSIV(siv, requestById.get(String(siv.serviceRequestId))),
        );
      }),
      catchError(() => of([] as FlowSIV[])),
    );
  }

  /** SIVs for a specific employee, matched via their request IDs. */
  getSIVsForEmployee(
    employeeId: string,
    identity?: { email?: string; fullName?: string; username?: string },
  ): Observable<FlowSIV[]> {
    return forkJoin({
      sivs: this.requisitionsService.getAllSIVs().pipe(
        map((res) => res.data ?? []),
        catchError(() => of([] as StoreIssueVoucherDto[])),
      ),
      requests: this.getRequestsForEmployee(employeeId, identity),
    }).pipe(
      map(({ sivs, requests }) => {
        const myIds = new Set(requests.map((r) => r.id));
        const requestById = new Map(requests.map((r) => [r.id, r]));
        return sivs
          .filter((siv) => myIds.has(String(siv.serviceRequestId)))
          .map((siv) => this.toFlowSIV(siv, requestById.get(String(siv.serviceRequestId))));
      }),
      catchError(() => of([] as FlowSIV[])),
    );
  }

  /**
   * Sync backend requests into the local WorkflowService so cross-tab and
   * notification-driven features still work.
   */
  syncToWorkflow(requests: FlowRequest[]): void {
    const rows: ApiServiceRequestRow[] = requests.map((r) => ({
      id: r.id,
      srNumber: r.srNumber,
      requesterId: r.requesterId,
      requesterName: r.requesterName,
      department: r.department,
      purpose: r.purpose,
      urgency: r.urgency,
      requestDate: r.requestDate,
      status: r.rawStatus,
      totalItems: r.totalItems,
      totalQuantity: r.totalQuantity,
    }));

    this.workflowService.mergeApiServiceRequests(rows, {
      managerQueueId: this.workflowService.getManagerQueueIdForCurrentUser(),
      employeeIdFilter: null,
    });
  }

  // ── Status helpers ──────────────────────────────────────────────────────

  normalizeStatus(apiStatus: string): FlowStatus {
    const s = (apiStatus || '').toLowerCase().trim();
    if (s.includes('reject') || s.includes('denied')) return 'Rejected';
    if (s === 'cancelled' || s === 'canceled') return 'Cancelled';
    if (
      s.includes('issued') ||
      s.includes('completed') ||
      s.includes('fulfilled') ||
      s.includes('closed')
    )
      return 'Issued';
    if (s.includes('approved') || s.includes('accepted')) return 'Approved';
    return 'Pending';
  }

  mapUrgency(urgency?: string): FlowUrgency {
    const u = (urgency || '').toLowerCase();
    if (u.includes('urgent') || u.includes('critical')) return 'Urgent';
    if (u.includes('high')) return 'High';
    if (u.includes('low')) return 'Low';
    return 'Medium';
  }

  urgencyIcon(urgency: FlowUrgency): string {
    switch (urgency) {
      case 'Urgent':
        return '🔴';
      case 'High':
        return '🟠';
      case 'Medium':
        return '🟡';
      default:
        return '🟢';
    }
  }

  formatDateStr(dateStr: string): string {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  // ── Internal mappers ───────────────────────────────────────────────────

  private toFlowRequest(sr: ApiServiceRequest): FlowRequest {
    const status = this.normalizeStatus(sr.status);
    const submittedDate = new Date(sr.requestDate);
    const waitingDays = Math.max(
      0,
      Math.floor((Date.now() - submittedDate.getTime()) / 86400000),
    );

    return {
      id: sr.id,
      srNumber: sr.srNumber,
      requesterId: sr.requesterId || '',
      requesterName: sr.requesterName || 'Employee',
      department: sr.department || 'Unassigned',
      purpose: sr.purpose || (sr as unknown as Record<string, string>)['notes'] || 'Service Request',
      urgency: this.mapUrgency(sr.urgency),
      requestDate: this.formatDateStr(sr.requestDate),
      status,
      rawStatus: sr.status,
      totalItems: sr.totalItems ?? 0,
      totalQuantity: sr.totalQuantity ?? 0,
      issuedQuantity: sr.issuedQuantity ?? 0,
      approvedByName: sr.approvedByName,
      waitingDays,
    };
  }

  private toFlowSIV(siv: StoreIssueVoucherDto, request?: FlowRequest): FlowSIV {
    return {
      id: String(siv.id),
      sivNumber: siv.voucherNumber || `SIV-${String(siv.id).slice(0, 8)}`,
      serviceRequestId: String(siv.serviceRequestId),
      srNumber: request?.srNumber || String(siv.serviceRequestId),
      requesterName: request?.requesterName || 'Employee',
      department: request?.department || 'Unassigned',
      issuedBy: siv.issuedBy || 'Storekeeper',
      issueDate: siv.issueDate ? this.formatDateStr(siv.issueDate) : 'N/A',
      status: (siv.status || '').toLowerCase().includes('pending') ? 'Pending' : 'Issued',
      totalItems: (siv.items ?? []).length,
      items: (siv.items ?? []).map((item: Record<string, unknown>) => ({
        itemName: String(item['itemName'] ?? item['name'] ?? 'Item'),
        quantity: Number(item['quantity'] ?? item['issuedQty'] ?? 0),
      })),
    };
  }
}
