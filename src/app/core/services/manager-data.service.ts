import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import {
  ServiceRequest as WorkflowRequest,
  WorkflowService,
} from './workflow.service';
import { ServiceRequestService } from '../../features/requisition/service-requests/services/service-request.service';
import { RequisitionsService, StoreIssueVoucherDto } from './requisitions.service';
import { DashboardService } from './dashboard.service';

export interface ManagerRequestRow {
  id: string;
  requestNumber: string;
  requesterName: string;
  requesterId: string;
  department: string;
  priority: string;
  status: string;
  rawStatus: string;
  requestedDate: string;
  requiredDate: string;
  approvedDate?: string;
  rejectedDate?: string;
  issuedDate?: string;
  itemCount: number;
  estimatedValue: number;
  description: string;
  approvedBy?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  sivNumber?: string;
  issuedBy?: string;
}

export interface ManagerSivItemRow {
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ManagerSivRow {
  id: string;
  sivNumber: string;
  requestNumber: string;
  requesterName: string;
  department: string;
  status: 'Pending' | 'Issued';
  issueDate: string;
  totalItems: number;
  totalValue: number;
  issuedBy?: string;
  items?: ManagerSivItemRow[];
}

@Injectable({ providedIn: 'root' })
export class ManagerDataService {
  private readonly workflowService = inject(WorkflowService);
  private readonly serviceRequestService = inject(ServiceRequestService);
  private readonly requisitionsService = inject(RequisitionsService);
  private readonly dashboardService = inject(DashboardService);

  syncServiceRequests(): Observable<WorkflowRequest[]> {
    return this.serviceRequestService.getServiceRequests().pipe(
      map((res) => this.workflowService.extractApiServiceRequestRows(res)),
      tap((items) => {
        this.workflowService.mergeApiServiceRequests(items, {
          managerQueueId: this.workflowService.getManagerQueueIdForCurrentUser(),
        });
      }),
      map(() => this.managerRequests()),
      catchError(() => of(this.managerRequests())),
    );
  }

  managerRequests(): WorkflowRequest[] {
    const managerId = this.workflowService.getManagerQueueIdForCurrentUser();
    return this.workflowService
      .getRequestsForManagerAll(managerId)
      .sort((a, b) => this.dateMs(b.submittedDate) - this.dateMs(a.submittedDate));
  }

  requestRows(filter?: 'pending' | 'approved' | 'rejected' | 'issued'): ManagerRequestRow[] {
    return this.managerRequests()
      .filter((request) => {
        const status = this.displayRequestStatus(request.status);
        if (!filter) return true;
        if (filter === 'pending') return status === 'Pending';
        if (filter === 'approved') return status === 'Approved';
        if (filter === 'rejected') return status === 'Rejected';
        return status === 'Issued';
      })
      .map((request) => this.toRequestRow(request));
  }

  getSivs(): Observable<ManagerSivRow[]> {
    return forkJoin({
      requests: this.syncServiceRequests(),
      sivs: this.requisitionsService.getAllSIVs().pipe(
        map((response) => response.data ?? []),
        catchError(() => of([] as StoreIssueVoucherDto[])),
      ),
    }).pipe(
      map(({ requests, sivs }) => {
        const requestById = new Map(requests.map((request) => [request.id, request]));
        return sivs
          .map((siv) => this.toSivRow(siv, requestById.get(String(siv.serviceRequestId))))
          .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
      }),
      catchError(() => of([] as ManagerSivRow[])),
    );
  }

  menuBadgeCounts(): Observable<{
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    issuedRequests: number;
    allSivs: number;
    issuedSivs: number;
    lowStockItems: number;
  }> {
    return forkJoin({
      requests: this.syncServiceRequests(),
      sivs: this.getSivs(),
      stats: this.dashboardService.getStatistics().pipe(
        map((response) => response.data ?? null),
        catchError(() => of(null)),
      ),
    }).pipe(
      map(({ requests, sivs, stats }) => {
        const rows = requests.map((request) => this.displayRequestStatus(request.status));
        return {
          pendingRequests: rows.filter((status) => status === 'Pending').length,
          approvedRequests: rows.filter((status) => status === 'Approved').length,
          rejectedRequests: rows.filter((status) => status === 'Rejected').length,
          issuedRequests: rows.filter((status) => status === 'Issued').length,
          allSivs: sivs.length,
          issuedSivs: sivs.filter((siv) => siv.status === 'Issued').length,
          lowStockItems: stats?.lowStockItemsCount ?? 0,
        };
      }),
      catchError(() =>
        of({
          pendingRequests: 0,
          approvedRequests: 0,
          rejectedRequests: 0,
          issuedRequests: 0,
          allSivs: 0,
          issuedSivs: 0,
          lowStockItems: 0,
        }),
      ),
    );
  }

