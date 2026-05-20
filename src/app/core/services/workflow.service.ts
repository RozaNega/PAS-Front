import { Injectable, inject, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { CurrentUserService } from './current-user.service';
import { SignalRService } from './signalr.service';

/** Days without manager action before compliance oversight kicks in. */
export const STALE_PENDING_DAYS = 5;

export type RequestStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Review'
  | 'Manager Approved'
  | 'Manager Rejected'
  | 'Admin Approved'
  | 'Admin Rejected'
  | 'Compliance Review'
  | 'Completed'
  | 'Cancelled';
export type RequestPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type UserRole = 'Employee' | 'Manager' | 'Admin' | 'Compliance';

export const WORKFLOW_PENDING_STATUSES: readonly RequestStatus[] = [
  'Submitted',
  'Under Review',
] as const;

export const WORKFLOW_APPROVED_STATUSES: readonly RequestStatus[] = [
  'Manager Approved',
  'Admin Approved',
  'Compliance Review',
  'Completed',
] as const;

export const WORKFLOW_REJECTED_STATUSES: readonly RequestStatus[] = [
  'Manager Rejected',
  'Admin Rejected',
] as const;

/** Approved but not yet fully completed (matches API "Approved" bucket). */
export const WORKFLOW_APPROVED_ACTIVE_STATUSES: readonly RequestStatus[] = [
  'Manager Approved',
  'Admin Approved',
  'Compliance Review',
] as const;

/** Higher rank = further along the workflow (used when merging API + local state). */
const REQUEST_STATUS_RANK: Record<RequestStatus, number> = {
  Draft: 0,
  Submitted: 1,
  'Under Review': 2,
  'Manager Rejected': 5,
  'Admin Rejected': 5,
  Cancelled: 5,
  'Manager Approved': 6,
  'Compliance Review': 7,
  'Admin Approved': 8,
  Completed: 9,
};

export interface ServiceRequest {
  id: string;
  srNumber: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  managerId?: string;
  managerName?: string;
  items: RequestItem[];
  priority: RequestPriority;
  status: RequestStatus;
  justification: string;
  submittedDate: Date;
  requiredDate: Date;
  managerReviewDate?: Date;
  managerComments?: string;
  adminReviewDate?: Date;
  adminComments?: string;
  complianceReviewDate?: Date;
  complianceComments?: string;
  staleEscalatedAt?: Date;
  lastManagerReminderAt?: Date;
  completedDate?: Date;
  estimatedCost?: number;
  actualCost?: number;
  attachments?: string[];
  workflowHistory: WorkflowStep[];
}

export interface RequestItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  category: string;
  specifications?: string;
}

export interface WorkflowStep {
  id: string;
  action: string;
  performedBy: string;
  performedByRole: UserRole;
  timestamp: Date;
  comments?: string;
  previousStatus: RequestStatus;
  newStatus: RequestStatus;
}

export interface NotificationMessage {
  id: string;
  recipientId: string;
  recipientRole: UserRole;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  requestId?: string;
  isRead: boolean;
  createdDate: Date;
  actionRequired?: boolean;
  actionUrl?: string;
}

const STORAGE_REQUESTS = 'pas_workflow_requests_v1';
const STORAGE_NOTIFICATIONS = 'pas_workflow_notifications_v1';

/** API list row shape (from ServiceRequestService) — loose to tolerate backend variants. */
export interface ApiServiceRequestRow {
  id: string;
  srNumber: string;
  requesterId?: string;
  requesterName?: string;
  department?: string;
  purpose?: string;
  notes?: string;
  urgency?: string;
  requestDate: string;
  status: string;
  totalItems?: number;
  totalQuantity?: number;
}

@Injectable({
  providedIn: 'root',
})
export class WorkflowService {
  private readonly authService = inject(AuthService);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly signalRService = inject(SignalRService);

  private readonly requests = signal<ServiceRequest[]>([]);
  private readonly notifications = signal<NotificationMessage[]>([]);

