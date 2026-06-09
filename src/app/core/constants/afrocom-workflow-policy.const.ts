export type AfrocomRoleKey =
  | 'admin'
  | 'manager'
  | 'storekeeper'
  | 'employee'
  | 'compliance';

export interface AfrocomRoleDefinition {
  key: AfrocomRoleKey;
  name: string;
  simpleTitle: string;
  mainJob: string;
  decisionPower: string;
  dashboardScope: string;
  tone: string;
  route: string;
}

export interface AfrocomPermissionRow {
  action: string;
  admin: string;
  manager: string;
  storekeeper: string;
  employee: string;
  compliance: string;
}

export interface AfrocomWorkflowStep {
  actor: string;
  title: string;
  detail: string;
}

export interface AfrocomWorkflowBranch {
  condition: string;
  outcome: string;
}

export interface AfrocomWorkflowScenario {
  key: string;
  title: string;
  summary: string;
  steps: AfrocomWorkflowStep[];
  branches: AfrocomWorkflowBranch[];
}

export interface AfrocomNotificationRule {
  event: string;
  sender: string;
  receivers: string;
  method: string;
  priority: 'Low' | 'Normal' | 'High' | 'Critical';
}

export interface AfrocomApprovalRule {
  itemOrRequest: string;
  createdBy: string;
  approvedBy: string;
  escalatedTo: string;
}

export const AFROCOM_ROLE_DEFINITIONS: readonly AfrocomRoleDefinition[] = [
  {
    key: 'admin',
    name: 'Admin',
    simpleTitle: 'The Boss',
    mainJob: 'Manages everything and controls the system.',
    decisionPower: 'Highest - full system control',
    dashboardScope: 'Full system dashboard',
    tone: 'Owns users, properties, settings, stock adjustments, reports, and audit visibility.',
    route: '/admin/dashboard',
  },
  {
    key: 'manager',
    name: 'Manager',
    simpleTitle: 'Department Head',
    mainJob: 'Approves or rejects department requests.',
    decisionPower: 'High - department level',
    dashboardScope: 'Department dashboard',
    tone: 'Reviews budget, need, department requests, SIVs, and department reports.',
    route: '/manager/dashboard',
  },
  {
    key: 'storekeeper',
    name: 'Storekeeper',
    simpleTitle: 'Warehouse Worker',
    mainJob: 'Handles physical goods and inventory movement.',
    decisionPower: 'Medium - inventory level',
    dashboardScope: 'Inventory dashboard',
    tone: 'Receives goods, inspects items, issues stock, creates SIVs, and manages stock counts.',
    route: '/storekeeper/dashboard',
  },
  {
    key: 'employee',
    name: 'Employee',
    simpleTitle: 'Staff Member',
    mainJob: 'Requests items and tracks their own requests.',
    decisionPower: 'Low - own requests only',
    dashboardScope: 'Basic dashboard',
    tone: 'Creates requisitions, receives items, and follows request/SIV status.',
    route: '/employee/dashboard',
  },
  {
    key: 'compliance',
    name: 'Compliance Officer',
    simpleTitle: 'Auditor',
    mainJob: 'Monitors workflows, audit logs, and policy risks.',
    decisionPower: 'None - monitor only',
    dashboardScope: 'Audit dashboard',
    tone: 'Views logs, inspections, reports, policy violations, and risk alerts without changing records.',
    route: '/compliance-officer/dashboard',
  },
] as const;

