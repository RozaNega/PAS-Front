import { Injectable, inject, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { CurrentUserService } from './current-user.service';
import { SignalRService } from './signalr.service';
import { NotificationEngineService } from './notification-engine.service';
import { AuditLogService } from './audit-log.service';

export type GrnStatus =
  | 'Draft'
  | 'Submitted'
  | 'InInspection'
  | 'Approved'
  | 'Rejected'
  | 'Partial'
  | 'Completed';

export type GrnDecision = 'Return' | 'AcceptWithDiscount' | 'Scrap' | 'ReInspect';

export const GRN_STATUS_RANK: Record<GrnStatus, number> = {
  Draft: 0,
  Submitted: 1,
  InInspection: 2,
  Rejected: 5,
  Approved: 6,
  Partial: 6,
  Completed: 9,
};

export interface GrnRecord {
  id: string;
  grnNumber?: string;
  supplierId: string;
  supplierName: string;
  receivedDate: Date;
  status: GrnStatus;
  receivedById: string;
  receivedByName: string;
  items: GrnItemRecord[];
  inspection?: GrnInspectionRecord;
  decisions: GrnDecisionRecord[];
  attachments: { id: string; fileName: string }[];
  createdAt: Date;
  updatedAt?: Date;
  workflowHistory: GrnWorkflowStep[];
}

export interface GrnItemRecord {
  itemId: string;
  itemName: string;
  sku?: string;
  unitOfMeasure?: string;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  pendingQuantity: number;
  requiresInspection: boolean;
  inspectionResult?: 'Pass' | 'Fail' | 'Pending';
  remarks?: string;
}

export interface GrnInspectionRecord {
  id: string;
  inspectorId: string;
  inspectorName: string;
  inspectionDate: Date;
  deviationNotes?: string;
  isPassed: boolean;
  acceptedQuantity: number;
  rejectedQuantity: number;
}

export interface GrnDecisionRecord {
  id: string;
  itemId: string;
  decision: GrnDecision;
  discountPercentage?: number;
  remarks?: string;
  decidedBy: string;
  decidedByName: string;
  decidedAt: Date;
}

export interface GrnWorkflowStep {
  id: string;
  action: string;
  performedBy: string;
  performedByRole: string;
  timestamp: Date;
  comments?: string;
  previousStatus: GrnStatus;
  newStatus: GrnStatus;
}

export interface GrnNotificationMessage {
  id: string;
  recipientId: string;
  recipientRole: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  grnId?: string;
  isRead: boolean;
  createdDate: Date;
  actionRequired?: boolean;
  actionUrl?: string;
}

const VALID_GRN_TRANSITIONS: Record<GrnStatus, { to: GrnStatus[]; allowedRoles: string[] }> = {
  Draft: { to: ['Submitted', 'Completed'], allowedRoles: ['Storekeeper'] },
  Submitted: { to: ['InInspection'], allowedRoles: ['Storekeeper'] },
  InInspection: { to: ['Approved', 'Partial', 'Rejected'], allowedRoles: ['Storekeeper'] },
  Approved: { to: ['Completed'], allowedRoles: ['Storekeeper', 'Admin'] },
  Partial: { to: ['Completed'], allowedRoles: ['Storekeeper', 'Admin'] },
  Rejected: { to: ['Completed'], allowedRoles: ['Storekeeper', 'Admin'] },
  Completed: { to: [], allowedRoles: [] },
};

const STORAGE_GRNS = 'pas_grn_records_v1';
const STORAGE_GRN_NOTIFICATIONS = 'pas_grn_notifications_v1';

@Injectable({ providedIn: 'root' })
export class ReceivingWorkflowService {
  private readonly authService = inject(AuthService);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly signalRService = inject(SignalRService);
  private readonly notificationEngine = inject(NotificationEngineService);
  private readonly auditLog = inject(AuditLogService);

  private readonly grns = signal<GrnRecord[]>([]);
  private readonly notifications = signal<GrnNotificationMessage[]>([]);

  private grnUpdates$ = new BehaviorSubject<GrnRecord | null>(null);
  private notificationUpdates$ = new BehaviorSubject<GrnNotificationMessage | null>(null);

  constructor() {
    this.restoreFromStorage();
    this.listenForCrossTabUpdates();
  }

  getGrnUpdates(): Observable<GrnRecord | null> {
    return this.grnUpdates$.asObservable();
  }

  getNotificationUpdates(): Observable<GrnNotificationMessage | null> {
    return this.notificationUpdates$.asObservable();
  }

  getAllGrns(): GrnRecord[] {
    return this.grns();
  }

  getGrnById(id: string): GrnRecord | undefined {
    return this.grns().find((g) => g.id === id);
  }

  getGrnsByStatus(status: GrnStatus): GrnRecord[] {
    return this.grns().filter((g) => g.status === status);
  }

  getGrnsForInspection(): GrnRecord[] {
    return this.grns().filter((g) => g.status === 'Submitted' || g.status === 'InInspection');
  }

  getGrnsForAdminDecision(): GrnRecord[] {
    return this.grns().filter((g) => g.status === 'InInspection');
  }

  getAllNotifications(): GrnNotificationMessage[] {
    return this.notifications();
  }

  getNotificationsForUser(userId: string, role: string): GrnNotificationMessage[] {
    return this.notifications().filter(
      (n) => n.recipientId === userId || n.recipientRole === role,
    );
  }

  markNotificationAsRead(notificationId: string): void {
    this.notifications.update((all) =>
      all.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
    );
    this.persist();
  }

  markAllNotificationsAsRead(userId: string, role?: string): void {
    this.notifications.update((all) =>
      all.map((n) =>
        n.recipientId === userId || (role && n.recipientRole === role)
          ? { ...n, isRead: true }
          : n,
      ),
    );
    this.persist();
  }

  dismissNotification(notificationId: string): void {
    this.notifications.update((all) => all.filter((n) => n.id !== notificationId));
    this.persist();
  }

  submitGrn(grn: Omit<GrnRecord, 'id' | 'grnNumber' | 'workflowHistory' | 'createdAt'>): GrnRecord {
    const newGrn: GrnRecord = {
      ...grn,
      id: this.generateId(),
      grnNumber: this.generateGrnNumber(),
      status: 'Draft',
      createdAt: new Date(),
      workflowHistory: [
        {
          id: this.generateId(),
          action: 'GRN Created',
          performedBy: grn.receivedByName,
          performedByRole: 'Storekeeper',
          timestamp: new Date(),
          previousStatus: 'Draft',
          newStatus: 'Draft',
        },
      ],
    };

    this.grns.update((list) => [...list, newGrn]);
    this.persist();
    this.grnUpdates$.next(newGrn);
    return newGrn;
  }

  submitForInspection(grnId: string, submittedBy: string): boolean {
    return this.transitionStatus(grnId, 'Submitted', submittedBy, 'Storekeeper', 'GRN Submitted for Inspection');
  }

  startInspection(grnId: string, inspectorName: string): boolean {
    return this.transitionStatus(grnId, 'InInspection', inspectorName, 'Storekeeper', 'Inspection Started');
  }

  completeInspection(
    grnId: string,
    inspectorName: string,
    result: 'Approved' | 'Partial' | 'Rejected',
    inspectionData?: { deviationNotes?: string; items?: GrnItemRecord[] },
  ): boolean {
    const grn = this.grns().find((g) => g.id === grnId);
    if (!grn) return false;

    if (result === 'Approved' || result === 'Partial') {
      this.notificationEngine.dispatch({
        event: 'Inspection Complete',
        recipients: [{ role: 'Admin' }],
        title: 'Inspection Complete',
        message: `GRN ${grn.grnNumber} inspection result: ${result}`,
        requestId: grn.id,
        priority: result === 'Partial' ? 'High' : 'Low',
      });
    }

    if (result === 'Rejected' || result === 'Partial') {
      this.auditLog.createAuditLog(
        'INSPECT_GOODS',
        'Receiving',
        `Inspection ${result} for ${grn.grnNumber} - requires admin decision`,
        { severity: result === 'Rejected' ? 'warning' : 'info' },
      );

      this.notificationEngine.dispatch({
        event: 'Quality Issue Found',
        recipients: [{ role: 'Admin' }],
        title: 'Quality Issue Found',
        message: `GRN ${grn.grnNumber} has items requiring admin decision`,
        requestId: grn.id,
        actionRequired: true,
        actionUrl: '/admin/receiving/grn-decisions',
        priority: 'High',
      });
    }

    return this.transitionStatus(grnId, result, inspectorName, 'Storekeeper', `Inspection ${result}`);
  }

  recordDecision(
    grnId: string,
    itemId: string,
    decision: GrnDecision,
    decidedBy: string,
    decidedByName: string,
    options?: { discountPercentage?: number; remarks?: string },
  ): boolean {
    const grn = this.grns().find((g) => g.id === grnId);
    if (!grn) return false;

    const decisionRecord: GrnDecisionRecord = {
      id: this.generateId(),
      itemId,
      decision,
      discountPercentage: options?.discountPercentage,
      remarks: options?.remarks,
      decidedBy,
      decidedByName,
      decidedAt: new Date(),
    };

    this.grns.update((list) =>
      list.map((g) =>
        g.id === grnId
          ? { ...g, decisions: [...g.decisions, decisionRecord], updatedAt: new Date() }
          : g,
      ),
    );
    this.persist();
    this.grnUpdates$.next(this.grns().find((g) => g.id === grnId)!);

    this.auditLog.createAuditLog(
      'ADMIN_DECISION',
      'Receiving',
      `${decidedByName} decided ${decision} on item ${itemId} in ${grn.grnNumber}`,
      { severity: 'info' },
    );

    return true;
  }

  completeGrn(grnId: string, completedBy: string): boolean {
    const result = this.transitionStatus(grnId, 'Completed', completedBy, 'Storekeeper', 'GRN Completed - Stock Updated');

    if (result) {
      this.notificationEngine.dispatch({
        event: 'Goods Received (GRN)',
        recipients: [{ role: 'Admin' }],
        title: 'GRN Completed',
        message: `GRN ${this.grns().find((g) => g.id === grnId)?.grnNumber} completed and stock updated`,
        requestId: grnId,
        priority: 'Low',
      });
    }

    return result;
  }

  mergeApiGrns(rows: GrnRecord[]): void {
    this.grns.update((existing) => {
      const byId = new Map(existing.map((g) => [g.id, g]));
      for (const row of rows) {
        byId.set(row.id, row);
      }
      return Array.from(byId.values());
    });
    this.persist();
  }

  private transitionStatus(
    grnId: string,
    newStatus: GrnStatus,
    performedBy: string,
    performedByRole: string,
    action: string,
    comments?: string,
  ): boolean {
    const grn = this.grns().find((g) => g.id === grnId);
    if (!grn) return false;

    const allowed = VALID_GRN_TRANSITIONS[grn.status];
    if (!allowed.to.includes(newStatus)) return false;

    const updatedGrn: GrnRecord = {
      ...grn,
      status: newStatus,
      updatedAt: new Date(),
      workflowHistory: [
        ...grn.workflowHistory,
        {
          id: this.generateId(),
          action,
          performedBy,
          performedByRole,
          timestamp: new Date(),
          comments,
          previousStatus: grn.status,
          newStatus,
        },
      ],
    };

    this.grns.update((list) => list.map((g) => (g.id === grnId ? updatedGrn : g)));
    this.persist();
    this.grnUpdates$.next(updatedGrn);
    return true;
  }

  private createNotification(
    notification: Omit<GrnNotificationMessage, 'id' | 'isRead' | 'createdDate'>,
  ): void {
    const newNotification: GrnNotificationMessage = {
      ...notification,
      id: this.generateId(),
      isRead: false,
      createdDate: new Date(),
    };

    this.notifications.update((all) => [...all, newNotification]);
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

  private generateId(): string {
    return 'grn_' + Math.random().toString(36).substring(2, 11);
  }

  private generateGrnNumber(): string {
    const year = new Date().getFullYear();
    const sequence = this.grns().length + 1;
    return `GRN-${year}-${String(sequence).padStart(4, '0')}`;
  }

  private listenForCrossTabUpdates(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('storage', (event) => {
      if (event.key !== STORAGE_GRNS && event.key !== STORAGE_GRN_NOTIFICATIONS) return;
      this.restoreFromStorage();
      const latest = this.grns().at(-1) ?? null;
      if (latest) this.grnUpdates$.next(latest);
    });
  }

  private persist(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_GRNS, JSON.stringify(this.grns(), this.dateReplacer));
      localStorage.setItem(STORAGE_GRN_NOTIFICATIONS, JSON.stringify(this.notifications(), this.dateReplacer));
    } catch {
      /* ignore */
    }
  }

  private readonly dateReplacer = (_key: string, value: unknown) =>
    value instanceof Date ? value.toISOString() : value;

  private restoreFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const rawGrns = localStorage.getItem(STORAGE_GRNS);
      const rawNotifs = localStorage.getItem(STORAGE_GRN_NOTIFICATIONS);
      if (rawGrns) {
        const parsed = JSON.parse(rawGrns) as GrnRecord[];
        this.grns.set(parsed.map((g) => this.reviveGrn(g)));
      } else {
        this.grns.set([]);
      }
      if (rawNotifs) {
        const parsedN = JSON.parse(rawNotifs) as GrnNotificationMessage[];
        this.notifications.set(parsedN.map((n) => this.reviveNotification(n)));
      } else {
        this.notifications.set([]);
      }
    } catch {
      this.grns.set([]);
      this.notifications.set([]);
    }
  }

  private reviveGrn(g: GrnRecord): GrnRecord {
    return {
      ...g,
      receivedDate: new Date(g.receivedDate as unknown as string),
      createdAt: new Date(g.createdAt as unknown as string),
      updatedAt: g.updatedAt ? new Date(g.updatedAt as unknown as string) : undefined,
      inspection: g.inspection
        ? { ...g.inspection, inspectionDate: new Date(g.inspection.inspectionDate as unknown as string) }
        : undefined,
      decisions: (g.decisions || []).map((d) => ({ ...d, decidedAt: new Date(d.decidedAt as unknown as string) })),
      workflowHistory: (g.workflowHistory || []).map((h) => ({
        ...h,
        timestamp: new Date(h.timestamp as unknown as string),
      })),
    };
  }

  private reviveNotification(n: GrnNotificationMessage): GrnNotificationMessage {
    return { ...n, createdDate: new Date(n.createdDate as unknown as string) };
  }
}
