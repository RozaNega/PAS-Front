import { ROUTES } from './route.config';

export interface MenuItem {
  label: string;
  route?: string;
  icon: string;
  permission?: string;
  role?: string;
  badge?: number;
  children?: MenuItem[];
}

export const managerMenuConfig: MenuItem[] = [
  { label: 'Dashboard', route: '/manager/dashboard', icon: 'bi bi-house-fill' },
  { label: 'Notifications', route: '/manager/notifications', icon: 'bi bi-bell-fill' },
  { label: 'Profile', route: '/manager/profile', icon: 'bi bi-person-circle' },
  {
    label: 'Approval Queue',
    icon: 'bi bi-inboxes-fill',
    badge: 0,
    children: [
      { label: 'Pending Approvals', route: '/manager/approvals/pending', icon: 'bi bi-clock', badge: 0 },
      { label: 'My Decisions', route: '/manager/approvals/decisions', icon: 'bi bi-check-square' },
      { label: 'Approval History', route: '/manager/approvals/history', icon: 'bi bi-clock-history' },
    ],
  },
  {
    label: 'Service Requests',
    icon: 'bi bi-list-check',
    children: [
      { label: 'All Requests', route: '/manager/requests/all', icon: 'bi bi-list' },
      { label: 'Pending', route: '/manager/requests/pending', icon: 'bi bi-clock' },
      { label: 'Approved', route: '/manager/requests/approved', icon: 'bi bi-check-circle' },
      { label: 'Rejected', route: '/manager/requests/rejected', icon: 'bi bi-x-circle' },
      { label: 'Issued', route: '/manager/requests/issued', icon: 'bi bi-box-arrow-right' },
    ],
  },
  {
    label: 'SIV Management',
    icon: 'bi bi-file-text',
    children: [
      { label: 'All SIVs', route: '/manager/sivs/all', icon: 'bi bi-file-earmark-text' },
      { label: 'Pending Issue', route: '/manager/sivs/pending', icon: 'bi bi-clock' },
      { label: 'Issued', route: '/manager/sivs/issued', icon: 'bi bi-check-circle' },
    ],
  },
  {
    label: 'Approval Workflows',
    icon: 'bi bi-diagram-3-fill',
    children: [
      { label: 'All Workflows', route: '/manager/workflows/all', icon: 'bi bi-diagram-3' },
      { label: 'Create Workflow', route: '/manager/workflows/create', icon: 'bi bi-plus-circle' },
      { label: 'Approvers', route: '/manager/workflows/approvers', icon: 'bi bi-people' },
    ],
  },
  {
    label: 'Inventory',
    icon: 'bi bi-boxes',
    children: [
      { label: 'Stock Overview', route: '/manager/inventory', icon: 'bi bi-box-seam' },
      { label: 'Low Stock Items', route: '/manager/inventory/low-stock', icon: 'bi bi-exclamation-triangle' },
      { label: 'Stock Movements', route: '/manager/inventory/movements', icon: 'bi bi-arrow-left-right' },
      { label: 'Stock Ledger', route: '/manager/inventory/ledger', icon: 'bi bi-journal-text' },
    ],
  },
  {
    label: 'Reports',
    icon: 'bi bi-bar-chart-fill',
    children: [
      { label: 'Approval Reports', route: '/manager/reports/approval', icon: 'bi bi-file-earmark-bar-graph' },
      { label: 'Request Reports', route: '/manager/reports/requests', icon: 'bi bi-file-text' },
      { label: 'SIV Reports', route: '/manager/reports/sivs', icon: 'bi bi-file-text' },
      { label: 'Inventory Reports', route: '/manager/reports/inventory', icon: 'bi bi-boxes' },
      { label: 'Stock Movement Reports', route: '/manager/reports/stock-movements', icon: 'bi bi-arrow-left-right' },
    ],
  },
  { label: 'Audit Trail', route: '/manager/audit-trail', icon: 'bi bi-clock-history' },
];

