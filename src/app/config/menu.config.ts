import { MenuItem } from '../core/interfaces/menu-item.interface';
export type { MenuItem };

export const menuConfig: MenuItem[] = [
  {
    label: 'Dashboard',
    icon: 'bi bi-speedometer2',
    route: '/dashboard',
    permissions: ['view_dashboard'],
  },
];

export const adminMenuConfig: MenuItem[] = [
  {
    label: 'Dashboard',
    icon: 'bi bi-speedometer2',
    route: '/admin/dashboard',
    permissions: ['admin_dashboard'],
  },
  {
    label: 'Stores',
    icon: 'bi bi-shop',
    children: [
      { label: 'Stock Overview', route: '/admin/inventory' },
      { label: 'Current Stock', route: '/admin/inventory/current-stock' },
      { label: 'Stock Movements', route: '/admin/inventory/movements' },
      { label: 'Low Stock', route: '/admin/inventory/low-stock' },
      { label: 'Stock Adjustment', route: '/admin/inventory/adjustment' },
      { label: 'Stock Transfer', route: '/admin/inventory/transfer' },
      { label: 'Warehouses', route: '/admin/warehouses' },
      { label: 'Shelf Locations', route: '/admin/shelf-locations' },
    ],
  },
  {
    label: 'Property Management',
    icon: 'bi bi-building',
    children: [
      { label: 'Properties', route: '/admin/properties' },
      { label: 'Property Categories', route: '/admin/properties/categories' },
      { label: 'Property Types', route: '/admin/properties/types' },
      { label: 'Valuations', route: '/admin/properties/valuations' },
      { label: 'Transfers', route: '/admin/properties/transfers' },
    ],
  },
  {
    label: 'User Management',
    icon: 'bi bi-people',
    children: [
      { label: 'Users', route: '/admin/users', permissions: ['view_users'] },
      { label: 'Employees', route: '/admin/users/employees', permissions: ['view_employees'] },
      { label: 'Roles & Permissions', route: '/admin/users/roles', permissions: ['view_roles'] },
      { label: 'Activity Logs', route: '/admin/users/activity', permissions: ['view_audit_log'] },
    ],
  },
  {
    label: 'Requisitions',
    icon: 'bi bi-file-earmark-text',
    children: [
      { label: 'Dashboard', route: '/admin/requisitions' },
      { label: 'Create Requisition', route: '/admin/requisitions/create' },
    ],
  },
  {
    label: 'Receiving',
    icon: 'bi bi-truck',
    children: [
      { label: 'GRN', route: '/admin/receiving/grn' },
      { label: 'Inspection', route: '/admin/receiving/inspection' },
      { label: 'Inspection Logs', route: '/admin/receiving/logs' },
      { label: 'Suppliers', route: '/admin/receiving/suppliers' },
    ],
  },
  {
    label: 'Locations & Assets',
    icon: 'bi bi-geo-alt',
    children: [
      { label: 'Locations', route: '/admin/locations' },
      { label: 'Safety Boxes', route: '/admin/safety-boxes' },
      { label: 'Shelves', route: '/admin/shelves' },
    ],
  },
  {
    label: 'Reports',
    icon: 'bi bi-file-earmark-bar-graph',
    children: [
      { label: 'Reports Dashboard', route: '/admin/reports' },
    ],
  },
  {
    label: 'Notifications',
    icon: 'bi bi-bell',
    route: '/admin/notifications',
    permissions: ['view_notifications'],
  },
  {
    label: 'System Settings',
    icon: 'bi bi-gear',
    children: [
      { label: 'Settings', route: '/admin/settings' },
      { label: 'Backup', route: '/admin/settings/backup' },
    ],
  },
];

