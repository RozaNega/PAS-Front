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

export type UserRole = 'Employee' | 'Manager' | 'Admin' | 'Compliance' | 'Storekeeper' | 'Director';

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
  stockStatus?: 'pending' | 'available' | 'unavailable';
  stockVerificationNotes?: string;
  storekeeperRespondedAt?: Date;
  storekeeperName?: string;
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
  srNumber?: string;
  requestNumber?: string;
  srNo?: string;
  serviceRequestNumber?: string;
  requesterId?: string;
  requesterEmail?: string;
  email?: string;
  employeeCode?: string;
  requesterName?: string;
  department?: string;
  purpose?: string;
  notes?: string;
  remarks?: string;
  reason?: string;
  rejectionReason?: string;
  approvedById?: string;
  approvedByName?: string;
  approvedBy?: string;
  rejectedByName?: string;
  rejectedBy?: string;
  approvedDate?: string;
  rejectedDate?: string;
  managerRemarks?: string;
  managerComments?: string;
  urgency?: string;
  requestDate: string;
  status: string;
  totalItems?: number;
  totalQuantity?: number;
  items?: {
    id?: string;
    itemId?: string;
    itemName?: string;
    name?: string;
    description?: string;
    requestedQty?: number;
    quantity?: number;
    unitOfMeasure?: string;
  }[];
}