export const complianceOfficerMenuConfig: MenuItem[] = [
  { label: 'Dashboard', route: '/compliance-officer/dashboard', icon: 'bi bi-house-fill' },
  { label: 'Risk Alerts', route: '/compliance-officer/risk-alerts', icon: 'bi bi-bell-fill', badge: 0 },
  { label: 'Profile', route: '/compliance-officer/profile', icon: 'bi bi-person-circle' },
  {
    label: 'Audit Trail',
    icon: 'bi bi-clock-history',
    children: [
      { label: 'All Audits', route: '/compliance-officer/audits/all', icon: 'bi bi-list' },
      { label: 'Pending Reviews', route: '/compliance-officer/audits/pending', icon: 'bi bi-clock' },
      { label: 'Completed', route: '/compliance-officer/audits/completed', icon: 'bi bi-check-circle' },
    ],
  },
  {
    label: 'Compliance Reports',
    icon: 'bi bi-bar-chart-fill',
    children: [
      { label: 'Risk Reports', route: '/compliance-officer/reports/risk', icon: 'bi bi-exclamation-triangle' },
      { label: 'Audit Reports', route: '/compliance-officer/reports/audit', icon: 'bi bi-file-earmark-spreadsheet' },
      { label: 'Compliance Status', route: '/compliance-officer/reports/status', icon: 'bi bi-shield-check' },
      { label: 'Disposal Reports', route: '/compliance-officer/reports/disposal', icon: 'bi bi-trash' },
      { label: 'Inspection Reports', route: '/compliance-officer/reports/inspection', icon: 'bi bi-search' },
    ],
  },
  {
    label: 'Decision Monitoring',
    icon: 'bi bi-graph-up',
    children: [
      { label: 'Approval Decisions', route: '/compliance-officer/decisions/approvals', icon: 'bi bi-check-square' },
      { label: 'Rejection Analysis', route: '/compliance-officer/decisions/rejections', icon: 'bi bi-x-circle' },
      { label: 'Response Times', route: '/compliance-officer/decisions/response-times', icon: 'bi bi-clock-history' },
    ],
  },
  {
    label: 'Records Management',
    icon: 'bi bi-folder-fill',
    children: [
      { label: 'Disposal Records', route: '/compliance-officer/disposal', icon: 'bi bi-trash' },
      { label: 'Inspections', route: '/compliance-officer/inspections', icon: 'bi bi-search' },
      { label: 'Documents', route: '/compliance-officer/documents', icon: 'bi bi-file-earmark' },
    ],
  },
];

