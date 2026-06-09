import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { AuditLogService } from './audit-log.service';
import { NotificationEngineService } from './notification-engine.service';
import {
  EntityType,
  ApproverRole,
  ApprovalRule,
  ApprovalChain,
  ApprovalChainStep,
  ApprovalHistoryEntry,
  ProcessApprovalParams,
  ProcessApprovalResult,
  findApprovalRule,
  APPROVER_ROLE_HIERARCHY,
  APPROVER_ROLE_TO_DASHBOARD,
  APPROVER_ROLE_TO_DISPLAY,
  APPROVAL_ESCALATION_HOURS,
  APPROVAL_AUTO_ESCALATE_DAYS,
} from '../models/approval.model';

export type ApprovalEntityStatus = 'Pending' | 'PendingManager' | 'PendingAdmin' | 'PendingDirector' | 'Approved' | 'Rejected';

const HISTORY_STORAGE_KEY = 'pas_approval_history_v1';

@Injectable({ providedIn: 'root' })
export class ApprovalService {
  private readonly authService = inject(AuthService);
  private readonly auditLog = inject(AuditLogService);
  private readonly notificationEngine = inject(NotificationEngineService);

  private readonly activeChains = signal<ApprovalChain[]>([]);
  private readonly history = signal<ApprovalHistoryEntry[]>([]);

  constructor() {
    this.restoreHistory();
  }

  getActiveChains(): ApprovalChain[] {
    return this.activeChains();
  }

  getHistory(): ApprovalHistoryEntry[] {
    return this.history();
  }

  findRule(entityType: EntityType, value: number): ApprovalRule | undefined {
    return findApprovalRule(entityType, value);
  }

  getChain(entityType: EntityType, entityId: string, value: number): ApprovalChain {
    const existing = this.activeChains().find(
      (c) => c.entityType === entityType && c.entityId === entityId,
    );
    if (existing) return existing;

    const rule = findApprovalRule(entityType, value);
    if (!rule) {
      const fallback: ApprovalChain = {
        entityType,
        entityId,
        value,
        rule: { id: 0, entityType, minValue: 0, maxValue: 999999, approverRole: 'Admin', nextApproverRole: null, requiresEscalation: false },
        steps: [{ step: 0, role: 'Admin', status: 'pending' }],
        currentStep: 0,
        overallStatus: 'in_progress',
        requiresEscalation: false,
      };
      this.activeChains.update((c) => [...c, fallback]);
      return fallback;
    }

    const steps: ApprovalChainStep[] = [];
    steps.push({ step: 0, role: rule.approverRole, status: 'pending' });
    if (rule.nextApproverRole) {
      steps.push({ step: 1, role: rule.nextApproverRole, status: 'pending' });
    }

    const chain: ApprovalChain = {
      entityType,
      entityId,
      value,
      rule,
      steps,
      currentStep: 0,
      overallStatus: 'in_progress',
      requiresEscalation: rule.requiresEscalation,
    };

    this.activeChains.update((c) => [...c, chain]);
    return chain;
  }