  private requestUpdates$ = new BehaviorSubject<ServiceRequest | null>(null);
  private notificationUpdates$ = new BehaviorSubject<NotificationMessage | null>(null);

  constructor() {
    this.restoreFromStorage();
    this.listenForCrossTabUpdates();
  }

  /** Reload workflow data when another tab updates localStorage (e.g. employee submit → manager tab). */
  private listenForCrossTabUpdates(): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.addEventListener('storage', (event) => {
      if (event.key !== STORAGE_REQUESTS && event.key !== STORAGE_NOTIFICATIONS) {
        return;
      }
      this.restoreFromStorage();
      const latestNotification = this.notifications().at(-1) ?? null;
      const latestRequest = this.requests().at(-1) ?? null;
      if (latestRequest) {
        this.requestUpdates$.next(latestRequest);
      }
      if (latestNotification) {
        this.notificationUpdates$.next(latestNotification);
      }
    });
  }

  /** Target manager queue when an employee submits a request. */
  getAssignedManagerQueueId(): string {
    return environment.defaultManagerQueueId?.trim() || 'mgr_001';
  }

  /** Manager queue for the logged-in user (managers see their id + shared default queue). */
  getManagerQueueIdForCurrentUser(): string {
    const user = this.currentUserService.getCurrentUserValue();
    const role = user ? this.authService.mapUserToDashboardRole(user) : null;
    if (role === 'manager' && user?.id) {
      return user.id;
    }
    return this.getAssignedManagerQueueId();
  }

  /** @deprecated Use getAssignedManagerQueueId or getManagerQueueIdForCurrentUser */
  getDefaultManagerQueueId(): string {
    return this.getAssignedManagerQueueId();
  }

  private managerOwnsRequest(req: ServiceRequest, managerId: string): boolean {
    const assigned = this.getAssignedManagerQueueId();
    return req.managerId === managerId || req.managerId === assigned || !req.managerId;
  }

  getRequestUpdates(): Observable<ServiceRequest | null> {
    return this.requestUpdates$.asObservable();
  }

  getNotificationUpdates(): Observable<NotificationMessage | null> {
    return this.notificationUpdates$.asObservable();
  }

  getRequestsForEmployee(employeeId: string, identity?: { email?: string }): ServiceRequest[] {
    const id = employeeId?.trim();
    const email = identity?.email?.trim().toLowerCase();
    return this.requests().filter((req) => {
      if (id && req.employeeId === id) {
        return true;
      }
      if (email && req.employeeEmail?.trim().toLowerCase() === email) {
        return true;
      }
      return false;
    });
  }

  getRequestsForManager(managerId: string): ServiceRequest[] {
    return this.requests().filter(
      (req) =>
        this.managerOwnsRequest(req, managerId) &&
        ['Submitted', 'Under Review'].includes(req.status),
    );
  }

  getRequestsForManagerAll(managerId: string): ServiceRequest[] {
    return this.requests().filter((req) => this.managerOwnsRequest(req, managerId));
  }

  getPendingRequestsForEmployee(
    employeeId: string,
    identity?: { email?: string },
  ): ServiceRequest[] {
    return this.getRequestsForEmployee(employeeId, identity).filter((req) =>
      WORKFLOW_PENDING_STATUSES.includes(req.status),
    );
  }

  getApprovedRequestsForEmployee(
    employeeId: string,
    identity?: { email?: string },
  ): ServiceRequest[] {
    return this.getRequestsForEmployee(employeeId, identity).filter((req) =>
      WORKFLOW_APPROVED_STATUSES.includes(req.status),
    );
  }

  getRejectedRequestsForEmployee(
    employeeId: string,
    identity?: { email?: string },
  ): ServiceRequest[] {
    return this.getRequestsForEmployee(employeeId, identity).filter((req) =>
      WORKFLOW_REJECTED_STATUSES.includes(req.status),
    );
  }

  getApprovedRequestsForManager(managerId: string): ServiceRequest[] {
    return this.getRequestsForManagerAll(managerId).filter((req) =>
      WORKFLOW_APPROVED_STATUSES.includes(req.status),
    );
  }

  getRejectedRequestsForManager(managerId: string): ServiceRequest[] {
    return this.getRequestsForManagerAll(managerId).filter((req) =>
      WORKFLOW_REJECTED_STATUSES.includes(req.status),
    );
  }

  /** Pending requests exceeding the SLA without manager action. */
  getStalePendingRequests(thresholdDays = STALE_PENDING_DAYS): ServiceRequest[] {
    const thresholdMs = thresholdDays * 86400000;
    const now = Date.now();
    return this.requests().filter((req) => {
      if (!['Submitted', 'Under Review'].includes(req.status)) {
        return false;
      }
      const age = now - new Date(req.submittedDate).getTime();
      return age >= thresholdMs;
    });
  }

  /** Compliance oversight: high-value / compliance review + stale manager pending. */
  getComplianceOversightRequests(thresholdDays = STALE_PENDING_DAYS): ServiceRequest[] {
    const stale = this.getStalePendingRequests(thresholdDays);
    const compliance = this.getRequestsForCompliance();
    const byId = new Map<string, ServiceRequest>();
    [...stale, ...compliance].forEach((r) => byId.set(r.id, r));
    return Array.from(byId.values()).sort(
      (a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime(),
    );
  }

  getPendingDays(request: ServiceRequest): number {
    return Math.floor((Date.now() - new Date(request.submittedDate).getTime()) / 86400000);
  }

  remindManagerForPendingRequest(
    requestId: string,
    officerName: string,
    customMessage?: string,
  ): boolean {
    const request = this.requests().find((req) => req.id === requestId);
    if (!request || !['Submitted', 'Under Review'].includes(request.status)) {
      return false;
    }

    const managerId = request.managerId || this.getAssignedManagerQueueId();
    const days = this.getPendingDays(request);
    const message =
      customMessage ||
      `Compliance reminder: ${request.srNumber} has been pending for ${days} day(s) without manager action.`;

    this.createNotification({
      recipientId: managerId,
      recipientRole: 'Manager',
      type: 'warning',
      title: 'Pending approval reminder',
      message,
      requestId: request.id,
      actionRequired: true,
      actionUrl: `/manager/dashboard`,
    });

    const updated: ServiceRequest = {
      ...request,
      lastManagerReminderAt: new Date(),
      workflowHistory: [
        ...request.workflowHistory,
        {
          id: this.generateId(),
          action: 'Manager Reminder Sent',
          performedBy: officerName,
          performedByRole: 'Compliance',
          timestamp: new Date(),
          comments: message,
          previousStatus: request.status,
          newStatus: request.status,
        },
      ],
    };
    this.updateRequest(updated);
    return true;
  }

  /** Auto-notify compliance when requests sit in manager queue too long. */
  escalateStalePendingRequests(thresholdDays = STALE_PENDING_DAYS): number {
    let escalated = 0;
    for (const request of this.getStalePendingRequests(thresholdDays)) {
      if (request.staleEscalatedAt) {
        continue;
      }
      const days = this.getPendingDays(request);
      this.createNotification({
        recipientId: '',
        recipientRole: 'Compliance',
        type: 'warning',
        title: 'Stale pending approval',
        message: `${request.srNumber} from ${request.employeeName} has been pending for ${days} day(s). Please remind the assigned manager.`,
        requestId: request.id,
        actionRequired: true,
        actionUrl: `/compliance-officer/dashboard`,
      });
      this.updateRequest({ ...request, staleEscalatedAt: new Date() });
      escalated++;
    }
    return escalated;
  }

  getRequestsForAdmin(): ServiceRequest[] {
    return this.requests().filter((req) =>
      ['Manager Approved', 'Compliance Review'].includes(req.status),
    );
  }

  getRequestsForCompliance(): ServiceRequest[] {
    return this.requests().filter(
      (req) =>
        req.status === 'Compliance Review' ||
        (req.estimatedCost !== undefined && req.estimatedCost > 10000),
    );
  }

  getNotificationsForUser(userId: string, role: UserRole): NotificationMessage[] {
    return this.notifications().filter(
      (notif) => notif.recipientId === userId || notif.recipientRole === role,
    );
  }

  submitRequest(
    request: Omit<ServiceRequest, 'id' | 'srNumber' | 'workflowHistory' | 'submittedDate'>,
    options?: { id?: string; srNumber?: string },
  ): ServiceRequest {
    const managerId = request.managerId || this.getAssignedManagerQueueId();
    const newRequest: ServiceRequest = {
      ...request,
      managerId,
      id: options?.id?.trim() || this.generateId(),
      srNumber: options?.srNumber?.trim() || this.generateSRNumber(),
      status: 'Submitted',
      submittedDate: new Date(),
      workflowHistory: [
        {
          id: this.generateId(),
          action: 'Request Submitted',
          performedBy: request.employeeName,
          performedByRole: 'Employee',
          timestamp: new Date(),
          previousStatus: 'Draft',
          newStatus: 'Submitted',
        },
      ],
    };

    this.requests.update((requests) => [...requests, newRequest]);
    this.persist();

    this.createNotification({
      recipientId: managerId,
      recipientRole: 'Manager',
      type: 'info',
      title: 'New request submitted',
      message: `${request.employeeName} submitted ${newRequest.srNumber} for your review.`,
      requestId: newRequest.id,
      actionRequired: true,
      actionUrl: `/manager/dashboard`,
    });

    this.requestUpdates$.next(newRequest);
    return newRequest;
  }

  managerReviewRequest(
    requestId: string,
    action: 'approve' | 'reject',
    comments: string,
    reviewerId: string,
    reviewerName: string,
  ): void {
    const request = this.requests().find((req) => req.id === requestId);
    if (!request) return;

    const newStatus: RequestStatus = action === 'approve' ? 'Manager Approved' : 'Manager Rejected';

    const updatedRequest: ServiceRequest = {
      ...request,
      status: newStatus,
      managerReviewDate: new Date(),
      managerComments: comments,
      workflowHistory: [
        ...request.workflowHistory,
        {
          id: this.generateId(),
          action: action === 'approve' ? 'Manager Approved' : 'Manager Rejected',
          performedBy: reviewerName,
          performedByRole: 'Manager',
          timestamp: new Date(),
          comments,
          previousStatus: request.status,
          newStatus,
        },
      ],
    };

    this.updateRequest(updatedRequest);

    this.createNotification({
      recipientId: request.employeeId,
      recipientRole: 'Employee',
      type: action === 'approve' ? 'success' : 'error',
      title: action === 'approve' ? 'Request approved' : 'Request rejected',
      message: `Your request ${request.srNumber} was ${action === 'approve' ? 'approved' : 'rejected'} by ${reviewerName}.`,
      requestId: request.id,
      actionRequired: false,
      actionUrl: `/employee/dashboard`,
    });

    if (action === 'approve') {
      const needsComplianceReview = this.needsComplianceReview(updatedRequest);

      if (needsComplianceReview) {
        const complianceRequest: ServiceRequest = {
          ...updatedRequest,
          status: 'Compliance Review',
        };
        this.updateRequest(complianceRequest);
        this.createNotification({
          recipientId: '',
          recipientRole: 'Compliance',
          type: 'warning',
          title: 'Compliance review required',
          message: `Request ${request.srNumber} requires compliance review.`,
          requestId: request.id,
          actionRequired: true,
          actionUrl: `/compliance-officer/dashboard`,
        });
      } else {
        this.createNotification({
          recipientId: '',
          recipientRole: 'Admin',
          type: 'info',
          title: 'Request ready for processing',
          message: `Request ${request.srNumber} is ready for admin processing.`,
          requestId: request.id,
          actionRequired: true,
          actionUrl: `/admin/requisitions/pending`,
        });
      }
    }
  }

  adminReviewRequest(
    requestId: string,
    action: 'approve' | 'reject',
    comments: string,
    reviewerId: string,
    reviewerName: string,
  ): void {
    const request = this.requests().find((req) => req.id === requestId);
    if (!request) return;

    const newStatus: RequestStatus = action === 'approve' ? 'Admin Approved' : 'Admin Rejected';

    const updatedRequest: ServiceRequest = {
      ...request,
      status: newStatus,
      adminReviewDate: new Date(),
      adminComments: comments,
      workflowHistory: [
        ...request.workflowHistory,
        {
          id: this.generateId(),
          action: action === 'approve' ? 'Admin Approved' : 'Admin Rejected',
          performedBy: reviewerName,
          performedByRole: 'Admin',
          timestamp: new Date(),
          comments,
          previousStatus: request.status,
          newStatus,
        },
      ],
    };

    this.updateRequest(updatedRequest);

    [
      { id: request.employeeId, role: 'Employee' as UserRole },
      { id: request.managerId || '', role: 'Manager' as UserRole },
    ].forEach((recipient) => {
      this.createNotification({
        recipientId: recipient.id,
        recipientRole: recipient.role,
        type: action === 'approve' ? 'success' : 'error',
        title: `Request ${action === 'approve' ? 'approved' : 'rejected'} by admin`,
        message: `Request ${request.srNumber} was ${action}d by administration.`,
        requestId: request.id,
        actionRequired: false,
        actionUrl: `/employee/dashboard`,
      });
    });

    if (action === 'approve') {
      this.completeRequest(requestId, reviewerName);
    }
  }

  complianceReviewRequest(
    requestId: string,
    action: 'approve' | 'reject',
    comments: string,
    reviewerId: string,
    reviewerName: string,
  ): void {
    const request = this.requests().find((req) => req.id === requestId);
    if (!request) return;

    const newStatus: RequestStatus = action === 'approve' ? 'Manager Approved' : 'Cancelled';

    const updatedRequest: ServiceRequest = {
      ...request,
      status: newStatus,
      complianceReviewDate: new Date(),
      complianceComments: comments,
      workflowHistory: [
        ...request.workflowHistory,
        {
          id: this.generateId(),
          action: action === 'approve' ? 'Compliance Approved' : 'Compliance Rejected',
          performedBy: reviewerName,
          performedByRole: 'Compliance',
          timestamp: new Date(),
          comments,
          previousStatus: request.status,
          newStatus,
        },
      ],
    };

    this.updateRequest(updatedRequest);

    [
      { id: request.employeeId, role: 'Employee' as UserRole },
      { id: request.managerId || '', role: 'Manager' as UserRole },
    ].forEach((recipient) => {
      this.createNotification({
        recipientId: recipient.id,
        recipientRole: recipient.role,
        type: action === 'approve' ? 'success' : 'error',
        title: `Compliance Review ${action === 'approve' ? 'Approved' : 'Rejected'}`,
        message: `Request ${request.srNumber} was compliance-${action}d by ${reviewerName}.`,
        requestId: request.id,
        actionRequired: false,
        actionUrl: `/employee/dashboard`,
      });
    });

    if (action === 'approve') {
      this.createNotification({
        recipientId: '',
        recipientRole: 'Admin',
        type: 'info',
        title: 'Request ready for processing',
        message: `Request ${request.srNumber} is ready for admin processing after compliance approval.`,
        requestId: request.id,
        actionRequired: true,
        actionUrl: `/admin/requisitions/pending`,
      });
    }
  }

  completeRequest(requestId: string, completedBy: string): void {
    const request = this.requests().find((req) => req.id === requestId);
    if (!request) return;

    const updatedRequest: ServiceRequest = {
      ...request,
      status: 'Completed',
      completedDate: new Date(),
      workflowHistory: [
        ...request.workflowHistory,
        {
          id: this.generateId(),
          action: 'Request Completed',
          performedBy: completedBy,
          performedByRole: 'Admin',
          timestamp: new Date(),
          previousStatus: request.status,
          newStatus: 'Completed',
        },
      ],
    };

    this.updateRequest(updatedRequest);

    [
      { id: request.employeeId, role: 'Employee' as UserRole },
      { id: request.managerId || '', role: 'Manager' as UserRole },
    ].forEach((recipient) => {
      this.createNotification({
        recipientId: recipient.id,
        recipientRole: recipient.role,
        type: 'success',
        title: 'Request completed',
        message: `Request ${request.srNumber} has been completed.`,
        requestId: request.id,
        actionRequired: false,
        actionUrl: `/employee/dashboard`,
      });
    });
  }

  /**
   * Upserts API-backed service requests into the in-app workflow so the manager
   * dashboard and employee dashboard share one queue (until the API owns approvals end-to-end).
   */
  mergeApiServiceRequests(
    rows: ApiServiceRequestRow[],
    options: {
      managerQueueId: string;
      employeeIdFilter?: string | null;
      employeeIdentity?: { email?: string; fullName?: string; username?: string };
    },
  ): void {
    const managerQueueId = options.managerQueueId;
    const empFilter = options.employeeIdFilter;

    const identity = options.employeeIdentity;
    const filtered = rows.filter((r) => {
      if (!empFilter) return true;
      return this.apiRowBelongsToEmployee(r, empFilter, identity);
    });

    this.requests.update((existing) => {
      const byId = new Map(existing.map((r) => [r.id, r]));
      for (const sr of filtered) {
        const mapped = this.mapApiRowToServiceRequest(sr, managerQueueId);
        const prior = byId.get(mapped.id);
        if (prior) {
          byId.set(mapped.id, this.mergeServiceRequest(prior, mapped));
        } else {
          byId.set(mapped.id, mapped);
        }
      }
      return Array.from(byId.values());
    });
    this.persist();
    const last = this.requests().find((r) => filtered.some((f) => f.id === r.id));
    if (last) this.requestUpdates$.next(last);
  }

  getAllRequests(): ServiceRequest[] {
    return this.requests();
  }

  getAllNotifications(): NotificationMessage[] {
    return this.notifications();
  }

  getRequestById(id: string): ServiceRequest | undefined {
    return this.requests().find((req) => req.id === id);
  }

  markNotificationAsRead(notificationId: string): void {
    this.notifications.update((notifications) =>
      notifications.map((notif) =>
        notif.id === notificationId ? { ...notif, isRead: true } : notif,
      ),
    );
    this.persist();
  }

  markAllNotificationsAsRead(userId: string, role?: UserRole): void {
    this.notifications.update((notifications) =>
      notifications.map((notif) =>
        notif.recipientId === userId || (role && notif.recipientRole === role)
          ? { ...notif, isRead: true }
          : notif,
      ),
    );
    this.persist();
  }

  dismissNotification(notificationId: string): void {
    this.notifications.update((notifications) =>
      notifications.filter((notif) => notif.id !== notificationId),
    );
    this.persist();
  }

  private pickPreferredStatus(local: RequestStatus, incoming: RequestStatus): RequestStatus {
    return REQUEST_STATUS_RANK[local] >= REQUEST_STATUS_RANK[incoming] ? local : incoming;
  }

  private mergeServiceRequest(existing: ServiceRequest, incoming: ServiceRequest): ServiceRequest {
    const status = this.pickPreferredStatus(existing.status, incoming.status);
    return {
      ...incoming,
      status,
      employeeId: existing.employeeId || incoming.employeeId,
      employeeName: existing.employeeName || incoming.employeeName,
      employeeEmail: existing.employeeEmail || incoming.employeeEmail,
      managerReviewDate: existing.managerReviewDate ?? incoming.managerReviewDate,
      managerComments: existing.managerComments ?? incoming.managerComments,
      adminReviewDate: existing.adminReviewDate ?? incoming.adminReviewDate,
      completedDate: existing.completedDate ?? incoming.completedDate,
      workflowHistory:
        existing.workflowHistory.length >= incoming.workflowHistory.length
          ? existing.workflowHistory
          : incoming.workflowHistory,
    };
  }

  private mapApiRowToServiceRequest(
    sr: ApiServiceRequestRow,
    managerQueueId: string,
  ): ServiceRequest {
    const wfStatus = this.mapApiStatusToWorkflowStatus(sr.status);
    const submitted = sr.requestDate ? new Date(sr.requestDate) : new Date();
    const required = new Date(submitted.getTime() + 7 * 86400000);
    const totalItems = sr.totalItems ?? 1;
    const items: RequestItem[] = [
      {
        id: `api_item_${sr.id}`,
        name: `Line items (${totalItems})`,
        description: sr.purpose || sr.notes || 'Service request',
        quantity: sr.totalQuantity ?? totalItems,
        category: 'General',
      },
    ];

    return {
      id: String(sr.id),
      srNumber: sr.srNumber || `SR-${sr.id}`,
      employeeId: String(sr.requesterId || ''),
      employeeName: sr.requesterName || 'Employee',
      employeeEmail: '',
      department: sr.department || '',
      managerId: managerQueueId,
      managerName: 'Manager',
      items,
      priority: this.mapUrgencyToPriority(sr.urgency),
      status: wfStatus,
      justification: sr.purpose || sr.notes || '',
      submittedDate: submitted,
      requiredDate: required,
      estimatedCost: 0,
      workflowHistory: [
        {
          id: this.generateId(),
          action: 'Synced from server',
          performedBy: 'System',
          performedByRole: 'Employee',
          timestamp: new Date(),
          previousStatus: 'Draft',
          newStatus: wfStatus,
        },
      ],
    };
  }

  private apiRowBelongsToEmployee(
    row: ApiServiceRequestRow,
    employeeId: string,
    identity?: { email?: string; fullName?: string; username?: string },
  ): boolean {
    if (String(row.requesterId || '') === String(employeeId)) {
      return true;
    }
    const requesterName = (row.requesterName || '').trim().toLowerCase();
    const keys = [identity?.fullName, identity?.username, identity?.email?.split('@')[0]]
      .map((v) => v?.trim().toLowerCase())
      .filter((v): v is string => !!v);
    return keys.some((key) => requesterName === key || requesterName.includes(key));
  }

  private mapApiStatusToWorkflowStatus(status: string): RequestStatus {
    const s = (status || '').toLowerCase().trim();
    if (s === 'pending' || s === 'submitted' || s === 'under review' || s === 'awaiting approval') {
      return 'Submitted';
    }
    if (
      s === 'approved' ||
      s === 'manager approved' ||
      s === 'admin approved' ||
      s === 'accepted'
    ) {
      return 'Manager Approved';
    }
    if (s === 'rejected' || s === 'manager rejected' || s === 'admin rejected' || s === 'denied') {
      return 'Manager Rejected';
    }
    if (s === 'completed' || s === 'issued' || s === 'fulfilled' || s === 'closed') {
      return 'Completed';
    }
    if (s === 'cancelled' || s === 'canceled') return 'Cancelled';
    if (s === 'compliance review' || s === 'in review') return 'Compliance Review';
    return 'Submitted';
  }

  private mapUrgencyToPriority(urgency?: string): RequestPriority {
    const u = (urgency || '').toLowerCase();
    if (u.includes('urgent') || u.includes('critical') || u.includes('high')) return 'Urgent';
    if (u.includes('low')) return 'Low';
    return 'Medium';
  }

  private updateRequest(request: ServiceRequest): void {
    this.requests.update((requests) =>
      requests.map((req) => (req.id === request.id ? request : req)),
    );
    this.persist();
    this.requestUpdates$.next(request);
  }

  private createNotification(
    notification: Omit<NotificationMessage, 'id' | 'isRead' | 'createdDate'>,
  ): void {
    const newNotification: NotificationMessage = {
      ...notification,
      id: this.generateId(),
      isRead: false,
      createdDate: new Date(),
    };

    this.notifications.update((notifications) => [...notifications, newNotification]);
    this.persist();
    this.notificationUpdates$.next(newNotification);

    this.signalRService.pushNotification({
      id: newNotification.id,
      message: `${newNotification.title}: ${newNotification.message}`,
      isRead: false,
      sentDate: newNotification.createdDate,
      type: newNotification.type,
    });
  }

  private needsComplianceReview(request: ServiceRequest): boolean {
    const totalCost = request.estimatedCost || 0;
    const hasHighValueItems = request.items.some((item) => (item.totalCost || 0) > 5000);
    const isHighPriority = request.priority === 'Urgent';

    return totalCost > 10000 || hasHighValueItems || isHighPriority;
  }

  private generateId(): string {
    return 'req_' + Math.random().toString(36).substring(2, 11);
  }

  private generateSRNumber(): string {
    const year = new Date().getFullYear();
    const sequence = this.requests().length + 1;
    return `SR-${year}-${sequence.toString().padStart(4, '0')}`;
  }

  private persist(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_REQUESTS, JSON.stringify(this.requests(), this.dateReplacer));
      localStorage.setItem(
        STORAGE_NOTIFICATIONS,
        JSON.stringify(this.notifications(), this.dateReplacer),
      );
    } catch {
      /* ignore quota */
    }
  }

  private readonly dateReplacer = (_key: string, value: unknown) =>
    value instanceof Date ? value.toISOString() : value;

  private restoreFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const rawReq = localStorage.getItem(STORAGE_REQUESTS);
      const rawNotif = localStorage.getItem(STORAGE_NOTIFICATIONS);
      if (rawReq) {
        const parsed = JSON.parse(rawReq) as ServiceRequest[];
        this.requests.set(parsed.map((r) => this.reviveServiceRequest(r)));
      } else {
        this.requests.set([]);
      }
      if (rawNotif) {
        const parsedN = JSON.parse(rawNotif) as NotificationMessage[];
        this.notifications.set(parsedN.map((n) => this.reviveNotification(n)));
      } else {
        this.notifications.set([]);
      }
    } catch {
      this.requests.set([]);
      this.notifications.set([]);
    }
  }

  private reviveServiceRequest(r: ServiceRequest): ServiceRequest {
    return {
      ...r,
      submittedDate: new Date(r.submittedDate as unknown as string),
      requiredDate: new Date(r.requiredDate as unknown as string),
      managerReviewDate: r.managerReviewDate
        ? new Date(r.managerReviewDate as unknown as string)
        : undefined,
      adminReviewDate: r.adminReviewDate
        ? new Date(r.adminReviewDate as unknown as string)
        : undefined,
      complianceReviewDate: r.complianceReviewDate
        ? new Date(r.complianceReviewDate as unknown as string)
        : undefined,
      staleEscalatedAt: r.staleEscalatedAt
        ? new Date(r.staleEscalatedAt as unknown as string)
        : undefined,
      lastManagerReminderAt: r.lastManagerReminderAt
        ? new Date(r.lastManagerReminderAt as unknown as string)
        : undefined,
      completedDate: r.completedDate ? new Date(r.completedDate as unknown as string) : undefined,
      workflowHistory: (r.workflowHistory || []).map((h) => ({
        ...h,
        timestamp: new Date(h.timestamp as unknown as string),
      })),
    };
  }

  private reviveNotification(n: NotificationMessage): NotificationMessage {
    return {
      ...n,
      createdDate: new Date(n.createdDate as unknown as string),
    };
  }
}
