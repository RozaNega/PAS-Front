import { Injectable, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AuthService } from './auth.service';

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'CREATE_REQUISITION'
  | 'APPROVE_REQUISITION'
  | 'REJECT_REQUISITION'
  | 'ESCALATE_REQUISITION'
  | 'CREATE_GRN'
  | 'RECEIVE_GOODS'
  | 'INSPECT_GOODS'
  | 'ISSUE_ITEMS'
  | 'CREATE_SIV'
  | 'ADJUST_STOCK'
  | 'STOCK_TRANSFER'
  | 'CREATE_PO'
  | 'APPROVE_PO'
  | 'REJECT_PO'
  | 'ORDER_PO'
  | 'RECEIVE_PO'
  | 'LOW_STOCK_CHECK'
  | 'CREATE_USER'
  | 'DELETE_USER'
  | 'ASSIGN_ROLE'
  | 'CREATE_PROPERTY'
  | 'DELETE_PROPERTY'
  | 'VIEW_AUDIT_LOG'
  | 'SYSTEM_SETTING'
  | 'LOW_STOCK_ALERT'
  | 'CRITICAL_LOW_STOCK'
  | 'POLICY_VIOLATION'
  | 'SYSTEM_MAINTENANCE'
  | 'COMPLIANCE_NOTE'
  | 'REPORT_GENERATED'
  | 'ADMIN_DECISION'
  | 'SUBMIT_GRN'
  | 'COMPLETE_GRN'
  | 'APPROVAL_ESCALATED'
  | 'APPROVAL_REMINDER';

export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  performedBy: string;
  performedById: string;
  performedByRole: string;
  action: AuditAction;
  domain: string;
  description: string;
  details?: string;
  severity: AuditSeverity;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

const STORAGE_KEY = 'pas_audit_logs_v1';

@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private readonly authService = inject(AuthService);
  private readonly logs = signal<AuditLogEntry[]>([]);

  constructor() {
    this.restoreFromStorage();
  }

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private getCurrentActor(): { name: string; id: string; role: string } {
    const user = this.authService.getCurrentUser();
    return {
      name: user?.fullName || user?.username || 'System',
      id: user?.id || 'system',
      role: user?.roles?.[0] || 'System',
    };
  }

  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'performedBy' | 'performedById' | 'performedByRole'>): AuditLogEntry {
    const actor = this.getCurrentActor();
    const full: AuditLogEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date(),
      performedBy: actor.name,
      performedById: actor.id,
      performedByRole: actor.role,
      severity: entry.severity || 'info',
    };
    this.logs.update((prev) => [full, ...prev]);
    this.persist();
    this.notifyComplianceIfHighSeverity(full);
    return full;
  }

  private notifyComplianceIfHighSeverity(entry: AuditLogEntry): void {
    if (entry.severity === 'critical') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('audit-critical-event', {
            detail: { action: entry.action, description: entry.description, id: entry.id },
          }),
        );
      }
    }
  }

  getLogs(filters?: {
    action?: AuditAction;
    domain?: string;
    severity?: AuditSeverity;
    performedBy?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): AuditLogEntry[] {
    let result = this.logs();
    if (filters?.action) {
      result = result.filter((l) => l.action === filters.action);
    }
    if (filters?.domain) {
      result = result.filter((l) => l.domain === filters.domain);
    }
    if (filters?.severity) {
      result = result.filter((l) => l.severity === filters.severity);
    }
    if (filters?.performedBy) {
      result = result.filter((l) =>
        l.performedBy.toLowerCase().includes(filters.performedBy!.toLowerCase()),
      );
    }
    if (filters?.startDate) {
      result = result.filter((l) => l.timestamp >= filters.startDate!);
    }
    if (filters?.endDate) {
      result = result.filter((l) => l.timestamp <= filters.endDate!);
    }
    result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    if (filters?.limit && filters.limit > 0) {
      result = result.slice(0, filters.limit);
    }
    return result;
  }

  getLogsForCompliance(limit = 100): AuditLogEntry[] {
    return this.logs().slice(0, limit);
  }

  getCriticalEvents(): AuditLogEntry[] {
    return this.logs().filter((l) => l.severity === 'critical');
  }

  countBySeverity(): { info: number; warning: number; critical: number } {
    const counts = { info: 0, warning: 0, critical: 0 };
    for (const l of this.logs()) {
      counts[l.severity]++;
    }
    return counts;
  }

  getPolicyViolations(): AuditLogEntry[] {
    return this.logs().filter((l) => l.action === 'POLICY_VIOLATION');
  }

  getLogsForDashboard(
    role: string,
  ): AuditLogEntry[] {
    if (role === 'Admin') {
      return this.logs().slice(0, 50);
    }
    if (role === 'Compliance' || role === 'Compliance Officer') {
      return this.getLogsForCompliance();
    }
    return [];
  }

  clearLogs(): void {
    this.logs.set([]);
    this.persist();
  }

  private persist(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs()));
    } catch {
      /* storage full - trim oldest */
      this.logs.update((prev) => prev.slice(0, 500));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs()));
      } catch {
        /* ignore */
      }
    }
  }

  private restoreFromStorage(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: AuditLogEntry[] = JSON.parse(raw);
        this.logs.set(
          parsed.map((l) => ({
            ...l,
            timestamp: new Date(l.timestamp),
          })),
        );
      }
    } catch {
      /* ignore corrupted data */
    }
  }

  createAuditLog(
    action: AuditAction,
    domain: string,
    description: string,
    options?: {
      details?: string;
      severity?: AuditSeverity;
      metadata?: Record<string, unknown>;
    },
  ): AuditLogEntry {
    return this.log({
      action,
      domain,
      description,
      details: options?.details,
      severity: options?.severity || 'info',
      metadata: options?.metadata,
    });
  }
}