export const AFROCOM_PERMISSION_MATRIX: readonly AfrocomPermissionRow[] = [
  {
    action: 'View Dashboard',
    admin: 'Full',
    manager: 'Dept only',
    storekeeper: 'Inventory',
    employee: 'Basic',
    compliance: 'Audit view',
  },
  {
    action: 'Create User',
    admin: 'Yes',
    manager: 'No',
    storekeeper: 'No',
    employee: 'No',
    compliance: 'No',
  },
  {
    action: 'Delete User',
    admin: 'Yes',
    manager: 'No',
    storekeeper: 'No',
    employee: 'No',
    compliance: 'No',
  },
  {
    action: 'Assign Roles',
    admin: 'Yes',
    manager: 'No',
    storekeeper: 'No',
    employee: 'No',
    compliance: 'No',
  },
  {
    action: 'Create Property',
    admin: 'Yes',
    manager: 'No',
    storekeeper: 'No',
    employee: 'No',
    compliance: 'No',
  },
  {
    action: 'Delete Property',
    admin: 'Yes',
    manager: 'No',
    storekeeper: 'No',
    employee: 'No',
    compliance: 'No',
  },
  {
    action: 'Create Requisition',
    admin: 'Yes',
    manager: 'Yes',
    storekeeper: 'Yes',
    employee: 'Yes',
    compliance: 'No',
  },
  {
    action: 'Approve Requisition',
    admin: 'Yes',
    manager: 'Dept only',
    storekeeper: 'No',
    employee: 'No',
    compliance: 'No',
  },
  {
    action: 'Reject Requisition',
    admin: 'Yes',
    manager: 'Dept only',
    storekeeper: 'No',
    employee: 'No',
    compliance: 'No',
  },
  {
    action: 'Receive Goods',
    admin: 'No',
    manager: 'No',
    storekeeper: 'Yes',
    employee: 'No',
    compliance: 'No',
  },
  {
    action: 'Inspect Goods',
    admin: 'No',
    manager: 'No',
    storekeeper: 'Yes',
    employee: 'No',
    compliance: 'View only',
  },
  {
    action: 'Issue Items',
    admin: 'No',
    manager: 'No',
    storekeeper: 'Yes',
    employee: 'No',
    compliance: 'No',
  },
  {
    action: 'Adjust Stock',
    admin: 'Yes',
    manager: 'No',
    storekeeper: 'Yes',
    employee: 'No',
    compliance: 'No',
  },
  {
    action: 'View Reports',
    admin: 'All',
    manager: 'Dept',
    storekeeper: 'Stock',
    employee: 'No',
    compliance: 'Audit',
  },
  {
    action: 'View Audit Logs',
    admin: 'Yes',
    manager: 'No',
    storekeeper: 'No',
    employee: 'No',
    compliance: 'Yes',
  },
  {
    action: 'System Settings',
    admin: 'Yes',
    manager: 'No',
    storekeeper: 'No',
    employee: 'No',
    compliance: 'No',
  },
] as const;

export const AFROCOM_WORKFLOW_SCENARIOS: readonly AfrocomWorkflowScenario[] = [
  {
    key: 'requisition',
    title: 'Employee Requests an Item',
    summary:
      'Employee submits a request, Manager decides at department level, Admin handles escalated/high-value approval, and Storekeeper fulfills approved stock.',
    steps: [
      {
        actor: 'Employee',
        title: 'Create request',
        detail: 'Submits item need, quantity, required date, and justification.',
      },
      {
        actor: 'Manager',
        title: 'Review request',
        detail: 'Checks budget, verifies need, and approves or rejects department requests.',
      },
      {
        actor: 'Admin',
        title: 'Handle escalation',
        detail: 'Reviews high-value or escalated requests after manager approval.',
      },
      {
        actor: 'Storekeeper',
        title: 'Fulfill approved request',
        detail: 'Checks stock, picks items, creates SIV, captures receipt, and updates stock.',
      },
      {
        actor: 'Compliance Officer',
        title: 'Monitor audit trail',
        detail: 'Views the complete request lifecycle without changing workflow records.',
      },
    ],
    branches: [
      {
        condition: 'Approved',
        outcome: 'Request moves to Storekeeper for stock issue and SIV creation.',
      },
      {
        condition: 'Rejected',
        outcome: 'Employee receives the rejection note and request stays closed.',
      },
      {
        condition: 'High value',
        outcome: 'Manager approval is followed by Admin approval before fulfillment.',
      },
    ],
  },
  {
    key: 'receiving',
    title: 'Supplier Delivers Goods',
    summary:
      'Storekeeper records GRN, validates the delivery, performs inspection, and notifies Admin when exceptions or high-value shipments need review.',
    steps: [
      {
        actor: 'Supplier',
        title: 'Deliver goods',
        detail: 'Shipment arrives at the warehouse with delivery and purchase documents.',
      },
      {
        actor: 'Storekeeper',
        title: 'Create GRN',
        detail: 'Counts items, verifies purchase order, and records the goods receipt note.',
      },
      {
        actor: 'Storekeeper',
        title: 'Inspect delivery',
        detail: 'Marks inspection as pass, fail, or partial and records any quality issue.',
      },
      {
        actor: 'Admin',
        title: 'Review exceptions',
        detail: 'Reviews high-value, new supplier, or issue-based receiving exceptions.',
      },
      {
        actor: 'Compliance Officer',
        title: 'Monitor receiving',
        detail: 'Views receiving activity, inspection logs, and audit evidence.',
      },
    ],
    branches: [
      {
        condition: 'Quality pass',
        outcome: 'Goods become available for stock management.',
      },
      {
        condition: 'Quality issue',
        outcome: 'Storekeeper reports issue to Admin for return, discount, or acceptance decision.',
      },
      {
        condition: 'Partial delivery',
        outcome: 'Accepted quantities are recorded and exceptions are tracked.',
      },
    ],
  },
  {
    key: 'low-stock',
    title: 'Low Stock Alert',
    summary:
      'System detects threshold breach, alerts the right roles, and Storekeeper creates a purchase order for Admin approval when required.',
    steps: [
      {
        actor: 'System',
        title: 'Detect low stock',
        detail: 'Compares available units with the configured minimum threshold.',
      },
      {
        actor: 'System',
        title: 'Notify roles',
        detail: 'Alerts Storekeeper, Admin, Manager, and Compliance according to severity.',
      },
      {
        actor: 'Storekeeper',
        title: 'Create purchase order',
        detail: 'Prepares replenishment quantity and supplier details.',
      },
      {
        actor: 'Admin',
        title: 'Approve purchase order',
        detail: 'Checks budget and approves or rejects purchase orders above self-approval limits.',
      },
      {
        actor: 'Storekeeper',
        title: 'Order from supplier',
        detail: 'Places the approved order and continues receiving workflow when goods arrive.',
      },
    ],
    branches: [
      {
        condition: 'Low stock',
        outcome: 'Storekeeper gets an in-app/email alert to create a purchase order.',
      },
      {
        condition: 'Critical low stock',
        outcome: 'Storekeeper, Admin, and Manager receive critical alerts.',
      },
      {
        condition: 'Audit event',
        outcome: 'Compliance receives an audit alert for monitoring only.',
      },
    ],
  },
] as const;

