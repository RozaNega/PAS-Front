export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: 'Auth/login',
    REGISTER: 'Auth/register',
    LOGOUT: 'Auth/logout',
    REFRESH_TOKEN: 'Auth/refresh-token',
    CHANGE_PASSWORD: 'Auth/change-password',
    FORGOT_PASSWORD: 'Auth/forgot-password',
    RESET_PASSWORD: 'Auth/reset-password'
  },

  // Dashboard
  DASHBOARD: {
    STATISTICS: 'Dashboard/statistics'
  },

  // Catalog
  CATEGORIES: {
    GET_ALL: 'Categories',
    GET_BY_ID: (id: string) => `Categories/${id}`,
    CREATE: 'Categories',
    UPDATE: (id: string) => `Categories/${id}`,
    DELETE: (id: string) => `Categories/${id}`,
    GET_HIERARCHY: 'Categories/hierarchy'
  },

  ITEMS: {
    GET_ALL: 'ItemMasters',
    GET_BY_ID: (id: string) => `ItemMasters/${id}`,
    CREATE: 'ItemMasters',
    UPDATE: (id: string) => `ItemMasters/${id}`,
    DELETE: (id: string) => `ItemMasters/${id}`,
    BY_CATEGORY: (categoryId: string) => `ItemMasters/by-category/${categoryId}`,
    LOW_STOCK: 'ItemMasters/low-stock'
  },

  // Property Management
  PROPERTIES: {
    GET_ALL: 'Properties',
    GET_BY_ID: (id: string) => `Properties/${id}`,
    CREATE: 'Properties',
    UPDATE: (id: string) => `Properties/${id}`,
    DELETE: (id: string) => `Properties/${id}`,
    TRANSFER: (id: string) => `Properties/${id}/transfer`,
    BY_LOCATION: (locationId: string) => `Properties/by-location/${locationId}`
  },

  PROPERTY_TYPES: {
    GET_ALL: 'PropertyTypes',
    GET_BY_ID: (id: string) => `PropertyTypes/${id}`,
    CREATE: 'PropertyTypes',
    UPDATE: (id: string) => `PropertyTypes/${id}`,
    DELETE: (id: string) => `PropertyTypes/${id}`
  },

  PROPERTY_CATEGORIES: {
    GET_ALL: 'PropertyCategories',
    GET_BY_ID: (id: string) => `PropertyCategories/${id}`,
    CREATE: 'PropertyCategories',
    UPDATE: (id: string) => `PropertyCategories/${id}`,
    DELETE: (id: string) => `PropertyCategories/${id}`
  },

  LOCATIONS: {
    GET_ALL: 'Locations',
    GET_BY_ID: (id: string) => `Locations/${id}`,
    CREATE: 'Locations',
    UPDATE: (id: string) => `Locations/${id}`,
    DELETE: (id: string) => `Locations/${id}`
  },

  SAFETY_BOXES: {
    GET_ALL: 'SafetyBoxes',
    GET_BY_ID: (id: string) => `SafetyBoxes/${id}`,
    CREATE: 'SafetyBoxes',
    UPDATE: (id: string) => `SafetyBoxes/${id}`,
    DELETE: (id: string) => `SafetyBoxes/${id}`,
    ADD_SHELF: (id: string) => `SafetyBoxes/${id}/shelves`
  },

  // Storage
  WAREHOUSES: {
    GET_ALL: 'Warehouses',
    GET_BY_ID: (id: string) => `Warehouses/${id}`,
    CREATE: 'Warehouses',
    UPDATE: (id: string) => `Warehouses/${id}`,
    DELETE: (id: string) => `Warehouses/${id}`
  },

  SHELF_LOCATIONS: {
    GET_ALL: 'ShelfLocations',
    GET_BY_ID: (id: string) => `ShelfLocations/${id}`,
    CREATE: 'ShelfLocations',
    UPDATE: (id: string) => `ShelfLocations/${id}`,
    DELETE: (id: string) => `ShelfLocations/${id}`
  },

  INVENTORY_STOCK: {
    GET_ALL: 'InventoryStock',
    BY_SHELF: (shelfId: string) => `InventoryStock/by-shelf/${shelfId}`,
    BY_ITEM: (itemId: string) => `InventoryStock/by-item/${itemId}`,
    RESERVE: 'InventoryStock/reserve',
    RELEASE: 'InventoryStock/release',
    ADJUST: 'InventoryStock/adjust'
  },

  STOCK_LEDGER: {
    GET_ALL: 'StockLedger',
    BY_ITEM: (itemId: string) => `StockLedger/by-item/${itemId}`,
    BY_DATE: 'StockLedger/by-date'
  },

  // Receiving
  SUPPLIERS: {
    GET_ALL: 'Suppliers',
    GET_BY_ID: (id: string) => `Suppliers/${id}`,
    CREATE: 'Suppliers',
    UPDATE: (id: string) => `Suppliers/${id}`,
    DELETE: (id: string) => `Suppliers/${id}`
  },

  RECEIVING_NOTES: {
    GET_ALL: 'ReceivingNotes',
    GET_BY_ID: (id: string) => `ReceivingNotes/${id}`,
    CREATE: 'ReceivingNotes',
    DELETE: (id: string) => `ReceivingNotes/${id}`,
    APPROVE: (id: string) => `ReceivingNotes/${id}/approve`
  },

  INSPECTIONS: {
    GET_ALL: 'Inspections',
    GET_BY_ID: (id: string) => `Inspections/${id}`,
    CREATE: 'Inspections',
    DELETE: (id: string) => `Inspections/${id}`
  },

  // Requisition
  SERVICE_REQUESTS: {
    GET_ALL: 'ServiceRequests',
    GET_BY_ID: (id: string) => `ServiceRequests/${id}`,
    CREATE: 'ServiceRequests',
    UPDATE: (id: string) => `ServiceRequests/${id}`,
    DELETE: (id: string) => `ServiceRequests/${id}`,
    APPROVE: (id: string) => `ServiceRequests/${id}/approve`,
    REJECT: (id: string) => `ServiceRequests/${id}/reject`,
    ISSUE: (id: string) => `ServiceRequests/${id}/issue`
  },

  STORE_ISSUE_VOUCHERS: {
    GET_ALL: 'StoreIssueVouchers',
    GET_BY_ID: (id: string) => `StoreIssueVouchers/${id}`,
    CREATE: 'StoreIssueVouchers',
    DELETE: (id: string) => `StoreIssueVouchers/${id}`
  },

  // Transfer & Return
  TRANSFER_RECORDS: {
    GET_ALL: 'TransferRecords',
    GET_BY_ID: (id: string) => `TransferRecords/${id}`,
    CREATE: 'TransferRecords',
    DELETE: (id: string) => `TransferRecords/${id}`,
    APPROVE: (id: string) => `TransferRecords/${id}/approve`
  },

  RETURN_REQUESTS: {
    GET_ALL: 'ReturnMaterialRequests',
    GET_BY_ID: (id: string) => `ReturnMaterialRequests/${id}`,
    CREATE: 'ReturnMaterialRequests',
    DELETE: (id: string) => `ReturnMaterialRequests/${id}`
  },

  // Disposal
  DISPOSAL_RECORDS: {
    GET_ALL: 'DisposalRecords',
    GET_BY_ID: (id: string) => `DisposalRecords/${id}`,
    CREATE: 'DisposalRecords',
    APPROVE: (id: string) => `DisposalRecords/${id}/approve`
  },

  // Workflow
  APPROVAL_WORKFLOWS: {
    GET_ALL: 'ApprovalWorkflows',
    GET_BY_ID: (id: string) => `ApprovalWorkflows/${id}`,
    CREATE: 'ApprovalWorkflows',
    UPDATE: (id: string) => `ApprovalWorkflows/${id}`,
    DELETE: (id: string) => `ApprovalWorkflows/${id}`
  },

  APPROVERS: {
    BY_WORKFLOW: (workflowId: string) => `Approvers/by-workflow/${workflowId}`,
    ASSIGN: 'Approvers/assign',
    REMOVE: (id: string) => `Approvers/${id}`
  },

  // Reports
  REPORTS: {
    INVENTORY_VALUATION: 'Reports/InventoryReports/valuation',
    DISPOSAL: 'Reports/DisposalReports',
    STOCK_MOVEMENT: 'Reports/StockMovementReports',
    REQUISITION_HISTORY: 'Reports/RequisitionReports',
    PROPERTY_VALUATION: 'Reports/PropertyReports/valuation',
    PROPERTY_ISSUANCE: 'Reports/PropertyReports/issuance'
  },

  // Common
  NOTIFICATIONS: {
    GET_ALL: 'Notifications',
    UNREAD_COUNT: 'Notifications/unread-count',
    MARK_AS_READ: (id: string) => `Notifications/${id}/read`,
    MARK_ALL_READ: 'Notifications/read-all'
  },

  DOCUMENTS: {
    BY_ENTITY: 'Documents/by-entity',
    GET_BY_ID: (id: string) => `Documents/${id}`,
    UPLOAD: 'Documents/upload',
    DOWNLOAD: (id: string) => `Documents/${id}/download`,
    DELETE: (id: string) => `Documents/${id}`
  },

  AUDIT_TRAILS: {
    GET_ALL: 'AuditTrails',
    BY_ENTITY: 'AuditTrails/by-entity'
  },

  // Administration
  EMPLOYEES: {
    GET_ALL: 'Employees',
    GET_BY_ID: (id: string) => `Employees/${id}`,
    CREATE: 'Employees',
    UPDATE: (id: string) => `Employees/${id}`,
    DELETE: (id: string) => `Employees/${id}`,
    BY_USER: (userId: string) => `Employees/by-user/${userId}`
  },

  USERS: {
    GET_ALL: 'Users',
    GET_BY_ID: (id: string) => `Users/${id}`,
    CREATE: 'Users',
    UPDATE: (id: string) => `Users/${id}`,
    DELETE: (id: string) => `Users/${id}`,
    ACTIVATE: (id: string) => `Users/${id}/activate`,
    DEACTIVATE: (id: string) => `Users/${id}/deactivate`
  },

  ROLES: {
    GET_ALL: 'Roles',
    BY_USER: (userId: string) => `Roles/user/${userId}`,
    CREATE: 'Roles',
    UPDATE: (id: string) => `Roles/${id}`,
    DELETE: (id: string) => `Roles/${id}`
  }
};