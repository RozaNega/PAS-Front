import { Injectable, inject } from '@angular/core';
import { AuthService, DashboardRole } from './auth.service';
import { AuditLogService } from './audit-log.service';
import {
  AFROCOM_APPROVAL_RULES,
  AFROCOM_REQUISITION_ADMIN_THRESHOLD,
  AFROCOM_REQUISITION_MANAGER_ESCALATION_THRESHOLD,
} from '../constants/afrocom-workflow-policy.const';

export interface ApprovalDecision {
  allowed: boolean;
  requiredApprovers: string[];
  requiresAdminEscalation: boolean;
  requiresDirectorEscalation: boolean;
  rule?: string;
  message?: string;
}

export const DIRECTOR_ROLE_ALIASES = ['Director', 'Director of Operations', 'Executive Director', 'VP', 'Vice President'];

export interface ApprovalContext {
  itemType: 'Requisition' | 'PurchaseOrder' | 'NewItem' | 'StockAdjustment' | 'NewUser' | 'RoleChange' | 'SystemSetting';
  estimatedCost?: number;
  createdByRole: DashboardRole;
  createdById?: string;
}

@Injectable({ providedIn: 'root' })
export class ApprovalPolicyService {
  private readonly authService = inject(AuthService);
  private readonly auditLog = inject(AuditLogService);

  evaluate(context: ApprovalContext): ApprovalDecision {
    const cost = context.estimatedCost ?? 0;

    switch (context.itemType) {
      case 'Requisition':
        return this.evaluateRequisition(cost);
      case 'PurchaseOrder':
        return this.evaluatePurchaseOrder(cost);
      case 'NewItem':
        return this.evaluateNewItem(cost);
      case 'StockAdjustment':
        return this.evaluateStockAdjustment(cost);
      case 'NewUser':
      case 'RoleChange':
      case 'SystemSetting':
        return {
          allowed: context.createdByRole === 'admin',
          requiredApprovers: ['Admin'],
          requiresAdminEscalation: false,
          requiresDirectorEscalation: false,
          rule: `${context.itemType} requires Admin approval`,
          message: context.createdByRole !== 'admin' ? 'Only Admin can perform this action' : undefined,
        };
    }
  }

  private evaluateRequisition(cost: number): ApprovalDecision {
    if (cost < AFROCOM_REQUISITION_MANAGER_ESCALATION_THRESHOLD) {
      return {
        allowed: true,
        requiredApprovers: ['Manager'],
        requiresAdminEscalation: false,
        requiresDirectorEscalation: false,
        rule: 'Requisition (< $1,000): Manager approval',
      };
    }

    if (cost >= AFROCOM_REQUISITION_MANAGER_ESCALATION_THRESHOLD && cost < AFROCOM_REQUISITION_ADMIN_THRESHOLD) {
      return {
        allowed: true,
        requiredApprovers: ['Manager'],
        requiresAdminEscalation: true,
        requiresDirectorEscalation: false,
        rule: 'Requisition ($1,000 - $5,000): Manager approves, Admin can escalate',
      };
    }

    return {
      allowed: true,
      requiredApprovers: ['Manager', 'Admin'],
      requiresAdminEscalation: true,
      requiresDirectorEscalation: false,
      rule: 'Requisition (> $5,000): Manager + Admin approval required',
    };
  }

  private evaluatePurchaseOrder(cost: number): ApprovalDecision {
    if (cost < 500) {
      return {
        allowed: true,
        requiredApprovers: ['Storekeeper'],
        requiresAdminEscalation: false,
        requiresDirectorEscalation: false,
        rule: 'Purchase Order (< $500): Storekeeper self-approval',
      };
    }

    if (cost >= 500 && cost <= 2000) {
      return {
        allowed: true,
        requiredApprovers: ['Admin'],
        requiresAdminEscalation: true,
        requiresDirectorEscalation: false,
        rule: 'Purchase Order ($500 - $2,000): Admin approval',
      };
    }

    return {
      allowed: true,
      requiredApprovers: ['Admin'],
      requiresAdminEscalation: true,
      requiresDirectorEscalation: true,
      rule: 'Purchase Order (> $2,000): Admin -> Director approval',
    };
  }