export const AFROCOM_NOTIFICATION_RULES: readonly AfrocomNotificationRule[] = [
  {
    event: 'New Requisition',
    sender: 'Employee',
    receivers: 'Manager',
    method: 'Email + In-app',
    priority: 'Normal',
  },
  {
    event: 'Requisition Approved',
    sender: 'Manager',
    receivers: 'Employee, Storekeeper',
    method: 'Email + In-app',
    priority: 'Normal',
  },
  {
    event: 'Requisition Rejected',
    sender: 'Manager',
    receivers: 'Employee',
    method: 'Email + In-app',
    priority: 'Normal',
  },
  {
    event: 'High Value Request',
    sender: 'Manager',
    receivers: 'Admin',
    method: 'Email + In-app',
    priority: 'High',
  },
  {
    event: 'Urgent Requisition',
    sender: 'Employee',
    receivers: 'Manager, Storekeeper, Admin',
    method: 'SMS + Email + In-app',
    priority: 'Critical',
  },
  {
    event: 'Items Ready for Pickup',
    sender: 'Storekeeper',
    receivers: 'Employee',
    method: 'Email + In-app',
    priority: 'Normal',
  },
  {
    event: 'SIV Created',
    sender: 'Storekeeper',
    receivers: 'Employee, Admin',
    method: 'Email + In-app',
    priority: 'Normal',
  },
  {
    event: 'Low Stock Alert',
    sender: 'System',
    receivers: 'Storekeeper, Admin',
    method: 'Email + In-app',
    priority: 'High',
  },
  {
    event: 'Critical Low Stock',
    sender: 'System',
    receivers: 'Storekeeper, Admin, Manager',
    method: 'SMS + Email + In-app',
    priority: 'Critical',
  },
  {
    event: 'PO Needs Approval',
    sender: 'Storekeeper',
    receivers: 'Admin',
    method: 'Email + In-app',
    priority: 'Normal',
  },
  {
    event: 'PO Approved',
    sender: 'Admin',
    receivers: 'Storekeeper',
    method: 'Email + In-app',
    priority: 'Normal',
  },
  {
    event: 'Goods Received (GRN)',
    sender: 'Storekeeper',
    receivers: 'Admin',
    method: 'In-app',
    priority: 'Low',
  },
  {
    event: 'Quality Issue Found',
    sender: 'Storekeeper',
    receivers: 'Admin',
    method: 'Email + In-app',
    priority: 'High',
  },
  {
    event: 'Inspection Complete',
    sender: 'Storekeeper',
    receivers: 'Admin',
    method: 'In-app',
    priority: 'Low',
  },
  {
    event: 'New User Created',
    sender: 'Admin',
    receivers: 'All optional',
    method: 'Email',
    priority: 'Low',
  },
  {
    event: 'System Maintenance',
    sender: 'Admin',
    receivers: 'All',
    method: 'Email + In-app',
    priority: 'Normal',
  },
  {
    event: 'Audit Log Flagged',
    sender: 'System',
    receivers: 'Compliance Officer',
    method: 'Email + In-app',
    priority: 'High',
  },
  {
    event: 'Policy Violation',
    sender: 'System',
    receivers: 'Compliance Officer, Admin',
    method: 'Email + In-app',
    priority: 'Critical',
  },
  {
    event: 'Monthly Report Ready',
    sender: 'System',
    receivers: 'Admin, Manager, Compliance',
    method: 'Email',
    priority: 'Low',
  },
] as const;