export const storekeeperMenuConfig: MenuItem[] = [
  {
    label: 'Dashboard',
    icon: 'bi bi-speedometer2',
    route: '/storekeeper/dashboard',
    permissions: ['storekeeper_dashboard'],
  },
  {
    label: 'Inventory',
    icon: 'bi bi-box-seam',
    children: [
      { label: 'Current Stock', route: '/storekeeper/inventory' },
      { label: 'Stock Movements', route: '/storekeeper/inventory/movements' },
      { label: 'Low Stock', route: '/storekeeper/inventory/low-stock' },
      { label: 'Stock Adjustment', route: '/storekeeper/inventory/adjustment' },
      { label: 'Stock Transfer', route: '/storekeeper/inventory/transfer' },
    ],
  },
  {
    label: 'Warehouse',
    icon: 'bi bi-building',
    children: [
      { label: 'Warehouse View', route: '/storekeeper/warehouse' },
      { label: 'Warehouses', route: '/storekeeper/warehouse/warehouses' },
      { label: 'Shelf Management', route: '/storekeeper/warehouse/shelves' },
      { label: 'QR Scanner', route: '/storekeeper/warehouse/scanner' },
    ],
  },
  {
    label: 'Item Catalog',
    icon: 'bi bi-collection',
    children: [
      { label: 'All Items', route: '/storekeeper/catalog' },
      { label: 'Categories', route: '/storekeeper/catalog/categories' },
    ],
  },
  {
    label: 'Goods Receiving',
    icon: 'bi bi-truck',
    route: '/storekeeper/receiving',
  },
  {
    label: 'Issuance',
    icon: 'bi bi-box-arrow-right',
    route: '/storekeeper/issuing',
  },
  {
    label: 'Reports',
    icon: 'bi bi-file-earmark-bar-graph',
    route: '/storekeeper/reports',
  },
  {
    label: 'Notifications',
    icon: 'bi bi-bell',
    route: '/storekeeper/notifications',
    permissions: ['view_notifications'],
  },
];

export const complianceMenuConfig: MenuItem[] = [
  {
    label: 'Dashboard',
    icon: 'bi bi-speedometer2',
    route: '/compliance-officer/dashboard',
    permissions: ['compliance_dashboard'],
  },
  {
    label: 'Compliance',
    icon: 'bi bi-shield-check',
    children: [
      { label: 'Risk Alerts', route: '/compliance-officer/risk-alerts' },
      { label: 'Audit Trail', route: '/compliance-officer/audit-trail' },
      { label: 'Disposal Records', route: '/compliance-officer/disposal' },
      { label: 'Inspections', route: '/compliance-officer/inspections' },
      { label: 'Documents', route: '/compliance-officer/documents' },
    ],
  },
  {
    label: 'Audits',
    icon: 'bi bi-search',
    children: [
      { label: 'All Audits', route: '/compliance-officer/audits/all' },
      { label: 'Pending Audits', route: '/compliance-officer/audits/pending' },
      { label: 'Completed Audits', route: '/compliance-officer/audits/completed' },
    ],
  },
  {
    label: 'Reports',
    icon: 'bi bi-file-earmark-bar-graph',
    children: [
      { label: 'Risk Reports', route: '/compliance-officer/reports/risk' },
      { label: 'Audit Reports', route: '/compliance-officer/reports/audit' },
      { label: 'Status Reports', route: '/compliance-officer/reports/status' },
      { label: 'Disposal Reports', route: '/compliance-officer/reports/disposal' },
      { label: 'Inspection Reports', route: '/compliance-officer/reports/inspection' },
    ],
  },
  {
    label: 'Decisions',
    icon: 'bi bi-check2-square',
    children: [
      { label: 'Approvals', route: '/compliance-officer/decisions/approvals' },
      { label: 'Rejections', route: '/compliance-officer/decisions/rejections' },
      { label: 'Response Times', route: '/compliance-officer/decisions/response-times' },
    ],
  },
  {
    label: 'Profile',
    icon: 'bi bi-person',
    route: '/compliance-officer/profile',
  },
];