export const adminMenuConfig: MenuItem[] = [
  { label: 'Dashboard', route: '/admin/dashboard', icon: 'bi bi-grid-fill' },
  { label: 'Notifications', route: '/admin/notifications', icon: 'bi bi-bell-fill' },
  {
    label: 'Property Management',
    icon: 'bi bi-building',
    children: [
      { label: 'All Properties', route: '/admin/properties', icon: 'bi bi-buildings' },
      { label: 'Add Property', route: '/admin/properties/add', icon: 'bi bi-plus-circle' },
      { label: 'Property Types', route: '/admin/properties/types', icon: 'bi bi-list-check' },
      { label: 'Categories', route: '/admin/properties/categories', icon: 'bi bi-tags' },
      { label: 'Valuations', route: '/admin/properties/valuations', icon: 'bi bi-currency-dollar' },
      { label: 'Pending Transfers', route: '/admin/properties/transfers', icon: 'bi bi-arrow-left-right' },
    ],
  },
  {
    label: 'Locations & Safety Boxes',
    icon: 'bi bi-geo-alt',
    children: [
      { label: 'All Locations', route: '/admin/locations', icon: 'bi bi-geo' },
      { label: 'Safety Boxes', route: '/admin/safety-boxes', icon: 'bi bi-box-seam' },
      { label: 'Shelf Management', route: '/admin/shelves', icon: 'bi bi-grid-3x3' },
    ],
  },
  {
    label: 'Store & Inventory',
    icon: 'bi bi-box-seam',
    badge: 3,
    children: [
      { label: 'Stock Overview', icon: 'bi bi-boxes', route: '/admin/inventory' },
      { label: 'Stock Movements', icon: 'bi bi-arrow-left-right', route: '/admin/inventory/movements' },
      { label: 'Low Stock', icon: 'bi bi-exclamation-triangle', route: '/admin/inventory/low-stock', badge: 3 },
      { label: 'Warehouses', icon: 'bi bi-building', route: '/admin/warehouses' },
      { label: 'Shelves', icon: 'bi bi-grid-3x3', route: '/admin/shelf-locations' },
      { label: 'Stock Adjustment', icon: 'bi bi-sliders', route: '/admin/inventory/adjustment' },
    ],
  },
  {
    label: 'Requisitions',
    icon: 'bi bi-list-check',
    route: '/admin/requisitions',
  },
  {
    label: 'Receiving',
    icon: 'bi bi-arrow-down-circle',
    badge: 2,
    children: [
      { label: 'Goods Receipt Notes', icon: 'bi bi-file-earmark-text', route: '/admin/receiving/grn' },
      { label: 'Pending Inspection', icon: 'bi bi-search', route: '/admin/receiving/inspection', badge: 2 },
      { label: 'Inspection Logs', icon: 'bi bi-journal-text', route: '/admin/receiving/logs' },
      { label: 'Suppliers', icon: 'bi bi-people', route: '/admin/receiving/suppliers' },
    ],
  },
  {
    label: 'User Management',
    icon: 'bi bi-people-fill',
    children: [
      { label: 'All Users', route: '/admin/users', icon: 'bi bi-people' },
      { label: 'Add User', route: '/admin/users/add', icon: 'bi bi-person-plus' },
      { label: 'Roles & Permissions', route: '/admin/users/roles', icon: 'bi bi-shield-lock' },
      { label: 'Employees', route: '/admin/users/employees', icon: 'bi bi-person-badge' },
      { label: 'Activity Logs', route: '/admin/users/activity', icon: 'bi bi-clock-history' },
    ],
  },
  {
    label: 'Reports',
    icon: 'bi bi-bar-chart-fill',
    children: [
      { label: 'All Reports', route: '/admin/reports', icon: 'bi bi-bar-chart-fill' },
      { label: 'System Settings', route: '/admin/settings', icon: 'bi bi-gear' },
      { label: 'Backup', route: '/admin/settings/backup', icon: 'bi bi-database' },
    ],
  },
];

export const storekeeperMenuConfig: MenuItem[] = [
  { label: 'Dashboard', route: '/storekeeper/dashboard', icon: 'bi bi-grid-fill' },
  {
    label: 'Inventory Management',
    icon: 'bi bi-boxes',
    children: [
      { label: 'Current Stock', route: '/storekeeper/inventory', icon: 'bi bi-box-seam' },
      { label: 'Stock Movements', route: '/storekeeper/inventory/movements', icon: 'bi bi-arrow-left-right' },
      { label: 'Low Stock Alerts', route: '/storekeeper/inventory/low-stock', icon: 'bi bi-exclamation-triangle', badge: 4 },
      { label: 'Stock Adjustment', route: '/storekeeper/inventory/adjustment', icon: 'bi bi-sliders' },
      { label: 'Stock Transfer', route: '/storekeeper/inventory/transfer', icon: 'bi bi-arrow-repeat' },
    ],
  },
  {
    label: 'Warehouse',
    icon: 'bi bi-building',
    children: [
      { label: 'Warehouse View', route: '/storekeeper/warehouse', icon: 'bi bi-building' },
      { label: 'Warehouses', route: '/storekeeper/warehouse/warehouses', icon: 'bi bi-building-add' },
      { label: 'Shelf Management', route: '/storekeeper/warehouse/shelves', icon: 'bi bi-grid-3x3' },
      { label: 'QR Code Scanner', route: '/storekeeper/warehouse/scanner', icon: 'bi bi-qr-code-scan' },
    ],
  },
  {
    label: 'Goods Receiving',
    icon: 'bi bi-truck',
    badge: 3,
    children: [
      { label: 'Create Receiving Note', route: '/storekeeper/receiving/create', icon: 'bi bi-plus-circle' },
      { label: 'Pending GRNs', route: '/storekeeper/receiving/pending', icon: 'bi bi-clock', badge: 3 },
      { label: 'Inspection Queue', route: '/storekeeper/receiving/inspection', icon: 'bi bi-search', badge: 2 },
      { label: 'Receiving History', route: '/storekeeper/receiving/history', icon: 'bi bi-clock-history' },
    ],
  },
  {
    label: 'Issuing',
    icon: 'bi bi-box-arrow-right',
    badge: 4,
    children: [
      { label: 'Pending Issues', route: '/storekeeper/issuing/pending', icon: 'bi bi-clock', badge: 4 },
      { label: 'Create SIV', route: '/storekeeper/issuing/create', icon: 'bi bi-plus-circle' },
      { label: 'Issue History', route: '/storekeeper/issuing/history', icon: 'bi bi-clock-history' },
      { label: 'Print SIV', route: '/storekeeper/issuing/print', icon: 'bi bi-printer' },
    ],
  },
  {
    label: 'Item Catalog',
    icon: 'bi bi-list-check',
    children: [
      { label: 'All Items', route: '/storekeeper/catalog', icon: 'bi bi-boxes' },
      { label: 'Categories', route: '/storekeeper/catalog/categories', icon: 'bi bi-tags' },
    ],
  },
  {
    label: 'Reports',
    icon: 'bi bi-file-earmark-bar-graph',
    children: [
      { label: 'Stock Report', route: '/storekeeper/reports/stock', icon: 'bi bi-boxes' },
      { label: 'Issuance Report', route: '/storekeeper/reports/issuance', icon: 'bi bi-file-text' },
      { label: 'Receiving Report', route: '/storekeeper/reports/receiving', icon: 'bi bi-truck' },
    ],
  },
];