export const AFROCOM_APPROVAL_RULES: readonly AfrocomApprovalRule[] = [
  {
    itemOrRequest: 'Requisition (<$1,000)',
    createdBy: 'Employee',
    approvedBy: 'Manager',
    escalatedTo: '-',
  },
  {
    itemOrRequest: 'Requisition ($1,000-$5,000)',
    createdBy: 'Employee',
    approvedBy: 'Manager',
    escalatedTo: 'Admin',
  },
  {
    itemOrRequest: 'Requisition (>$5,000)',
    createdBy: 'Employee',
    approvedBy: 'Manager -> Admin',
    escalatedTo: '-',
  },
  {
    itemOrRequest: 'Purchase Order (<$500)',
    createdBy: 'Storekeeper',
    approvedBy: 'Storekeeper self',
    escalatedTo: '-',
  },
  {
    itemOrRequest: 'Purchase Order ($500-$2,000)',
    createdBy: 'Storekeeper',
    approvedBy: 'Admin',
    escalatedTo: '-',
  },
  {
    itemOrRequest: 'Purchase Order (>$2,000)',
    createdBy: 'Storekeeper',
    approvedBy: 'Admin -> Director',
    escalatedTo: '-',
  },
  {
    itemOrRequest: 'New Item (<$100)',
    createdBy: 'Storekeeper',
    approvedBy: 'Storekeeper self',
    escalatedTo: '-',
  },
  {
    itemOrRequest: 'New Item ($100-$500)',
    createdBy: 'Storekeeper',
    approvedBy: 'Admin',
    escalatedTo: '-',
  },
  {
    itemOrRequest: 'New Item (>$500)',
    createdBy: 'Storekeeper',
    approvedBy: 'Admin -> Director',
    escalatedTo: '-',
  },
  {
    itemOrRequest: 'Stock Adjustment (<$100)',
    createdBy: 'Storekeeper',
    approvedBy: 'Storekeeper self',
    escalatedTo: '-',
  },
  {
    itemOrRequest: 'Stock Adjustment ($100-$500)',
    createdBy: 'Storekeeper',
    approvedBy: 'Admin',
    escalatedTo: '-',
  },
  {
    itemOrRequest: 'Stock Adjustment (>$500)',
    createdBy: 'Storekeeper',
    approvedBy: 'Admin -> Director',
    escalatedTo: '-',
  },
  {
    itemOrRequest: 'New User',
    createdBy: 'Admin',
    approvedBy: 'Admin self',
    escalatedTo: '-',
  },
  {
    itemOrRequest: 'Role Change',
    createdBy: 'Admin',
    approvedBy: 'Admin self',
    escalatedTo: '-',
  },
  {
    itemOrRequest: 'System Setting',
    createdBy: 'Admin',
    approvedBy: 'Admin self',
    escalatedTo: '-',
  },
] as const;

export const AFROCOM_REQUISITION_ADMIN_THRESHOLD = 5000;
export const AFROCOM_REQUISITION_MANAGER_ESCALATION_THRESHOLD = 1000;
