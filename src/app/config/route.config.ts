export const ROUTES = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password'
  },
  DASHBOARD: '/dashboard',
  CATALOG: {
    CATEGORIES: '/catalog/categories',
    ITEMS: '/catalog/items'
  },
  PROPERTY_MANAGEMENT: {
    PROPERTIES: '/property-management/properties',
    PROPERTY_TYPES: '/property-management/property-types',
    PROPERTY_CATEGORIES: '/property-management/property-categories',
    LOCATIONS: '/property-management/locations',
    SAFETY_BOXES: '/property-management/safety-boxes'
  },
  STORAGE: {
    WAREHOUSES: '/storage/warehouses',
    SHELF_LOCATIONS: '/storage/shelf-locations',
    INVENTORY: '/storage/inventory',
    STOCK_LEDGER: '/storage/stock-ledger'
  },
  RECEIVING: {
    SUPPLIERS: '/receiving/suppliers',
    RECEIVING_NOTES: '/receiving/receiving-notes',
    INSPECTIONS: '/receiving/inspections'
  },
  REQUISITION: {
    SERVICE_REQUESTS: '/requisition/service-requests',
    STORE_ISSUE_VOUCHERS: '/requisition/store-issue-vouchers'
  },
  TRANSFER_RETURN: {
    TRANSFER_RECORDS: '/transfer-return/transfer-records',
    RETURN_REQUESTS: '/transfer-return/return-requests'
  },
  DISPOSAL: '/disposal',
  WORKFLOW: {
    APPROVAL_WORKFLOWS: '/workflow/approval-workflows',
    APPROVERS: '/workflow/approvers'
  },
  REPORTS: {
    INVENTORY: '/reports/inventory',
    DISPOSAL: '/reports/disposal',
    STOCK_MOVEMENT: '/reports/stock-movement',
    REQUISITION: '/reports/requisition',
    PROPERTY: '/reports/property'
  },
  ADMIN: {
    EMPLOYEES: '/admin/employees',
    USERS: '/admin/users',
    ROLES: '/admin/roles'
  },
  COMMON: {
    NOTIFICATIONS: '/notifications',
    DOCUMENTS: '/documents',
    AUDIT_TRAIL: '/audit-trail'
  }
};