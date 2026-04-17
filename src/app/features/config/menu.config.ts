export interface MenuItem {
  label: string;
  route?: string;
  icon: string;
  permission?: string;
  role?: string;
  children?: MenuItem[];
}

export const menuConfig: MenuItem[] = [
  {
    label: 'Dashboard',
    route: '/dashboard',
    icon: 'fas fa-tachometer-alt',
    permission: 'Permissions.Dashboard.View'
  },
  {
    label: 'Catalog',
    icon: 'fas fa-book',
    children: [
      {
        label: 'Categories',
        route: '/catalog/categories',
        icon: 'fas fa-folder',
        permission: 'Permissions.Categories.View'
      },
      {
        label: 'Items',
        route: '/catalog/items',
        icon: 'fas fa-boxes',
        permission: 'Permissions.Items.View'
      }
    ]
  },
  {
    label: 'Property Management',
    icon: 'fas fa-building',
    children: [
      {
        label: 'Properties',
        route: '/property-management/properties',
        icon: 'fas fa-building',
        permission: 'Permissions.Properties.View'
      },
      {
        label: 'Property Types',
        route: '/property-management/property-types',
        icon: 'fas fa-tag',
        permission: 'Permissions.PropertyTypes.View'
      },
      {
        label: 'Property Categories',
        route: '/property-management/property-categories',
        icon: 'fas fa-layer-group',
        permission: 'Permissions.PropertyCategories.View'
      },
      {
        label: 'Locations',
        route: '/property-management/locations',
        icon: 'fas fa-map-marker-alt',
        permission: 'Permissions.Locations.View'
      },
      {
        label: 'Safety Boxes',
        route: '/property-management/safety-boxes',
        icon: 'fas fa-lock',
        permission: 'Permissions.SafetyBoxes.View'
      }
    ]
  },
  {
    label: 'Storage',
    icon: 'fas fa-warehouse',
    children: [
      {
        label: 'Warehouses',
        route: '/storage/warehouses',
        icon: 'fas fa-warehouse',
        permission: 'Permissions.Warehouses.View'
      },
      {
        label: 'Shelf Locations',
        route: '/storage/shelf-locations',
        icon: 'fas fa-archive',
        permission: 'Permissions.ShelfLocations.View'
      },
      {
        label: 'Inventory Stock',
        route: '/storage/inventory',
        icon: 'fas fa-cubes',
        permission: 'Permissions.Inventory.View'
      },
      {
        label: 'Stock Ledger',
        route: '/storage/stock-ledger',
        icon: 'fas fa-book',
        permission: 'Permissions.StockLedger.View'
      }
    ]
  },
  {
    label: 'Receiving',
    icon: 'fas fa-truck',
    children: [
      {
        label: 'Suppliers',
        route: '/receiving/suppliers',
        icon: 'fas fa-truck',
        permission: 'Permissions.Suppliers.View'
      },
      {
        label: 'Receiving Notes',
        route: '/receiving/receiving-notes',
        icon: 'fas fa-clipboard-list',
        permission: 'Permissions.Receiving.View'
      },
      {
        label: 'Inspections',
        route: '/receiving/inspections',
        icon: 'fas fa-search',
        permission: 'Permissions.Receiving.Inspect'
      }
    ]
  },
  {
    label: 'Requisition',
    icon: 'fas fa-clipboard-list',
    children: [
      {
        label: 'Service Requests',
        route: '/requisition/service-requests',
        icon: 'fas fa-file-alt',
        permission: 'Permissions.Requisitions.View'
      },
      {
        label: 'Store Issue Vouchers',
        route: '/requisition/store-issue-vouchers',
        icon: 'fas fa-receipt',
        permission: 'Permissions.Requisitions.View'
      }
    ]
  },
  {
    label: 'Transfer & Return',
    icon: 'fas fa-exchange-alt',
    children: [
      {
        label: 'Transfer Records',
        route: '/transfer-return/transfer-records',
        icon: 'fas fa-arrow-right-arrow-left',
        permission: 'Permissions.TransferReturn.View'
      },
      {
        label: 'Return Requests',
        route: '/transfer-return/return-requests',
        icon: 'fas fa-undo',
        permission: 'Permissions.TransferReturn.View'
      }
    ]
  },
  {
    label: 'Disposal',
    route: '/disposal',
    icon: 'fas fa-trash-alt',
    permission: 'Permissions.Disposal.View'
  },
  {
    label: 'Workflow',
    icon: 'fas fa-project-diagram',
    children: [
      {
        label: 'Approval Workflows',
        route: '/workflow/approval-workflows',
        icon: 'fas fa-diagram-project',
        permission: 'Permissions.Workflow.View'
      },
      {
        label: 'Approvers',
        route: '/workflow/approvers',
        icon: 'fas fa-users',
        permission: 'Permissions.Workflow.View'
      }
    ]
  },
  {
    label: 'Reports',
    icon: 'fas fa-chart-bar',
    children: [
      {
        label: 'Inventory Valuation',
        route: '/reports/inventory',
        icon: 'fas fa-chart-line',
        permission: 'Permissions.Reports.View'
      },
      {
        label: 'Disposal Report',
        route: '/reports/disposal',
        icon: 'fas fa-chart-pie',
        permission: 'Permissions.Reports.View'
      },
      {
        label: 'Stock Movement',
        route: '/reports/stock-movement',
        icon: 'fas fa-chart-area',
        permission: 'Permissions.Reports.View'
      },
      {
        label: 'Requisition History',
        route: '/reports/requisition',
        icon: 'fas fa-chart-simple',
        permission: 'Permissions.Reports.View'
      },
      {
        label: 'Property Valuation',
        route: '/reports/property',
        icon: 'fas fa-chart-column',
        permission: 'Permissions.Reports.View'
      }
    ]
  },
  {
    label: 'Administration',
    icon: 'fas fa-users-cog',
    role: 'Admin',
    children: [
      {
        label: 'Employees',
        route: '/admin/employees',
        icon: 'fas fa-user-tie',
        permission: 'Permissions.Employees.View'
      },
      {
        label: 'Users',
        route: '/admin/users',
        icon: 'fas fa-user',
        permission: 'Permissions.Users.View'
      },
      {
        label: 'Roles',
        route: '/admin/roles',
        icon: 'fas fa-user-shield',
        permission: 'Permissions.Roles.View'
      }
    ]
  },
  {
    label: 'Common',
    icon: 'fas fa-cogs',
    children: [
      {
        label: 'Notifications',
        route: '/notifications',
        icon: 'fas fa-bell',
        permission: 'Permissions.Notifications.View'
      },
      {
        label: 'Documents',
        route: '/documents',
        icon: 'fas fa-file',
        permission: 'Permissions.Documents.View'
      },
      {
        label: 'Audit Trail',
        route: '/audit-trail',
        icon: 'fas fa-history',
        permission: 'Permissions.AuditTrail.View'
      }
    ]
  }
];