  displayRequestStatus(status: string): 'Pending' | 'Approved' | 'Rejected' | 'Issued' {
    const normalized = (status || '').toLowerCase();
    if (normalized.includes('reject') || normalized.includes('denied')) return 'Rejected';
    if (normalized.includes('approve') || normalized.includes('accepted') || normalized.includes('complete')) return 'Approved';
    if (
      normalized.includes('issued') ||
      normalized.includes('fulfilled') ||
      normalized.includes('closed')
    ) {
      return 'Issued';
    }
    return 'Pending';
  }

  private toRequestRow(request: WorkflowRequest): ManagerRequestRow {
    const status = this.displayRequestStatus(request.status);
    return {
      id: request.id,
      requestNumber: request.srNumber,
      requesterName: request.employeeName || 'Employee',
      requesterId: request.employeeId || '',
      department: request.department || 'Unassigned',
      priority: request.priority || 'Medium',
      status,
      rawStatus: request.status,
      requestedDate: this.formatDate(request.submittedDate),
      requiredDate: this.formatDate(request.requiredDate),
      approvedDate: request.managerReviewDate
        ? this.formatDate(request.managerReviewDate)
        : undefined,
      rejectedDate: request.managerReviewDate
        ? this.formatDate(request.managerReviewDate)
        : undefined,
      issuedDate: request.completedDate ? this.formatDate(request.completedDate) : undefined,
      itemCount: request.items?.length ?? 0,
      estimatedValue: request.estimatedCost || 0,
      description: request.justification || 'Service request',
      approvedBy: request.managerName || request.workflowHistory?.at(-1)?.performedBy || 'Manager',
      rejectedBy: request.managerName || request.workflowHistory?.at(-1)?.performedBy || 'Manager',
      rejectionReason: request.managerComments || 'No reason provided',
      sivNumber: status === 'Issued' ? this.sivNumberFor(request) : undefined,
      issuedBy: status === 'Issued' ? 'Storekeeper' : undefined,
    };
  }

  private toSivRow(siv: StoreIssueVoucherDto, request?: WorkflowRequest): ManagerSivRow {
    const items = (siv.items ?? []).map((item) => {
      const quantity = this.numberFrom(item, ['quantity', 'issuedQty', 'requestedQty']);
      const unitPrice = this.numberFrom(item, ['unitPrice', 'unitCost', 'price']);
      return {
        itemName: this.stringFrom(item, ['itemName', 'name', 'description']) || 'Item',
        quantity,
        unitPrice,
        totalPrice:
          this.numberFrom(item, ['totalPrice', 'totalCost', 'amount']) || quantity * unitPrice,
      };
    });
    const totalValue = items.reduce((sum, item) => sum + item.totalPrice, 0);
    return {
      id: String(siv.id),
      sivNumber: siv.voucherNumber || `SIV-${String(siv.id).slice(0, 8)}`,
      requestNumber: request?.srNumber || String(siv.serviceRequestId || ''),
      requesterName: request?.employeeName || 'Employee',
      department: request?.department || 'Unassigned',
      status: (siv.status || '').toLowerCase().includes('pending') ? 'Pending' : 'Issued',
      issueDate: this.formatDate(siv.issueDate),
      totalItems: items.length,
      totalValue,
      issuedBy: siv.issuedBy || undefined,
      items,
    };
  }

  private sivNumberFor(request: WorkflowRequest): string {
    return `SIV-${request.srNumber.replace(/^SR-?/i, '')}`;
  }

  private formatDate(date: string | Date | undefined): string {
    if (!date) return 'N/A';
    const parsed = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(parsed.getTime())) return String(date);
    return parsed.toLocaleDateString();
  }

  private dateMs(date: string | Date | undefined): number {
    if (!date) return 0;
    const parsed = date instanceof Date ? date : new Date(date);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  private numberFrom(source: unknown, keys: string[]): number {
    const record = source as Record<string, unknown>;
    for (const key of keys) {
      const value = Number(record?.[key] ?? 0);
      if (Number.isFinite(value) && value > 0) return value;
    }
    return 0;
  }

  private stringFrom(source: unknown, keys: string[]): string {
    const record = source as Record<string, unknown>;
    for (const key of keys) {
      const value = record?.[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
  }
}