export const employeeMenuConfig: MenuItem[] = [
  { label: 'Dashboard', route: '/employee/dashboard', icon: 'bi bi-house-fill' },
  { label: 'User Profile', route: '/employee/dashboard/profile', icon: 'bi bi-person-circle' },
  { label: 'Notifications', route: '/employee/dashboard/notifications', icon: 'bi bi-bell-fill' },
  {
    label: 'My Requests Summary',
    route: '/employee/dashboard/my-requests-summary',
    icon: 'bi bi-clipboard-data-fill',
  },
  { label: 'My Activity', route: '/employee/dashboard/my-activity', icon: 'bi bi-activity' },
  {
    label: 'My Requests',
    icon: 'bi bi-card-list',
    badge: 0,
    children: [
      { label: 'Create New Request', route: '/employee/requests/create', icon: 'bi bi-plus-circle' },
      { label: 'Pending Approval', route: '/employee/requests/pending', icon: 'bi bi-clock', badge: 0 },
      { label: 'Approved Requests', route: '/employee/requests/approved', icon: 'bi bi-check-circle' },
      { label: 'Rejected Requests', route: '/employee/requests/rejected', icon: 'bi bi-x-circle' },
      { label: 'Completed Requests', route: '/employee/requests/completed', icon: 'bi bi-check2-all' },
      { label: 'My SIVs', route: '/employee/requests/sivs', icon: 'bi bi-file-text' },
    ],
  },
  {
    label: 'Returns',
    icon: 'bi bi-arrow-counterclockwise',
    children: [
      { label: 'My Returns', route: '/employee/returns', icon: 'bi bi-list' },
      { label: 'Create Return Request', route: '/employee/returns/create', icon: 'bi bi-plus-circle' },
    ],
  },
];

export function getMenuConfigForRole(role: string): MenuItem[] {
  if (role === 'manager') {
    return managerMenuConfig;
  }

  if (role === 'compliance-officer') {
    return complianceOfficerMenuConfig;
  }

  if (role === 'admin' || role === 'super-admin' || role === 'property-officer') {
    return adminMenuConfig;
  }

  if (role === 'storekeeper' || role === 'store-officer' || role === 'store-assistant') {
    return storekeeperMenuConfig;
  }

  return employeeMenuConfig;
}

export const menuConfig: MenuItem[] = employeeMenuConfig;
