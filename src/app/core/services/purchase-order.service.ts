import { Injectable, inject, signal } from '@angular/core';
import { BehaviorSubject, Observable, map, catchError, of } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { AuditLogService } from './audit-log.service';
import { NotificationEngineService } from './notification-engine.service';
import { ApprovalPolicyService } from './approval-policy.service';
import { ApprovalService } from './approval.service';
import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from '../models/purchase-order.model';
import { ApiResponseModel } from '../models/api-response.model';
import { normalizePasListResponse } from '../utils/pas-api-json.util';

@Injectable({ providedIn: 'root' })
export class PurchaseOrderService {
  private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);
  private readonly auditLog = inject(AuditLogService);
  private readonly notificationEngine = inject(NotificationEngineService);
  private readonly approvalPolicy = inject(ApprovalPolicyService);
  private readonly approvalService = inject(ApprovalService);

  private readonly orders = signal<PurchaseOrder[]>([]);
  private readonly orderUpdates = new BehaviorSubject<PurchaseOrder | null>(null);

  getOrderUpdates(): Observable<PurchaseOrder | null> {
    return this.orderUpdates.asObservable();
  }

  getAll(): PurchaseOrder[] {
    return this.orders();
  }

  getById(id: string): PurchaseOrder | undefined {
    return this.orders().find((o) => o.id === id);
  }

  getPendingApproval(): PurchaseOrder[] {
    return this.orders().filter((o) => o.status === 'Pending Approval');
  }

  getPendingDirectorApproval(): PurchaseOrder[] {
    return this.orders().filter((o) => o.status === 'Pending Approval' && o.requiresDirectorApproval);
  }

  create(params: {
    supplierId: string;
    supplierName: string;
    items: Omit<PurchaseOrderItem, 'id' | 'totalCost'>[];
    notes?: string;
  }): PurchaseOrder {
    const user = this.authService.getCurrentUser();
    const items: PurchaseOrderItem[] = params.items.map((item, i) => ({
      ...item,
      id: `po_item_${i}_${Date.now()}`,
      totalCost: item.quantity * item.unitCost,
    }));
    const totalCost = items.reduce((sum, i) => sum + i.totalCost, 0);

    const decision = this.approvalPolicy.evaluate({
      itemType: 'PurchaseOrder',
      estimatedCost: totalCost,
      createdByRole: this.authService.mapUserToDashboardRole(user),
      createdById: user?.id,
    });

    const po: PurchaseOrder = {
      id: `po_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      poNumber: `PO-${new Date().getFullYear()}-${String(this.orders().length + 1).padStart(4, '0')}`,
      supplierId: params.supplierId,
      supplierName: params.supplierName,
      status: decision.allowed && !decision.requiresAdminEscalation ? 'Approved' : 'Pending Approval',
      items,
      totalCost,
      notes: params.notes || '',
      createdBy: user?.fullName || 'Storekeeper',
      createdById: user?.id || '',
      createdDate: new Date(),
      requiresDirectorApproval: decision.requiresDirectorEscalation,
    };

    this.orders.update((orders) => [...orders, po]);

    this.approvalService.getChain('PurchaseOrder', po.id, totalCost);

    if (po.status === 'Pending Approval') {
      this.notificationEngine.notifyPOApproval({
        poNumber: po.poNumber,
        requestId: po.id,
      });
    }

    this.auditLog.createAuditLog(
      'APPROVE_PO',
      'PurchaseOrder',
      `PO ${po.poNumber} created for ${po.supplierName} ($${totalCost})`,
      { severity: po.requiresDirectorApproval ? 'warning' : 'info' },
    );

    this.orderUpdates.next(po);
    return po;
  }

  approve(id: string, approverName: string, isDirectorApproval?: boolean): void {
    const po = this.orders().find((o) => o.id === id);
    if (!po || po.status !== 'Pending Approval') return;

    if (isDirectorApproval) {
      const updated: PurchaseOrder = {
        ...po,
        directorApprovedBy: approverName,
        directorApprovedDate: new Date(),
        status: 'Approved',
        approvedBy: approverName,
        approvedDate: new Date(),
      };
      this.updateOrder(updated);
      this.notificationEngine.notifyPOApproved({ poNumber: po.poNumber, requestId: po.id });
      return;
    }

    if (po.requiresDirectorApproval) {
      const updated: PurchaseOrder = {
        ...po,
        approvedBy: approverName,
        approvedDate: new Date(),
      };
      this.updateOrder(updated);
      this.notificationEngine.dispatch({
        event: 'PO Needs Approval',
        recipients: [{ role: 'Director' as any }],
        title: 'Director Approval Required',
        message: `PO ${po.poNumber} exceeds $2,000 and requires Director approval`,
        requestId: po.id,
        actionRequired: true,
        actionUrl: '/director/dashboard',
        priority: 'High',
      });
      return;
    }

    const updated: PurchaseOrder = {
      ...po,
      status: 'Approved',
      approvedBy: approverName,
      approvedDate: new Date(),
    };
    this.updateOrder(updated);

    this.notificationEngine.notifyPOApproved({ poNumber: po.poNumber, requestId: po.id });
    this.auditLog.createAuditLog('APPROVE_PO', 'PurchaseOrder', `PO ${po.poNumber} approved by ${approverName}`, { severity: 'info' });
  }

  reject(id: string, rejectedBy: string, reason: string): void {
    const po = this.orders().find((o) => o.id === id);
    if (!po || po.status !== 'Pending Approval') return;

    const updated: PurchaseOrder = {
      ...po,
      status: 'Rejected',
      rejectedBy,
      rejectedReason: reason,
      rejectedDate: new Date(),
    };
    this.updateOrder(updated);

    this.notificationEngine.dispatch({
      event: 'PO Needs Approval',
      recipients: [{ role: 'Storekeeper', userId: po.createdById }],
      title: 'Purchase Order Rejected',
      message: `PO ${po.poNumber} was rejected by ${rejectedBy}. Reason: ${reason}`,
      requestId: po.id,
      actionRequired: false,
      priority: 'High',
    });

    this.auditLog.createAuditLog('APPROVE_PO', 'PurchaseOrder', `PO ${po.poNumber} rejected by ${rejectedBy}: ${reason}`, { severity: 'warning' });
  }

  markOrdered(id: string): void {
    const po = this.orders().find((o) => o.id === id);
    if (!po) return;
    this.updateOrder({ ...po, status: 'Ordered', orderedDate: new Date() });
  }

  markReceived(id: string): void {
    const po = this.orders().find((o) => o.id === id);
    if (!po) return;
    this.updateOrder({ ...po, status: 'Received', receivedDate: new Date() });
  }

  markCompleted(id: string): void {
    const po = this.orders().find((o) => o.id === id);
    if (!po) return;
    this.updateOrder({ ...po, status: 'Completed', completedDate: new Date() });
  }

  cancel(id: string): void {
    const po = this.orders().find((o) => o.id === id);
    if (!po || po.status === 'Completed' || po.status === 'Received') return;
    this.updateOrder({ ...po, status: 'Cancelled' });
  }

  approveWithChain(id: string, approverName: string, approverId: string, approverRole: string, comments?: string): PurchaseOrder | null {
    const po = this.orders().find((o) => o.id === id);
    if (!po || po.status !== 'Pending Approval') return null;

    const userRole = this.approvalService.resolveApproverRole(approverRole);
    if (!userRole) return null;

    const result = this.approvalService.processApproval({
      entityType: 'PurchaseOrder',
      entityId: id,
      value: po.totalCost,
      approverRole: userRole,
      approverName,
      approverId,
      approved: true,
      comments,
    });

    if (!result.success) return null;

    const isFullyApproved = result.chain.overallStatus === 'approved';
    const isAwaitingNext = result.chain.overallStatus === 'in_progress' && result.nextRole;

    let updated: PurchaseOrder;

    if (isFullyApproved) {
      updated = {
        ...po,
        status: 'Approved',
        approvedBy: approverName,
        approvedById: approverId,
        approvedDate: new Date(),
        directorApprovedBy: userRole === 'Director' ? approverName : undefined,
        directorApprovedDate: userRole === 'Director' ? new Date() : undefined,
      };
      this.updateOrder(updated);
      this.notificationEngine.notifyPOApproved({ poNumber: po.poNumber, requestId: po.id });
    } else if (isAwaitingNext && result.nextRole === 'Director') {
      updated = {
        ...po,
        approvedBy: approverName,
        approvedById: approverId,
        approvedDate: new Date(),
      };
      this.updateOrder(updated);
      this.notificationEngine.dispatch({
        event: 'PO Needs Approval',
        recipients: [{ role: 'Director' as any }],
        title: 'Director Approval Required',
        message: `PO ${po.poNumber} requires Director approval (step 2)`,
        requestId: po.id,
        actionRequired: true,
        actionUrl: '/director/dashboard',
        priority: 'High',
      });
    } else {
      return po;
    }

    return updated!;
  }

  rejectWithChain(id: string, rejectedBy: string, rejectedById: string, approverRole: string, reason: string): PurchaseOrder | null {
    const po = this.orders().find((o) => o.id === id);
    if (!po || po.status !== 'Pending Approval') return null;

    const userRole = this.approvalService.resolveApproverRole(approverRole);
    if (!userRole) return null;

    const result = this.approvalService.processApproval({
      entityType: 'PurchaseOrder',
      entityId: id,
      value: po.totalCost,
      approverRole: userRole,
      approverName: rejectedBy,
      approverId: rejectedById,
      approved: false,
      comments: reason,
    });

    const updated: PurchaseOrder = {
      ...po,
      status: 'Rejected',
      rejectedBy,
      rejectedReason: reason,
      rejectedDate: new Date(),
    };
    this.updateOrder(updated);

    this.notificationEngine.dispatch({
      event: 'PO Needs Approval',
      recipients: [{ role: 'Storekeeper', userId: po.createdById }],
      title: 'Purchase Order Rejected',
      message: `PO ${po.poNumber} was rejected by ${rejectedBy}. Reason: ${reason}`,
      requestId: po.id,
      actionRequired: false,
      priority: 'High',
    });

    this.auditLog.createAuditLog('REJECT_PO', 'PurchaseOrder', `PO ${po.poNumber} rejected by ${rejectedBy}: ${reason}`, { severity: 'warning' });
    return updated;
  }

  checkPOEscalation(id: string): { reminderSent: boolean; autoEscalated: boolean; message: string } {
    const po = this.orders().find((o) => o.id === id);
    if (!po) return { reminderSent: false, autoEscalated: false, message: 'PO not found' };

    return this.approvalService.runEscalationCheck('PurchaseOrder', id, po.totalCost, po.createdDate);
  }

  getAllPendingEscalations(): { po: PurchaseOrder; status: string }[] {
    return this.orders()
      .filter((o) => o.status === 'Pending Approval')
      .map((o) => {
        const check = this.checkPOEscalation(o.id);
        return { po: o, status: check.message };
      });
  }

  private updateOrder(order: PurchaseOrder): void {
    this.orders.update((orders) => orders.map((o) => (o.id === order.id ? order : o)));
    this.orderUpdates.next(order);
  }

  // ═══════════════════════════════════════════════════════════
  //  API-backed methods (call the .NET backend)
  // ═══════════════════════════════════════════════════════════

  /** Fetch POs from the API. Returns normalized list response. */
  fetchAll(params?: {
    status?: string;
    supplierId?: string;
    fromDate?: string;
    toDate?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<ApiResponseModel<PurchaseOrder[]>> {
    return this.apiService.get<unknown>('PurchaseOrders', params).pipe(
      map((raw) => normalizePasListResponse<PurchaseOrder>(raw)),
      catchError(() => of({ success: false, message: 'API unavailable', data: [], statusCode: 0 })),
    );
  }

  /** Fetch POs pending approval from the API. */
  fetchPendingApproval(params?: {
    pageNumber?: number;
    pageSize?: number;
  }): Observable<ApiResponseModel<PurchaseOrder[]>> {
    return this.apiService.get<unknown>('PurchaseOrders/pending', params).pipe(
      map((raw) => normalizePasListResponse<PurchaseOrder>(raw)),
      catchError(() => of({ success: false, message: 'API unavailable', data: this.getPendingApproval(), statusCode: 0 })),
    );
  }

  /** Fetch a single PO by ID from the API. */
  fetchById(id: string): Observable<ApiResponseModel<PurchaseOrder>> {
    return this.apiService.get<unknown>(`PurchaseOrders/${id}`).pipe(
      map((raw) => {
        const n = normalizePasListResponse<PurchaseOrder>(raw);
        return { success: n.success, message: n.message, data: n.data?.[0] ?? (raw as any)?.data, statusCode: n.statusCode };
      }) as any,
      catchError(() => {
        const local = this.getById(id);
        return of({ success: !!local, message: local ? '' : 'Not found', data: local, statusCode: local ? 200 : 404 });
      }),
    );
  }

  /** Create a PO via the API. Falls back to local in-memory if API is unavailable. */
  createViaApi(data: {
    supplierId: string;
    supplierName: string;
    items: Omit<PurchaseOrderItem, 'id' | 'totalCost'>[];
    notes?: string;
    expectedDeliveryDate?: string;
  }): Observable<ApiResponseModel<string>> {
    const totalCost = data.items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
    const decision = this.approvalPolicy.evaluate({
      itemType: 'PurchaseOrder',
      estimatedCost: totalCost,
      createdByRole: this.authService.mapUserToDashboardRole(this.authService.getCurrentUser()),
      createdById: this.authService.getCurrentUser()?.id,
    });

    const body = {
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      items: data.items,
      notes: data.notes || '',
      totalCost,
      expectedDeliveryDate: data.expectedDeliveryDate,
      requiresDirectorApproval: decision.requiresDirectorEscalation,
    };

    return this.apiService.post<string>('PurchaseOrders', body).pipe(
      map((raw) => raw as any as ApiResponseModel<string>),
      catchError(() => {
        const local = this.create(data);
        return of({ success: true, message: 'Created locally (API unavailable)', data: local.id, statusCode: 201 });
      }),
    );
  }

  /** Approve a PO via the API. */
  approveViaApi(id: string, approverName: string): Observable<ApiResponseModel<unknown>> {
    return this.apiService.post<unknown>(`PurchaseOrders/${id}/approve`, { approvedBy: approverName }).pipe(
      map((raw) => raw as any as ApiResponseModel<unknown>),
      catchError(() => {
        this.approve(id, approverName, false);
        return of({ success: true, message: 'Approved locally (API unavailable)', data: null, statusCode: 200 });
      }),
    );
  }

  /** Reject a PO via the API. */
  rejectViaApi(id: string, rejectedBy: string, reason: string): Observable<ApiResponseModel<unknown>> {
    return this.apiService.post<unknown>(`PurchaseOrders/${id}/reject`, { rejectedBy, reason }).pipe(
      map((raw) => raw as any as ApiResponseModel<unknown>),
      catchError(() => {
        this.reject(id, rejectedBy, reason);
        return of({ success: true, message: 'Rejected locally (API unavailable)', data: null, statusCode: 200 });
      }),
    );
  }

  /** Mark a PO as ordered via the API. */
  orderViaApi(id: string): Observable<ApiResponseModel<unknown>> {
    return this.apiService.put<unknown>(`PurchaseOrders/${id}/order`, {}).pipe(
      map((raw) => raw as any as ApiResponseModel<unknown>),
      catchError(() => {
        this.markOrdered(id);
        return of({ success: true, message: 'Marked ordered locally (API unavailable)', data: null, statusCode: 200 });
      }),
    );
  }

  /** Mark a PO as received via the API. */
  receiveViaApi(id: string): Observable<ApiResponseModel<unknown>> {
    return this.apiService.put<unknown>(`PurchaseOrders/${id}/receive`, {}).pipe(
      map((raw) => raw as any as ApiResponseModel<unknown>),
      catchError(() => {
        this.markReceived(id);
        return of({ success: true, message: 'Marked received locally (API unavailable)', data: null, statusCode: 200 });
      }),
    );
  }

  /** Mark a PO as completed via the API. */
  completeViaApi(id: string): Observable<ApiResponseModel<unknown>> {
    return this.apiService.put<unknown>(`PurchaseOrders/${id}/complete`, {}).pipe(
      map((raw) => raw as any as ApiResponseModel<unknown>),
      catchError(() => {
        this.markCompleted(id);
        return of({ success: true, message: 'Completed locally (API unavailable)', data: null, statusCode: 200 });
      }),
    );
  }

  /** Cancel a PO via the API. */
  cancelViaApi(id: string): Observable<ApiResponseModel<unknown>> {
    return this.apiService.put<unknown>(`PurchaseOrders/${id}/cancel`, {}).pipe(
      map((raw) => raw as any as ApiResponseModel<unknown>),
      catchError(() => {
        this.cancel(id);
        return of({ success: true, message: 'Cancelled locally (API unavailable)', data: null, statusCode: 200 });
      }),
    );
  }

  /** Merge API results into the local signal store. */
  mergeApiOrders(apiOrders: PurchaseOrder[]): void {
    this.orders.update((existing) => {
      const byId = new Map(existing.map((o) => [o.id, o]));
      for (const o of apiOrders) {
        byId.set(o.id, o);
      }
      return Array.from(byId.values());
    });
  }
}