type EmployeeIdentity = {
  email?: string;
  fullName?: string;
  username?: string;
  employeeCode?: string;
};

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

  private clearStaleSeededStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_REQUESTS);
      localStorage.removeItem(STORAGE_NOTIFICATIONS);
      this.requests.set([]);
      this.notifications.set([]);
    } catch {
      /* ignore */
    }
  }

  private seedSampleData(): void {
    const now = Date.now();
    const day = 86400000;
    const empId = 'emp_001';
    const empName = 'Employee';
    const empEmail = 'employee@africom.com';
    const dept = 'IT Department';
    const mgrId = 'mgr_001';

    const approvedStatuses: RequestStatus[] = ['Manager Approved', 'Admin Approved', 'Completed'];
    const baseRequest = (i: number, status: RequestStatus, daysAgo: number): ServiceRequest => {
      const d = new Date(now - daysAgo * day);
      const completed = status === 'Completed' ? new Date(now - (daysAgo - 1) * day) : undefined;
      return {
        id: `seed_${i}`,
        srNumber: `SR-2026-${String(i).padStart(4, '0')}`,
        employeeId: empId,
        employeeName: empName,
        employeeEmail: empEmail,
        department: dept,
        managerId: mgrId,
        managerName: 'Manager',
        items: [
          { id: `item_${i}_1`, name: 'Dell Latitude 5420 Laptop', description: 'Laptop', quantity: 1, unitCost: 1200, totalCost: 1200, category: 'Electronics' },
        ],
        priority: i % 3 === 0 ? 'Urgent' : i % 3 === 1 ? 'High' : 'Medium',
        status,
        justification: 'Official request for office equipment',
        submittedDate: d,
        requiredDate: new Date(d.getTime() + 7 * day),
        estimatedCost: 1200,
        completedDate: completed,
        workflowHistory: [
          { id: `wh_${i}_1`, action: 'Request Submitted', performedBy: empName, performedByRole: 'Employee', timestamp: d, previousStatus: 'Draft', newStatus: 'Submitted' },
        ],
      };
    };

    const samples: ServiceRequest[] = [];

    for (let i = 1; i <= 6; i++) {
      samples.push(baseRequest(i, 'Manager Approved', 5 + i));
    }
    for (let i = 7; i <= 8; i++) {
      samples.push(baseRequest(i, 'Admin Approved', 10 + i));
    }
    for (let i = 9; i <= 10; i++) {
      samples.push(baseRequest(i, 'Completed', 15 + i));
    }
    for (let i = 11; i <= 12; i++) {
      samples.push(baseRequest(i, 'Manager Rejected', 3 + i));
    }
    for (let i = 13; i <= 15; i++) {
      samples.push(baseRequest(i, 'Submitted', i - 12));
    }

    this.requests.set(samples);
    this.seedNotifications();
    this.persist();
  }

  private seedNotifications(): void {
    if (this.notifications().length > 0) return;
    const now = Date.now();
    const minutes = 60000;
    const seedNotifs: NotificationMessage[] = [
      {
        id: 'seed_notif_1',
        title: 'New Property Added',
        message: 'Property "Sunset Villas" has been successfully added to the system.',
        type: 'success',
        recipientId: 'admin_001',
        recipientRole: 'Admin',
        requestId: undefined,
        createdDate: new Date(now - 5 * minutes),
        isRead: false,
      },
      {
        id: 'seed_notif_2',
        title: 'User Approval Request',
        message: '3 new users awaiting approval for admin access.',
        type: 'info',
        recipientId: 'admin_001',
        recipientRole: 'Admin',
        requestId: undefined,
        createdDate: new Date(now - 30 * minutes),
        isRead: false,
      },
      {
        id: 'seed_notif_3',
        title: 'System Backup Completed',
        message: 'Daily backup completed successfully. Database size: 2.4GB',
        type: 'success',
        recipientId: 'admin_001',
        recipientRole: 'Admin',
        requestId: undefined,
        createdDate: new Date(now - 120 * minutes),
        isRead: false,
      },
      {
        id: 'seed_notif_4',
        title: 'Security Alert',
        message: 'Multiple failed login attempts detected from unknown IP address.',
        type: 'error',
        recipientId: 'admin_001',
        recipientRole: 'Admin',
        requestId: undefined,
        createdDate: new Date(now - 240 * minutes),
        isRead: false,
      },
    ];
    seedNotifs.push(
      {
        id: 'seed_notif_sk_1',
        title: 'New Delivery Received',
        message: 'Shipment #INV-2026-0421 has arrived. 15 items pending inspection.',
        type: 'info',
        recipientId: 'storekeeper_001',
        recipientRole: 'Manager',
        requestId: undefined,
        createdDate: new Date(now - 10 * minutes),
        isRead: false,
      },
      {
        id: 'seed_notif_sk_2',
        title: 'Stock Alert',
        message: 'Item "Dell Latitude 5420 Laptop" is below minimum stock level (5 remaining).',
        type: 'warning',
        recipientId: 'storekeeper_001',
        recipientRole: 'Manager',
        requestId: undefined,
        createdDate: new Date(now - 45 * minutes),
        isRead: false,
      },
      {
        id: 'seed_notif_sk_3',
        title: 'Issuance Request',
        message: 'New issuance request #SIV-2026-0032 needs your approval.',
        type: 'info',
        recipientId: 'storekeeper_001',
        recipientRole: 'Manager',
        requestId: undefined,
        createdDate: new Date(now - 90 * minutes),
        isRead: false,
      },
      {
        id: 'seed_notif_mgr_1',
        title: 'Approval Pending',
        message: '2 service requests are awaiting your approval.',
        type: 'info',
        recipientId: 'mgr_001',
        recipientRole: 'Manager',
        requestId: undefined,
        createdDate: new Date(now - 15 * minutes),
        isRead: false,
      },
      {
        id: 'seed_notif_mgr_2',
        title: 'Request Escalated',
        message: 'Service request SR-2026-0043 has been escalated to you.',
        type: 'warning',
        recipientId: 'mgr_001',
        recipientRole: 'Manager',
        requestId: undefined,
        createdDate: new Date(now - 60 * minutes),
        isRead: false,
      },
      {
        id: 'seed_notif_emp_1',
        title: 'Request Approved',
        message: 'Your service request SR-2026-0039 has been approved.',
        type: 'success',
        recipientId: 'emp_001',
        recipientRole: 'Employee',
        requestId: undefined,
        createdDate: new Date(now - 20 * minutes),
        isRead: false,
      },
      {
        id: 'seed_notif_emp_2',
        title: 'Items Ready for Pickup',
        message: 'Your requested items are ready for pickup at the store.',
        type: 'info',
        recipientId: 'emp_001',
        recipientRole: 'Employee',
        requestId: undefined,
        createdDate: new Date(now - 120 * minutes),
        isRead: false,
      },
    );
    this.notifications.set(seedNotifs);
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

  getRequestsForEmployee(
    employeeId: string,
    identity?: EmployeeIdentity,
  ): ServiceRequest[] {
    const id = employeeId?.trim();
    const email = identity?.email?.trim().toLowerCase();
    const fullName = identity?.fullName?.trim().toLowerCase();
    const username = identity?.username?.trim().toLowerCase();
    return this.requests().filter((req) => {
      if (id && req.employeeId === id) {
        return true;
      }
      if (email && req.employeeEmail?.trim().toLowerCase() === email) {
        return true;
      }
      const requesterName = req.employeeName?.trim().toLowerCase();
      if (requesterName && (requesterName === fullName || requesterName === username)) {
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
    identity?: EmployeeIdentity,
  ): ServiceRequest[] {
    return this.getRequestsForEmployee(employeeId, identity).filter((req) =>
      WORKFLOW_PENDING_STATUSES.includes(req.status),
    );
  }

  getApprovedRequestsForEmployee(
    employeeId: string,
    identity?: EmployeeIdentity,
  ): ServiceRequest[] {
    return this.getRequestsForEmployee(employeeId, identity).filter((req) =>
      WORKFLOW_APPROVED_STATUSES.includes(req.status),
    );
  }

  getRejectedRequestsForEmployee(
    employeeId: string,
    identity?: EmployeeIdentity,
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

  requestStockVerification(
    requestId: string,
    managerName: string,
  ): void {
    const request = this.requests().find((req) => req.id === requestId);
    if (!request) return;

    const updatedRequest: ServiceRequest = {
      ...request,
      stockStatus: 'pending',
      workflowHistory: [
        ...request.workflowHistory,
        {
          id: this.generateId(),
          action: 'Stock Verification Requested',
          performedBy: managerName,
          performedByRole: 'Manager',
          timestamp: new Date(),
          comments: `Stock verification requested for ${request.srNumber}`,
          previousStatus: request.status,
          newStatus: request.status,
        },
      ],
    };

    this.updateRequest(updatedRequest);

    this.createNotification({
      recipientId: '',
      recipientRole: 'Storekeeper',
      type: 'warning',
      title: 'Stock verification requested',
      message: `Manager ${managerName} requests stock verification for ${request.srNumber} — ${request.items[0]?.name || 'item'}. Please confirm availability.`,
      requestId: request.id,
      actionRequired: true,
      actionUrl: `/storekeeper/dashboard`,
    });
  }

  respondStockVerification(
    requestId: string,
    isAvailable: boolean,
    storekeeperName: string,
    notes?: string,
  ): void {
    const request = this.requests().find((req) => req.id === requestId);
    if (!request) return;

    const status = isAvailable ? 'available' : 'unavailable';

    const updatedRequest: ServiceRequest = {
      ...request,
      stockStatus: status,
      stockVerificationNotes: notes || '',
      storekeeperRespondedAt: new Date(),
      storekeeperName,
      workflowHistory: [
        ...request.workflowHistory,
        {
          id: this.generateId(),
          action: isAvailable ? 'Stock Verified - Available' : 'Stock Verified - Unavailable',
          performedBy: storekeeperName,
          performedByRole: 'Storekeeper',
          timestamp: new Date(),
          comments: notes || (isAvailable ? 'Stock available' : 'Stock unavailable'),
          previousStatus: request.status,
          newStatus: request.status,
        },
      ],
    };

    this.updateRequest(updatedRequest);

    const managerId = request.managerId || 'mgr_001';
    this.createNotification({
      recipientId: managerId,
      recipientRole: 'Manager',
      type: isAvailable ? 'success' : 'error',
      title: isAvailable ? 'Stock available' : 'Stock unavailable',
      message: `Stock for ${request.srNumber} is ${status} — ${storekeeperName}.${notes ? ' Notes: ' + notes : ''}`,
      requestId: request.id,
      actionRequired: isAvailable,
      actionUrl: `/manager/dashboard`,
    });
  }

  getRequestsPendingStockVerification(): ServiceRequest[] {
    return this.requests().filter((r) => r.stockStatus === 'pending');
  }

  confirmStockAvailable(requestId: string, storekeeperName: string, notes?: string): void {
    this.respondStockVerification(requestId, true, storekeeperName, notes);
  }

  confirmStockInsufficient(requestId: string, storekeeperName: string, notes?: string): void {
    this.respondStockVerification(requestId, false, storekeeperName, notes);
  }

  adminReviewRequest(
    requestId: string,
    action: 'approve' | 'reject',
    _comments: string,
    _reviewerId: string,
    reviewerName: string,
  ): void {
    if (action === 'approve') {
      this.adminFulfillRequest(requestId, reviewerName);
    }
  }

  adminFulfillRequest(
    requestId: string,
    reviewerName: string,
  ): void {
    const request = this.requests().find((req) => req.id === requestId);
    if (!request) return;

    const updatedRequest: ServiceRequest = {
      ...request,
      status: 'Completed',
      adminReviewDate: new Date(),
      workflowHistory: [
        ...request.workflowHistory,
        {
          id: this.generateId(),
          action: 'Fulfilled by Admin',
          performedBy: reviewerName,
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
        title: 'Request fulfilled',
        message: `Request ${request.srNumber} has been fulfilled by administration.`,
        requestId: request.id,
        actionRequired: false,
        actionUrl: `/employee/dashboard`,
      });
    });
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
        title: 'Request ready for fulfillment',
        message: `Request ${request.srNumber} passed compliance review and is ready for admin fulfillment.`,
        requestId: request.id,
        actionRequired: true,
        actionUrl: `/admin/sivs/new?serviceRequestId=${request.id}`,
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
      employeeIdentity?: EmployeeIdentity;
    },
  ): void {
    const managerQueueId = options.managerQueueId;
    const empFilter = options.employeeIdFilter;

    const identity = options.employeeIdentity;
    const filtered = rows.filter((r) => {
      if (!empFilter) return true;
      return this.apiRowBelongsToEmployee(r, empFilter, identity);
    });

    const existingById = new Map(this.requests().map((r) => [r.id, r]));
    const existingIds = new Set(existingById.keys());

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

    const currentUser = this.currentUserService.getCurrentUserValue();
    const userRole = currentUser ? this.authService.mapUserToDashboardRole(currentUser) : null;

    // Create notifications for new pending requests (for manager)
    if (userRole === 'manager') {
      for (const sr of filtered) {
        const mapped = this.mapApiRowToServiceRequest(sr, managerQueueId);
        if (!existingIds.has(mapped.id) && ['Submitted', 'Under Review'].includes(mapped.status)) {
          const hasExistingNotification = this.notifications().some(
            (n) => n.requestId === mapped.id,
          );
          if (!hasExistingNotification) {
            this.createNotification({
              recipientId: managerQueueId,
              recipientRole: 'Manager',
              type: 'info',
              title: 'New request submitted',
              message: `${mapped.employeeName} submitted ${mapped.srNumber} for your review.`,
              requestId: mapped.id,
              actionRequired: true,
              actionUrl: `/manager/dashboard`,
            });
          }
        }
      }
    }

    // Create notifications for employee when their request status changes (approved/rejected)
    const employeeId = currentUser?.id || '';
    for (const sr of filtered) {
      const prior = existingById.get(sr.id);
      const mapped = this.mapApiRowToServiceRequest(sr, managerQueueId);
      if (!prior) continue;

      const priorStatus = prior.status;
      const newStatus = mapped.status;

      if (priorStatus === newStatus) continue;

      const isApproved = WORKFLOW_APPROVED_STATUSES.includes(newStatus);
      const isRejected = WORKFLOW_REJECTED_STATUSES.includes(newStatus);

      if (!isApproved && !isRejected) continue;

      const hasExistingNotification = this.notifications().some((n) => {
        const title = n.title.toLowerCase();
        return n.requestId === sr.id && (title.includes('approved') || title.includes('rejected'));
      });
      if (hasExistingNotification) continue;

      const reviewerName = mapped.managerName || 'Manager';
      this.createNotification({
        recipientId: employeeId,
        recipientRole: 'Employee',
        type: isApproved ? 'success' : 'error',
        title: isApproved ? 'Request approved' : 'Request rejected',
        message: `Your request ${mapped.srNumber} was ${isApproved ? 'approved' : 'rejected'} by ${reviewerName}.`,
        requestId: mapped.id,
        actionRequired: false,
        actionUrl: `/employee/dashboard`,
      });
    }

    const last = this.requests().find((r) => filtered.some((f) => f.id === r.id));
    if (last) this.requestUpdates$.next(last);
  }

  getAllNotifications(): NotificationMessage[] {
    return this.notifications();
  }

  extractApiServiceRequestRows(response: unknown): ApiServiceRequestRow[] {
    const body = response as any;
    const data = body?.data ?? body;
    const candidates = [
      data?.items,
      data?.Items,
      data?.records,
      data?.Records,
      data?.results,
      data?.Results,
      data?.data?.items,
      data?.data?.Items,
      data,
    ];

    const rows = candidates.find((candidate) => Array.isArray(candidate));
    return (rows ?? []).filter((row: unknown): row is ApiServiceRequestRow => {
      return !!row && typeof row === 'object' && 'id' in (row as Record<string, unknown>);
    });
  }

  getRequestById(id: string): ServiceRequest | undefined {
    return this.requests().find((req) => req.id === id);
  }

  getAllRequests(): ServiceRequest[] {
    return this.requests();
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
      srNumber: existing.srNumber || incoming.srNumber,
      employeeId: existing.employeeId || incoming.employeeId,
      employeeName: existing.employeeName || incoming.employeeName,
      employeeEmail: existing.employeeEmail || incoming.employeeEmail,
      managerReviewDate: existing.managerReviewDate ?? incoming.managerReviewDate,
      managerComments: existing.managerComments ?? incoming.managerComments,
      adminReviewDate: existing.adminReviewDate ?? incoming.adminReviewDate,
      adminComments: existing.adminComments ?? incoming.adminComments,
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
    const srNumber = this.apiSrNumber(sr);
    const wfStatus = this.mapApiStatusToWorkflowStatus(sr.status);
    const submitted = sr.requestDate ? new Date(sr.requestDate) : new Date();
    const required = new Date(submitted.getTime() + 7 * 86400000);
    const totalItems = sr.totalItems ?? sr.items?.length ?? 1;
    const items: RequestItem[] =
      sr.items && sr.items.length > 0
        ? sr.items.map((item, index) => ({
            id: String(item.id || item.itemId || `api_item_${sr.id}_${index}`),
            name: item.itemName || item.name || item.description || `Item ${index + 1}`,
            description: item.description || item.itemName || item.name || 'Service request item',
            quantity: Number(item.requestedQty ?? item.quantity ?? 1),
            category: 'General',
            specifications: item.unitOfMeasure,
          }))
        : [
            {
              id: `api_item_${sr.id}`,
              name: `Line items (${totalItems})`,
              description: sr.purpose || sr.notes || sr.remarks || 'Service request',
              quantity: sr.totalQuantity ?? totalItems,
              category: 'General',
            },
          ];
    const reviewDate = this.parseApiDate(
      wfStatus === 'Manager Rejected' ? sr.rejectedDate : sr.approvedDate,
    );
    const reviewComments =
      sr.managerComments || sr.managerRemarks || sr.rejectionReason || sr.reason || sr.remarks;
    const reviewerName =
      sr.approvedByName || sr.approvedBy || sr.rejectedByName || sr.rejectedBy || 'Manager';

    return {
      id: String(sr.id),
      srNumber,
      employeeId: String(sr.requesterId || sr.employeeCode || sr.requesterEmail || sr.email || ''),
      employeeName: sr.requesterName || 'Employee',
      employeeEmail: sr.requesterEmail || sr.email || '',
      department: sr.department || '',
      managerId: managerQueueId,
      managerName: reviewerName,
      items,
      priority: this.mapUrgencyToPriority(sr.urgency),
      status: wfStatus,
      justification: sr.purpose || sr.notes || sr.remarks || '',
      submittedDate: submitted,
      requiredDate: required,
      managerReviewDate:
        WORKFLOW_APPROVED_STATUSES.includes(wfStatus) ||
        WORKFLOW_REJECTED_STATUSES.includes(wfStatus)
          ? reviewDate ?? new Date()
          : undefined,
      managerComments: reviewComments,
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

  private apiSrNumber(row: ApiServiceRequestRow): string {
    // Employee-entered SR numbers take priority over backend-generated ones
    const customMap = this.getCustomSrNumberMap();
    const customSr = customMap.get(String(row.id));
    if (customSr) return customSr;

    const candidate =
      row.srNumber || row.requestNumber || row.srNo || row.serviceRequestNumber || '';
    const normalized = String(candidate || '').trim();
    if (normalized) return normalized;

    return `SR-${row.id}`;
  }

  /** Store a custom SR number mapping (requestId → srNumber) */
  storeCustomSrNumber(requestId: string, srNumber: string): void {
    if (!requestId || !srNumber) return;
    const map = this.getCustomSrNumberMap();
    map.set(requestId, srNumber);
    this.saveCustomSrNumberMap(map);
  }

  /** Look up a custom SR number for a request id. Returns empty string if not set. */
  getCustomSrNumber(requestId: string): string {
    if (!requestId) return '';
    return this.getCustomSrNumberMap().get(requestId) || '';
  }

  private getCustomSrNumberMap(): Map<string, string> {
    if (typeof localStorage === 'undefined') return new Map();
    try {
      const raw = localStorage.getItem('pas_custom_sr_numbers');
      if (!raw) return new Map();
      return new Map(JSON.parse(raw));
    } catch {
      return new Map();
    }
  }

  private saveCustomSrNumberMap(map: Map<string, string>): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem('pas_custom_sr_numbers', JSON.stringify(Array.from(map.entries())));
    } catch {
      /* ignore */
    }
  }

  private apiRowBelongsToEmployee(
    row: ApiServiceRequestRow,
    employeeId: string,
    identity?: EmployeeIdentity,
  ): boolean {
    const directKeys = [
      row.requesterId,
      row.requesterEmail,
      row.email,
      row.employeeCode,
      row.requesterName,
    ]
      .map((value) => String(value || '').trim().toLowerCase())
      .filter(Boolean);

    const userKeys = [
      employeeId,
      identity?.email,
      identity?.email?.split('@')[0],
      identity?.fullName,
      identity?.username,
      identity?.employeeCode,
    ]
      .map((value) => String(value || '').trim().toLowerCase())
      .filter(Boolean);

    if (directKeys.some((key) => userKeys.includes(key))) {
      return true;
    }
    const requesterName = (row.requesterName || '').trim().toLowerCase();
    return userKeys.some((key) => requesterName === key || requesterName.includes(key));
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

  private parseApiDate(value?: string): Date | undefined {
    if (!value) return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
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

  createNotification(
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
        this.seedNotifications();
      }
    } catch {
      this.requests.set([]);
      this.notifications.set([]);
      this.seedNotifications();
    }
    this.persist();
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