  evaluateNewItem(cost: number): ApprovalDecision {
    if (cost < 100) {
      return {
        allowed: true,
        requiredApprovers: ['Storekeeper'],
        requiresAdminEscalation: false,
        requiresDirectorEscalation: false,
        rule: 'New Item (< $100): Storekeeper self-approval',
      };
    }

    if (cost >= 100 && cost <= 500) {
      return {
        allowed: true,
        requiredApprovers: ['Admin'],
        requiresAdminEscalation: true,
        requiresDirectorEscalation: false,
        rule: 'New Item ($100 - $500): Admin approval',
      };
    }

    return {
      allowed: true,
      requiredApprovers: ['Admin'],
      requiresAdminEscalation: true,
      requiresDirectorEscalation: true,
      rule: 'New Item (> $500): Admin -> Director approval',
    };
  }

  evaluateStockAdjustment(cost: number): ApprovalDecision {
    if (cost < 100) {
      return {
        allowed: true,
        requiredApprovers: ['Storekeeper'],
        requiresAdminEscalation: false,
        requiresDirectorEscalation: false,
        rule: 'Stock Adjustment (< $100): Storekeeper self-approval',
      };
    }

    if (cost >= 100 && cost <= 500) {
      return {
        allowed: true,
        requiredApprovers: ['Admin'],
        requiresAdminEscalation: true,
        requiresDirectorEscalation: false,
        rule: 'Stock Adjustment ($100 - $500): Admin approval',
      };
    }

    return {
      allowed: true,
      requiredApprovers: ['Admin'],
      requiresAdminEscalation: true,
      requiresDirectorEscalation: true,
      rule: 'Stock Adjustment (> $500): Admin -> Director approval',
    };
  }

  private userHasDirectorRole(): boolean {
    const user = this.authService.getCurrentUser();
    if (!user?.roles) return false;
    const normalizedRoles = user.roles.map((r) => r.replace(/[\s_-]+/g, '').toLowerCase());
    return DIRECTOR_ROLE_ALIASES.some((alias) =>
      normalizedRoles.includes(alias.replace(/[\s_-]+/g, '').toLowerCase()),
    );
  }

  canCurrentUserApproveCost(cost: number): ApprovalDecision {
    const user = this.authService.getCurrentUser();
    if (!user) {
      return { allowed: false, requiredApprovers: [], requiresAdminEscalation: false, requiresDirectorEscalation: false, message: 'Not authenticated' };
    }

    const role = this.authService.mapUserToDashboardRole(user);

    if (this.userHasDirectorRole()) {
      return { allowed: true, requiredApprovers: ['Director'], requiresAdminEscalation: false, requiresDirectorEscalation: false, message: 'Director auto-approval' };
    }

    if (role === 'admin') {
      return { allowed: true, requiredApprovers: ['Admin'], requiresAdminEscalation: false, requiresDirectorEscalation: false, message: 'Admin auto-approval' };
    }

    if (role === 'manager') {
      return this.evaluateRequisition(cost);
    }

    if (role === 'storekeeper') {
      if (cost < 100) {
        return this.evaluateStockAdjustment(cost);
      }
      return { allowed: false, requiredApprovers: ['Admin'], requiresAdminEscalation: true, requiresDirectorEscalation: false, message: 'Exceeds Storekeeper limit, needs Admin' };
    }

    return { allowed: false, requiredApprovers: [], requiresAdminEscalation: false, requiresDirectorEscalation: false, message: 'No approval authority' };
  }

  logApprovalAction(action: string, context: ApprovalContext, decision: ApprovalDecision): void {
    const actionMap: Record<string, string> = {
      Requisition: 'APPROVE_REQUISITION',
      PurchaseOrder: 'APPROVE_PO',
      NewItem: 'ADJUST_STOCK',
      StockAdjustment: 'ADJUST_STOCK',
      NewUser: 'CREATE_USER',
      RoleChange: 'ASSIGN_ROLE',
      SystemSetting: 'SYSTEM_SETTING',
    };
    const auditAction = action === 'approve'
      ? (actionMap[context.itemType] || 'SYSTEM_SETTING')
      : 'SYSTEM_SETTING';

    const directorMsg = decision.requiresDirectorEscalation ? ' (requires Director approval)' : '';

    this.auditLog.createAuditLog(
      auditAction as any,
      context.itemType,
      `${action === 'approve' ? 'Approved' : 'Rejected'} ${context.itemType} (cost: $${context.estimatedCost ?? 0})${directorMsg}`,
      {
        severity: decision.requiresDirectorEscalation ? 'warning' : 'info',
        metadata: { rule: decision.rule, cost: context.estimatedCost, requiresDirectorEscalation: decision.requiresDirectorEscalation },
      },
    );
  }
}