export const employeeMenuConfig: MenuItem[] = [
  {
    label: 'Dashboard',
    icon: 'bi bi-speedometer2',
    route: '/employee/dashboard',
    permissions: ['employee_dashboard'],
  },
  {
    label: 'My Requests',
    icon: 'bi bi-file-earmark-text',
    children: [
      { label: 'Create Request', route: '/employee/requests/create' },
      { label: 'Pending', route: '/employee/requests/pending' },
      { label: 'Approved', route: '/employee/requests/approved' },
      { label: 'Rejected', route: '/employee/requests/rejected' },
      { label: 'Completed', route: '/employee/requests/completed' },
      { label: 'My SIVs', route: '/employee/requests/sivs' },
    ],
  },
  {
    label: 'Returns',
    icon: 'bi bi-arrow-return-left',
    children: [
      { label: 'My Returns', route: '/employee/returns' },
      { label: 'Create Return', route: '/employee/returns/create' },
    ],
  },
  {
    label: 'Dashboard Info',
    icon: 'bi bi-layout-sidebar',
    children: [
      { label: 'Summary', route: '/employee/dashboard/my-requests-summary' },
      { label: 'Activity', route: '/employee/dashboard/my-activity' },
      { label: 'Notifications', route: '/employee/dashboard/notifications' },
    ],
  },
];

export const managerMenuConfig: MenuItem[] = [
  {
    label: 'Dashboard',
    icon: 'bi bi-speedometer2',
    route: '/manager/dashboard',
    permissions: ['manager_dashboard'],
  },
  {
    label: 'Approvals',
    icon: 'bi bi-check-circle',
    children: [
      { label: 'Pending Approvals', route: '/manager/approvals/pending', permissions: ['approve_requests'] },
      { label: 'My Decisions', route: '/manager/approvals/decisions' },
      { label: 'Approval History', route: '/manager/approvals/history' },
    ],
  },
  {
    label: 'Requests',
    icon: 'bi bi-file-earmark-text',
    children: [
      { label: 'All Requests', route: '/manager/requests/all' },
      { label: 'Pending', route: '/manager/requests/pending' },
      { label: 'Approved', route: '/manager/requests/approved' },
      { label: 'Rejected', route: '/manager/requests/rejected' },
      { label: 'Issued', route: '/manager/requests/issued' },
    ],
  },
  {
    label: 'SIVs',
    icon: 'bi bi-receipt',
    children: [
      { label: 'All SIVs', route: '/manager/sivs/all' },
      { label: 'Pending SIVs', route: '/manager/sivs/pending' },
      { label: 'Issued SIVs', route: '/manager/sivs/issued' },
    ],
  },
  {
    label: 'Inventory',
    icon: 'bi bi-box-seam',
    children: [
      { label: 'Stock Overview', route: '/manager/inventory' },
      { label: 'Low Stock', route: '/manager/inventory/low-stock' },
      { label: 'Stock Movements', route: '/manager/inventory/movements' },
      { label: 'Stock Ledger', route: '/manager/inventory/ledger' },
    ],
  },
  {
    label: 'Workflows',
    icon: 'bi bi-diagram-3',
    children: [
      { label: 'All Workflows', route: '/manager/workflows/all' },
      { label: 'Create Workflow', route: '/manager/workflows/create' },
      { label: 'Approver Matrix', route: '/manager/workflows/approvers' },
    ],
  },
  {
    label: 'Reports',
    icon: 'bi bi-file-earmark-bar-graph',
    children: [
      { label: 'Inventory Report', route: '/manager/reports/inventory' },
      { label: 'Approval Reports', route: '/manager/reports/approval' },
      { label: 'Request Reports', route: '/manager/reports/requests' },
      { label: 'SIV Reports', route: '/manager/reports/sivs' },
    ],
  },
  {
    label: 'Tools',
    icon: 'bi bi-tools',
    children: [
      { label: 'Audit Trail', route: '/manager/audit-trail' },
      { label: 'Approval Queue', route: '/manager/approval-queue' },
      { label: 'Approval Workflow', route: '/manager/approval-workflow' },
      { label: 'Approver Matrix', route: '/manager/approver-matrix' },
      { label: 'Decision Reports', route: '/manager/decision-reports' },
    ],
  },
  {
    label: 'Notifications',
    icon: 'bi bi-bell',
    route: '/manager/notifications',
    permissions: ['view_notifications'],
  },
];

export function getMenuConfigByRole(role: string): MenuItem[] {
  switch (role) {
    case 'admin':
      return adminMenuConfig;
    case 'storekeeper':
      return storekeeperMenuConfig;
    case 'compliance-officer':
      return complianceMenuConfig;
    case 'manager':
      return managerMenuConfig;
    case 'employee':
    default:
      return employeeMenuConfig;
  }
}