  processApproval(params: ProcessApprovalParams): ProcessApprovalResult {
    const chain = this.getChain(params.entityType, params.entityId, params.value);
    const currentStep = chain.steps[chain.currentStep];

    if (!currentStep) {
      return { success: false, chain, message: 'No pending approval step found' };
    }

    if (currentStep.status !== 'pending') {
      return { success: false, chain, message: `Step ${chain.currentStep + 1} is already ${currentStep.status}` };
    }

    const expectedRole = currentStep.role;
    const hasAuthority = this.canApproveAsRole(params.approverRole, expectedRole, params.value);

    if (!hasAuthority) {
      return {
        success: false,
        chain,
        message: `${params.approverName} (${params.approverRole}) does not have authority for step ${chain.currentStep + 1} (requires ${APPROVER_ROLE_TO_DISPLAY[expectedRole]})`,
      };
    }

    const historyEntry: ApprovalHistoryEntry = {
      id: `ah_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      entityType: params.entityType,
      entityId: params.entityId,
      step: chain.currentStep,
      role: expectedRole,
      action: params.approved ? 'approve' : 'reject',
      actedBy: params.approverName,
      actedById: params.approverId,
      comments: params.comments,
      timestamp: new Date(),
    };
    this.addHistoryEntry(historyEntry);

    if (!params.approved) {
      currentStep.status = 'rejected';
      chain.overallStatus = 'rejected';
      this.updateChain(chain);

      this.auditLog.createAuditLog(
        'REJECT_PO',
        params.entityType,
        `${params.entityType} ${params.entityId} rejected at step ${chain.currentStep + 1} by ${params.approverName}${params.comments ? ': ' + params.comments : ''}`,
        { severity: 'warning', metadata: { entityType: params.entityType, step: chain.currentStep, reason: params.comments } },
      );

      return {
        success: true,
        chain,
        finalStatus: 'rejected',
        message: `${params.entityType} ${params.entityId} rejected by ${params.approverName}`,
      };
    }

    currentStep.status = 'approved';
    currentStep.actedBy = params.approverName;
    currentStep.actedById = params.approverId;
    currentStep.actedAt = new Date();
    currentStep.comments = params.comments;

    const hasNextStep = chain.currentStep + 1 < chain.steps.length;
    if (hasNextStep) {
      chain.currentStep++;
      this.updateChain(chain);

      const nextRole = chain.steps[chain.currentStep].role;
      this.notificationEngine.dispatch({
        event: 'PO Needs Approval',
        recipients: [{ role: APPROVER_ROLE_TO_DASHBOARD[nextRole] as any }],
        title: `Approval Escalated: ${params.entityType}`,
        message: `${params.entityType} ${params.entityId} ($${params.value}) was approved by ${params.approverName} and requires ${APPROVER_ROLE_TO_DISPLAY[nextRole]} approval`,
        requestId: params.entityId,
        actionRequired: true,
        actionUrl: `/${APPROVER_ROLE_TO_DASHBOARD[nextRole]}/dashboard`,
        priority: 'High',
      });

      this.auditLog.createAuditLog(
        'APPROVE_PO',
        params.entityType,
        `${params.entityType} ${params.entityId} step ${chain.currentStep} approved by ${params.approverName}, escalated to ${APPROVER_ROLE_TO_DISPLAY[nextRole]}`,
        { severity: 'info', metadata: { entityType: params.entityType, nextRole, value: params.value } },
      );

      return {
        success: true,
        chain,
        nextRole,
        message: `${params.entityType} ${params.entityId} approved at step ${chain.currentStep}, escalated to ${APPROVER_ROLE_TO_DISPLAY[nextRole]}`,
      };
    }

    chain.overallStatus = 'approved';
    this.updateChain(chain);

    this.auditLog.createAuditLog(
      'APPROVE_PO',
      params.entityType,
      `${params.entityType} ${params.entityId} fully approved by ${params.approverName}`,
      { severity: 'info', metadata: { entityType: params.entityType, value: params.value } },
    );

    return {
      success: true,
      chain,
      finalStatus: 'approved',
      message: `${params.entityType} ${params.entityId} fully approved`,
    };
  }

  canApproveAsRole(userApproverRole: ApproverRole, requiredRole: ApproverRole, value: number): boolean {
    const userLevel = APPROVER_ROLE_HIERARCHY[userApproverRole] ?? -1;
    const requiredLevel = APPROVER_ROLE_HIERARCHY[requiredRole] ?? 99;
    return userLevel >= requiredLevel;
  }

  canApprove(userRole: string, entityType: EntityType, value: number): { allowed: boolean; requiredRole: ApproverRole; message: string } {
    const rule = findApprovalRule(entityType, value);
    if (!rule) {
      return { allowed: false, requiredRole: 'Admin', message: 'No matching approval rule' };
    }

    if (rule.approverRole === 'Self') {
      return { allowed: true, requiredRole: 'Self', message: 'Self-approval allowed' };
    }

    const mapped = this.mapUserRoleToApproverRole(userRole);
    if (!mapped) {
      return { allowed: false, requiredRole: rule.approverRole, message: `Requires ${APPROVER_ROLE_TO_DISPLAY[rule.approverRole]}` };
    }

    return this.canApproveAsRole(mapped, rule.approverRole, value)
      ? { allowed: true, requiredRole: rule.approverRole, message: `Can approve as ${APPROVER_ROLE_TO_DISPLAY[mapped]}` }
      : { allowed: false, requiredRole: rule.approverRole, message: `Requires ${APPROVER_ROLE_TO_DISPLAY[rule.approverRole]}` };
  }

  getApprovalStatus(entityType: EntityType, entityId: string): ApprovalEntityStatus | null {
    const chain = this.activeChains().find(
      (c) => c.entityType === entityType && c.entityId === entityId,
    );
    if (!chain) return null;

    if (chain.overallStatus === 'approved') return 'Approved';
    if (chain.overallStatus === 'rejected') return 'Rejected';

    const currentStep = chain.steps[chain.currentStep];
    if (!currentStep) return 'Pending';

    switch (currentStep.role) {
      case 'Self': return 'Pending';
      case 'Manager': return 'PendingManager';
      case 'Admin': return 'PendingAdmin';
      case 'Director': return 'PendingDirector';
      default: return 'Pending';
    }
  }

  getPendingChains(entityType?: EntityType): ApprovalChain[] {
    return this.activeChains().filter(
      (c) => c.overallStatus === 'in_progress' && (!entityType || c.entityType === entityType),
    );
  }

  getHistoryForEntity(entityType: EntityType, entityId: string): ApprovalHistoryEntry[] {
    return this.history()
      .filter((h) => h.entityType === entityType && h.entityId === entityId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  checkEscalations(entityType: EntityType, entityId: string, createdDate: Date): {
    needsReminder: boolean;
    needsAutoEscalate: boolean;
    daysWaiting: number;
  } {
    const now = Date.now();
    const created = createdDate.getTime();
    const hoursWaiting = (now - created) / (1000 * 60 * 60);
    const daysWaiting = Math.floor(hoursWaiting / 24);

    const chain = this.activeChains().find(
      (c) => c.entityType === entityType && c.entityId === entityId,
    );
    if (!chain || chain.overallStatus !== 'in_progress') {
      return { needsReminder: false, needsAutoEscalate: false, daysWaiting };
    }

    return {
      needsReminder: hoursWaiting >= APPROVAL_ESCALATION_HOURS,
      needsAutoEscalate: daysWaiting >= APPROVAL_AUTO_ESCALATE_DAYS,
      daysWaiting,
    };
  }

  sendReminder(entityType: EntityType, entityId: string, value: number, daysWaiting: number): boolean {
    const chain = this.getChain(entityType, entityId, value);
    if (chain.overallStatus !== 'in_progress') return false;

    const currentStep = chain.steps[chain.currentStep];
    const role = currentStep.role;
    const dashboardRole = APPROVER_ROLE_TO_DASHBOARD[role];

    this.notificationEngine.dispatch({
      event: 'Audit Log Flagged',
      recipients: [{ role: dashboardRole as any }],
      title: `⚠️ Pending Approval Reminder`,
      message: `Request #${entityId} has been waiting for ${daysWaiting} day(s) - Action required`,
      requestId: entityId,
      actionRequired: true,
      actionUrl: `/${dashboardRole}/dashboard`,
      priority: 'High',
    });

