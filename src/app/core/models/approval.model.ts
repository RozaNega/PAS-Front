export type EntityType = 'Requisition' | 'PurchaseOrder' | 'NewItem' | 'StockAdjustment';

export type ApproverRole = 'Self' | 'Manager' | 'Admin' | 'Director';

export type ApprovalAction = 'Pending' | 'Approved' | 'Rejected' | 'Escalated' | 'Reminded';

export interface ApprovalRule {
  id: number;
  entityType: EntityType;
  minValue: number;
  maxValue: number;
  approverRole: ApproverRole;
  nextApproverRole: ApproverRole | null;
  requiresEscalation: boolean;
}

export interface ApprovalChainStep {
  step: number;
  role: ApproverRole;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  actedBy?: string;
  actedById?: string;
  actedAt?: Date;
  comments?: string;
}

export interface ApprovalChain {
  entityType: EntityType;
  entityId: string;
  value: number;
  rule: ApprovalRule;
  steps: ApprovalChainStep[];
  currentStep: number;
  overallStatus: 'in_progress' | 'approved' | 'rejected';
  requiresEscalation: boolean;
}

export interface ApprovalHistoryEntry {
  id: string;
  entityType: EntityType;
  entityId: string;
  step: number;
  role: ApproverRole;
  action: 'approve' | 'reject' | 'escalate' | 'remind';
  actedBy: string;
  actedById: string;
  comments?: string;
  timestamp: Date;
}

export interface ProcessApprovalParams {
  entityType: EntityType;
  entityId: string;
  value: number;
  approverRole: ApproverRole;
  approverName: string;
  approverId: string;
  approved: boolean;
  comments?: string;
}

export interface ProcessApprovalResult {
  success: boolean;
  chain: ApprovalChain;
  nextRole?: ApproverRole | null;
  finalStatus?: 'approved' | 'rejected';
  message: string;
}

export const APPROVAL_RULES: readonly ApprovalRule[] = [
  { id: 1, entityType: 'Requisition', minValue: 0, maxValue: 1000, approverRole: 'Manager', nextApproverRole: null, requiresEscalation: false },
  { id: 2, entityType: 'Requisition', minValue: 1000, maxValue: 5000, approverRole: 'Manager', nextApproverRole: 'Admin', requiresEscalation: true },
  { id: 3, entityType: 'Requisition', minValue: 5000, maxValue: 999999, approverRole: 'Manager', nextApproverRole: 'Admin', requiresEscalation: true },
  { id: 4, entityType: 'PurchaseOrder', minValue: 0, maxValue: 500, approverRole: 'Self', nextApproverRole: null, requiresEscalation: false },
  { id: 5, entityType: 'PurchaseOrder', minValue: 500, maxValue: 2000, approverRole: 'Admin', nextApproverRole: null, requiresEscalation: false },
  { id: 6, entityType: 'PurchaseOrder', minValue: 2000, maxValue: 999999, approverRole: 'Admin', nextApproverRole: 'Director', requiresEscalation: true },
  { id: 7, entityType: 'NewItem', minValue: 0, maxValue: 100, approverRole: 'Self', nextApproverRole: null, requiresEscalation: false },
  { id: 8, entityType: 'NewItem', minValue: 100, maxValue: 500, approverRole: 'Admin', nextApproverRole: null, requiresEscalation: false },
  { id: 9, entityType: 'NewItem', minValue: 500, maxValue: 999999, approverRole: 'Admin', nextApproverRole: 'Director', requiresEscalation: true },
  { id: 10, entityType: 'StockAdjustment', minValue: 0, maxValue: 100, approverRole: 'Self', nextApproverRole: null, requiresEscalation: false },
  { id: 11, entityType: 'StockAdjustment', minValue: 100, maxValue: 500, approverRole: 'Admin', nextApproverRole: null, requiresEscalation: false },
  { id: 12, entityType: 'StockAdjustment', minValue: 500, maxValue: 999999, approverRole: 'Admin', nextApproverRole: 'Director', requiresEscalation: true },
];

export function findApprovalRule(entityType: EntityType, value: number): ApprovalRule | undefined {
  return APPROVAL_RULES.find(
    (r) => r.entityType === entityType && value >= r.minValue && value <= r.maxValue,
  );
}

export const APPROVER_ROLE_HIERARCHY: Record<ApproverRole, number> = {
  Self: 0,
  Manager: 1,
  Admin: 2,
  Director: 3,
};

export const APPROVAL_ESCALATION_HOURS = 48;
export const APPROVAL_AUTO_ESCALATE_DAYS = 5;

export const APPROVER_ROLE_TO_DASHBOARD: Record<ApproverRole, string> = {
  Self: 'storekeeper',
  Manager: 'manager',
  Admin: 'admin',
  Director: 'director',
};

export const APPROVER_ROLE_TO_DISPLAY: Record<ApproverRole, string> = {
  Self: 'Self (Storekeeper)',
  Manager: 'Manager',
  Admin: 'Admin',
  Director: 'Director',
};
