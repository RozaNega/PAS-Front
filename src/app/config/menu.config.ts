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
  { label: 'Manager Dashboard', route: '/manager/dashboard', icon: 'bi bi-clipboard2-data-fill' },
];

export const complianceOfficerMenuConfig: MenuItem[] = [
  {
    label: 'Compliance Dashboard',
    route: '/compliance-officer/dashboard',
    icon: 'bi bi-shield-check',
  },
];

export const adminMenuConfig: MenuItem[] = [
  { label: 'Dashboard', route: '/admin/dashboard', icon: 'bi bi-grid-fill' },
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
      { label: 'Add Location', route: '/admin/locations/add', icon: 'bi bi-plus-circle' },
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
      { label: 'Shelves', icon: 'bi bi-grid-3x3', route: '/admin/shelves' },
      { label: 'Stock Adjustment', icon: 'bi bi-sliders', route: '/admin/inventory/adjustment' },
    ],
  },
  {
    label: 'Requisitions',
    icon: 'bi bi-list-check',
    badge: 5,
    children: [
      { label: 'All Requests', icon: 'bi bi-list', route: '/admin/requisitions' },
      { label: 'Pending Approvals', icon: 'bi bi-clock', route: '/admin/requisitions/pending', badge: 5 },
      { label: 'Approved', icon: 'bi bi-check-circle', route: '/admin/requisitions/approved' },
      { label: 'Rejected', icon: 'bi bi-x-circle', route: '/admin/requisitions/rejected' },
      { label: 'Completed', icon: 'bi bi-check2-all', route: '/admin/requisitions/completed' },
      { label: 'SIVs', icon: 'bi bi-file-text', route: '/admin/sivs' },
    ],
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
    label: 'Reports & Settings',
    icon: 'bi bi-gear-fill',
    children: [
      { label: 'Valuation Reports', route: '/admin/reports/valuation', icon: 'bi bi-file-earmark-bar-graph' },
      { label: 'Requisition Reports', route: '/admin/reports/requisition', icon: 'bi bi-file-earmark-text' },
      { label: 'Stock Reports', route: '/admin/reports/stock', icon: 'bi bi-boxes' },
      { label: 'Issuance Reports', route: '/admin/reports/issuance', icon: 'bi bi-file-text' },
      { label: 'Compliance Reports', route: '/admin/reports/compliance', icon: 'bi bi-shield-check' },
      { label: 'Audit Reports', route: '/admin/reports/audit', icon: 'bi bi-file-earmark-spreadsheet' },
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
      { label: 'Add New Item', route: '/storekeeper/catalog/add', icon: 'bi bi-plus-circle' },
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
  { label: 'Catalog Items', route: '/employee/dashboard/catalog-items', icon: 'bi bi-boxes' },
  { label: 'My Requests', route: '/employee/dashboard/my-requests', icon: 'bi bi-card-list' },
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