    const historyEntry: ApprovalHistoryEntry = {
      id: `ah_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      entityType,
      entityId,
      step: chain.currentStep,
      role,
      action: 'remind',
      actedBy: 'System',
      actedById: 'system',
      comments: `Reminder sent after ${daysWaiting} day(s)`,
      timestamp: new Date(),
    };
    this.addHistoryEntry(historyEntry);

    this.auditLog.createAuditLog(
      'APPROVAL_REMINDER',
      entityType,
      `Reminder sent for ${entityType} ${entityId} - waiting ${daysWaiting} day(s) for ${APPROVER_ROLE_TO_DISPLAY[role]}`,
      { severity: 'warning', metadata: { entityType, daysWaiting, role } },
    );

    return true;
  }

  autoEscalate(entityType: EntityType, entityId: string, value: number, daysWaiting: number): boolean {
    const chain = this.getChain(entityType, entityId, value);
    if (chain.overallStatus !== 'in_progress') return false;

    const currentStep = chain.steps[chain.currentStep];
    const hasNext = chain.currentStep + 1 < chain.steps.length;

    if (!hasNext) {
      this.sendReminder(entityType, entityId, value, daysWaiting);
      return false;
    }

    currentStep.status = 'skipped';
    chain.currentStep++;
    const nextStep = chain.steps[chain.currentStep];
    const nextRole = nextStep.role;
    const nextDashboardRole = APPROVER_ROLE_TO_DASHBOARD[nextRole];

    this.updateChain(chain);

    this.notificationEngine.dispatch({
      event: 'Audit Log Flagged',
      recipients: [{ role: nextDashboardRole as any }],
      title: `🚨 Auto-Escalated`,
      message: `Request #${entityId} has been auto-escalated to ${APPROVER_ROLE_TO_DISPLAY[nextRole]} after ${daysWaiting} day(s) without action`,
      requestId: entityId,
      actionRequired: true,
      actionUrl: `/${nextDashboardRole}/dashboard`,
      priority: 'Critical',
    });

    const historyEntry: ApprovalHistoryEntry = {
      id: `ah_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      entityType,
      entityId,
      step: chain.currentStep,
      role: nextRole,
      action: 'escalate',
      actedBy: 'System',
      actedById: 'system',
      comments: `Auto-escalated from ${APPROVER_ROLE_TO_DISPLAY[currentStep.role]} to ${APPROVER_ROLE_TO_DISPLAY[nextRole]} after ${daysWaiting} day(s)`,
      timestamp: new Date(),
    };
    this.addHistoryEntry(historyEntry);

    this.auditLog.createAuditLog(
      'APPROVAL_ESCALATED',
      entityType,
      `Auto-escalated ${entityType} ${entityId} from ${APPROVER_ROLE_TO_DISPLAY[currentStep.role]} to ${APPROVER_ROLE_TO_DISPLAY[nextRole]} (${daysWaiting} days)`,
      { severity: 'critical', metadata: { entityType, fromRole: currentStep.role, toRole: nextRole, daysWaiting } },
    );

    return true;
  }

  runEscalationCheck(entityType: EntityType, entityId: string, value: number, createdDate: Date): {
    reminderSent: boolean;
    autoEscalated: boolean;
    message: string;
  } {
    const { needsReminder, needsAutoEscalate, daysWaiting } = this.checkEscalations(entityType, entityId, createdDate);

    if (needsAutoEscalate) {
      const escalated = this.autoEscalate(entityType, entityId, value, daysWaiting);
      return {
        reminderSent: false,
        autoEscalated: escalated,
        message: escalated
          ? `Auto-escalated after ${daysWaiting} day(s)`
          : `Already at final step, reminder sent instead`,
      };
    }

    if (needsReminder) {
      this.sendReminder(entityType, entityId, value, daysWaiting);
      return { reminderSent: true, autoEscalated: false, message: `Reminder sent after ${daysWaiting} day(s)` };
    }

    return { reminderSent: false, autoEscalated: false, message: 'Within SLA' };
  }

  getActiveApprovalsForRole(userRole: string): {
    chain: ApprovalChain;
    step: ApprovalChainStep;
  }[] {
    const approverRole = this.mapUserRoleToApproverRole(userRole);
    if (!approverRole) return [];

    return this.activeChains()
      .filter((c) => c.overallStatus === 'in_progress')
      .map((c) => ({ chain: c, step: c.steps[c.currentStep] }))
      .filter(({ step }) => step.status === 'pending' && this.canApproveAsRole(approverRole, step.role, 0));
  }

  resolveApproverRole(userRole: string): ApproverRole | null {
    return this.mapUserRoleToApproverRole(userRole);
  }

  private mapUserRoleToApproverRole(userRole: string): ApproverRole | null {
    const normalized = userRole.toLowerCase().replace(/[\s_-]+/g, '');
    if (normalized.includes('director') || normalized.includes('vp') || normalized.includes('vicepresident') || normalized.includes('executive')) return 'Director';
    if (normalized.includes('admin') || normalized.includes('boss')) return 'Admin';
    if (normalized.includes('manager') || normalized.includes('approver')) return 'Manager';
    if (normalized.includes('storekeeper') || normalized.includes('storeman') || normalized.includes('store')) return 'Self';
    return null;
  }

  private addHistoryEntry(entry: ApprovalHistoryEntry): void {
    this.history.update((h) => [...h, entry]);
    this.persistHistory();
  }

  private updateChain(chain: ApprovalChain): void {
    this.activeChains.update((chains) =>
      chains.map((c) =>
        c.entityType === chain.entityType && c.entityId === chain.entityId ? chain : c,
      ),
    );
  }

  private persistHistory(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(this.history()));
    } catch {
      /* ignore */
    }
  }

  private restoreHistory(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (raw) {
        const parsed: ApprovalHistoryEntry[] = JSON.parse(raw);
        this.history.set(
          parsed.map((h) => ({ ...h, timestamp: new Date(h.timestamp) })),
        );
      }
    } catch {
      /* ignore */
    }
  }
}
