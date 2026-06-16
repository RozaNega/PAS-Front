import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { AuthGuard } from './core/guards/auth.guard';

// User Management Routes
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'landing',
  },
  {
    path: 'dashboard',
    pathMatch: 'full',
    redirectTo: 'employee/dashboard',
  },
  {
    path: 'dashboard/requests/create',
    pathMatch: 'full',
    redirectTo: 'employee/requests/create',
  },
  {
    path: 'admin',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/pages/admin/admin-dashboard.component').then(m => m.AdminDashboardComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/dashboard/pages/admin-profile/admin-profile.component').then(
            (m) => m.AdminProfileComponent,
          ),
      },
      // Property Management
      {
        path: 'properties',
        loadComponent: () => import('./features/property-management/properties/pages/property-list/property-list.component').then(m => m.PropertyListComponent),
      },
      {
        path: 'properties/add',
        loadComponent: () => import('./features/property-management/properties/pages/property-form/property-form.component').then(m => m.PropertyFormComponent),
      },
      {
        path: 'properties/types',
        loadComponent: () => import('./features/property-management/property-types/pages/property-type-list/property-type-list.component').then(m => m.PropertyTypeListComponent),
      },
      {
        path: 'properties/categories',
        loadComponent: () => import('./features/property-management/property-categories/pages/property-category-list/property-category-list.component').then(m => m.PropertyCategoryListComponent),
      },
      {
        path: 'properties/valuations',
        loadComponent: () => import('./features/property-management/valuations/pages/valuations-list/valuations-list.component').then(m => m.ValuationsListComponent),
      },
      {
        path: 'properties/transfers',
        loadComponent: () => import('./features/property-management/transfers/pages/pending-transfers/pending-transfers.component').then(m => m.PendingTransfersComponent),
      },
      // Locations & Safety Boxes
      {
        path: 'locations',
        loadComponent: () => import('./features/property-management/locations/pages/location-list/location-list.component').then(m => m.LocationListComponent),
      },
      {
        path: 'locations/add',
        loadComponent: () => import('./features/property-management/locations/pages/location-list/location-list.component').then(m => m.LocationListComponent),
      },
      {
        path: 'safety-boxes',
        loadComponent: () => import('./features/property-management/safety-boxes/pages/safety-box-list/safety-box-list.component').then(m => m.SafetyBoxListComponent),
      },
      {
        path: 'shelves',
        loadComponent: () => import('./features/property-management/shelves/pages/shelf-list/shelf-list.component').then(m => m.ShelfListComponent),
      },
      // Store & Inventory
      {
        path: 'inventory',
        loadComponent: () => import('./features/store-inventory/stock-overview/pages/stock-overview.component').then(m => m.StockOverviewComponent),
      },
      {
        path: 'inventory/current-stock',
        loadComponent: () => import('./features/store-inventory/current-stock/pages/current-stock.component').then(m => m.CurrentStockComponent),
      },
      {
        path: 'inventory/movements',
        loadComponent: () => import('./features/store-inventory/stock-movements/pages/stock-movements.component').then(m => m.StockMovementsComponent),
      },
      {
        path: 'inventory/low-stock',
        loadComponent: () => import('./features/store-inventory/low-stock/pages/low-stock.component').then(m => m.LowStockComponent),
      },
      {
        path: 'inventory/adjustment',
        loadComponent: () => import('./features/store-inventory/stock-adjustment/pages/stock-adjustment.component').then(m => m.StockAdjustmentComponent),
      },
      {
        path: 'inventory/bulk-adjust',
        loadComponent: () => import('./features/inventory/pages/bulk-adjust-stock/bulk-adjust-stock.component').then(m => m.BulkAdjustStockComponent),
      },
      {
        path: 'inventory/transfer',
        loadComponent: () => import('./features/store-inventory/stock-transfer/pages/stock-transfer.component').then(m => m.StockTransferComponent),
      },
      {
        path: 'warehouses',
        loadComponent: () => import('./features/store-inventory/warehouses/pages/warehouses.component').then(m => m.WarehousesComponent),
      },
      {
        path: 'shelf-locations',
        loadComponent: () => import('./features/store-inventory/shelf-locations/pages/shelf-locations.component').then(m => m.ShelfLocationsComponent),
      },
      // Requisitions (Unified Dashboard)
      {
        path: 'requisitions',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/requisitions/requisition-dashboard/pages/requisition-dashboard.component').then(
                (m) => m.RequisitionDashboardComponent,
              ),
          },
          {
            path: 'pending',
            loadComponent: () =>
              import('./features/requisition/service-requests/pages/service-request-list/service-request-list.component').then(
                (m) => m.ServiceRequestListComponent,
              ),
            data: { initialStatus: 'Pending' },
          },
          {
            path: 'approved',
            loadComponent: () =>
              import('./features/requisition/service-requests/pages/service-request-list/service-request-list.component').then(
                (m) => m.ServiceRequestListComponent,
              ),
            data: { initialStatus: 'Approved' },
          },
          {
            path: 'rejected',
            loadComponent: () =>
              import('./features/requisition/service-requests/pages/service-request-list/service-request-list.component').then(
                (m) => m.ServiceRequestListComponent,
              ),
            data: { initialStatus: 'Rejected' },
          },
          {
            path: 'completed',
            loadComponent: () =>
              import('./features/requisition/service-requests/pages/service-request-list/service-request-list.component').then(
                (m) => m.ServiceRequestListComponent,
              ),
            data: { initialStatus: 'Completed' },
          },
          {
            path: 'create',
            loadComponent: () =>
              import('./features/requisition/service-requests/pages/service-request-form/service-request-form.component').then(
                (m) => m.ServiceRequestFormComponent,
              ),
          },
          {
            path: ':id/edit',
            loadComponent: () =>
              import('./features/requisition/service-requests/pages/service-request-form/service-request-form.component').then(
                (m) => m.ServiceRequestFormComponent,
              ),
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./features/requisition/service-requests/pages/service-request-detail/service-request-detail.component').then(
                (m) => m.ServiceRequestDetailComponent,
              ),
          },
        ],
      },
      {
        path: 'sivs/new',
        loadComponent: () =>
          import('./features/requisition/sivs/pages/siv-create/siv-create-page.component').then((m) => m.SivCreatePageComponent),
      },
      {
        path: 'sivs',
        loadComponent: () =>
          import('./features/requisition/sivs/pages/siv-list/siv-list.component').then((m) => m.SivListComponent),
      },
      {
        path: 'sivs/:id',
        loadComponent: () =>
          import('./features/requisition/sivs/pages/siv-detail/siv-detail-page.component').then((m) => m.SivDetailPageComponent),
      },
      {
        path: 'requisition',
        loadChildren: () =>
          import('./features/requisition/requisition.module').then((m) => m.RequisitionModule),
      },
      {
        path: 'requisition/service-requests/new',
        loadComponent: () =>
          import('./features/requisition/service-requests/pages/service-request-form/service-request-form.component').then(
            (m) => m.ServiceRequestFormComponent,
          ),
      },
      {
        path: 'requisition/service-requests/item-management/:requestId',
        loadComponent: () =>
          import('./features/requisition/service-requests/pages/item-management/item-management.component').then(
            (m) => m.ItemManagementComponent,
          ),
      },
      // Receiving
      {
        path: 'receiving/grn',
        loadComponent: () => import('./features/receiving/grn/pages/grn.component').then(m => m.GrnComponent),
      },
      {
        path: 'receiving/inspection',
        loadComponent: () => import('./features/receiving/pending-inspection/pages/pending-inspection.component').then(m => m.PendingInspectionComponent),
      },
      {
        path: 'receiving/logs',
        loadComponent: () => import('./features/receiving/inspection-logs/pages/inspection-logs.component').then(m => m.InspectionLogsComponent),
      },
      {
        path: 'receiving/suppliers',
        loadComponent: () => import('./features/receiving/suppliers/pages/supplier-list/supplier-list.component').then(m => m.SupplierListComponent),
      },
      {
        path: 'receiving/suppliers/new',
        loadComponent: () => import('./features/receiving/suppliers/pages/supplier-form/supplier-form.component').then(m => m.SupplierFormComponent),
      },
      {
        path: 'receiving/suppliers/edit/:id',
        loadComponent: () => import('./features/receiving/suppliers/pages/supplier-form/supplier-form.component').then(m => m.SupplierFormComponent),
      },
      // Reports
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports-dashboard/reports-dashboard.component').then(m => m.ReportsDashboardComponent),
      },
      {
        path: 'reports/receiving',
        redirectTo: '/admin/reports',
        pathMatch: 'full',
      },
      {
        path: 'settings',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/settings/system-settings.component').then(m => m.SystemSettingsComponent),
          },
          {
            path: 'backup',
            loadComponent: () => import('./features/settings/backup.component').then(m => m.BackupComponent),
          },
        ],
      },
      {
        path: 'notifications',
        loadComponent: () => import('./features/common/notifications/pages/notification-list/notification-list.component').then(m => m.NotificationListComponent),
      },
      {
        path: 'users',
        loadComponent: () => import('./features/user-management/pages/user-list/user-list.component').then(m => m.UserListComponent),
      },
      {
        path: 'users/add',
        loadComponent: () => import('./features/user-management/pages/add-user/add-user.component').then(m => m.AddUserComponent),
      },
      {
        path: 'users/pending-registrations',
        loadComponent: () => import('./features/user-management/pages/pending-registrations/pending-registrations.component').then(m => m.PendingRegistrationsComponent),
      },
      {
        path: 'users/roles',
        loadComponent: () => import('./features/user-management/pages/roles-permissions/roles-permissions.component').then(m => m.RolesPermissionsComponent),
      },
      {
        path: 'users/employees',
        loadComponent: () => import('./features/user-management/pages/employee-directory/employee-directory.component').then(m => m.EmployeeDirectoryComponent),
      },
      {
        path: 'users/employees/add',
        loadComponent: () => import('./features/user-management/pages/add-employee/add-employee.component').then(m => m.AddEmployeeComponent),
      },
      {
        path: 'users/activity',
        loadComponent: () => import('./features/user-management/pages/activity-logs/activity-logs.component').then(m => m.ActivityLogsComponent),
      },
    ],
  },
  {
    path: 'storekeeper',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/pages/storekeeper/storekeeper-dashboard.component').then(m => m.StorekeeperDashboardComponent),
      },
      // Inventory Management
      {
        path: 'inventory',
        loadComponent: () => import('./features/store-inventory/current-stock/pages/current-stock.component').then(m => m.CurrentStockComponent),
      },
      {
        path: 'inventory/movements',
        loadComponent: () => import('./features/store-inventory/stock-movements/pages/stock-movements.component').then(m => m.StockMovementsComponent),
      },
      {
        path: 'inventory/low-stock',
        loadComponent: () => import('./features/store-inventory/low-stock/pages/low-stock.component').then(m => m.LowStockComponent),
      },
      {
        path: 'inventory/adjustment',
        loadComponent: () => import('./features/store-inventory/stock-adjustment/pages/stock-adjustment.component').then(m => m.StockAdjustmentComponent),
      },
      {
        path: 'inventory/bulk-adjust',
        loadComponent: () => import('./features/inventory/pages/bulk-adjust-stock/bulk-adjust-stock.component').then(m => m.BulkAdjustStockComponent),
      },
      {
        path: 'inventory/transfer',
        loadComponent: () => import('./features/store-inventory/stock-transfer/pages/stock-transfer.component').then(m => m.StockTransferComponent),
      },
      // Warehouse
      {
        path: 'warehouse',
        loadComponent: () => import('./features/store-inventory/warehouse-view/pages/warehouse-view.component').then(m => m.WarehouseViewComponent),
      },
      {
        path: 'warehouse/shelves',
        loadComponent: () => import('./features/store-inventory/shelf-management/pages/shelf-management.component').then(m => m.ShelfManagementComponent),
      },
      {
        path: 'warehouse/warehouses',
        loadComponent: () => import('./features/store-inventory/warehouses/pages/warehouses.component').then(m => m.WarehousesComponent),
      },
      {
        path: 'warehouse/scanner',
        loadComponent: () => import('./features/pages/generic-page/generic-page.component').then(m => m.GenericPageComponent),
        data: { pageTitle: 'Barcode & QR Scanner', pageDescription: 'Scan barcodes and QR codes for items', icon: 'bi bi-upc-scan', pageType: 'scanner' },
      },
      // Goods Receiving
      {
        path: 'receiving',
        loadComponent: () => import('./features/store-inventory/receiving/pages/receiving.component').then(m => m.ReceivingComponent),
      },
      // Issuing
      {
        path: 'issuing',
        loadComponent: () => import('./features/store-inventory/issuance/pages/issuance.component').then(m => m.IssuanceComponent),
      },
      // Disposal
      {
        path: 'disposal',
        loadComponent: () => import('./features/store-inventory/disposal/pages/disposal.component').then(m => m.DisposalComponent),
      },
      // Item Catalog
      {
        path: 'catalog',
        loadComponent: () => import('./features/store-inventory/item-catalog/pages/item-catalog.component').then(m => m.ItemCatalogComponent),
      },
      {
        path: 'catalog/categories',
        loadComponent: () => import('./features/store-inventory/categories/pages/categories.component').then(m => m.CategoriesComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/dashboard/pages/storekeeper-profile/storekeeper-profile.component').then(
            (m) => m.StorekeeperProfileComponent,
          ),
      },
      // Reports (unified page with tabs)
      {
        path: 'reports',
        loadComponent: () => import('./features/store-inventory/reports-page/reports-page.component').then(m => m.ReportsPageComponent),
      },
      {
        path: 'notifications',
        loadComponent: () => import('./features/common/notifications/pages/notification-list/notification-list.component').then(m => m.NotificationListComponent),
      },
    ],
  },

  {
    path: 'landing',
    loadComponent: () => import('./pages/landing/landing').then((m) => m.Landing),
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth-module').then((m) => m.AuthModule),
  },
  {
    path: 'catalog',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./features/catalog/catalog-module').then((m) => m.CatalogModule),
      },
    ],
  },
  {
    path: 'employee',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/pages/employee-dashboard/employee-dashboard.component').then(
            (m) => m.EmployeeDashboardComponent,
          ),
      },
      {
        path: 'dashboard/my-requests',
        loadComponent: () =>
          import('./features/dashboard/pages/employee-dashboard/employee-dashboard.component').then(
            (m) => m.EmployeeDashboardComponent,
          ),
      },
      {
        path: 'dashboard/my-requests-summary',
        loadComponent: () =>
          import('./features/dashboard/pages/requests-summary-page/requests-summary-page.component').then(
            (m) => m.RequestsSummaryPageComponent,
          ),
      },
      {
        path: 'dashboard/my-activity',
        loadComponent: () =>
          import('./features/dashboard/pages/activity-page/activity-page.component').then(
            (m) => m.ActivityPageComponent,
          ),
      },
      {
        path: 'dashboard/profile',
        loadComponent: () =>
          import('./features/dashboard/pages/employee-dashboard/employee-dashboard.component').then(
            (m) => m.EmployeeDashboardComponent,
          ),
      },
      {
        path: 'dashboard/notifications',
        loadComponent: () =>
          import('./features/dashboard/pages/notifications-page/notifications-page.component').then(
            (m) => m.NotificationsPageComponent,
          ),
      },
      {
        path: 'dashboard/catalog-items',
        loadComponent: () =>
          import('./features/dashboard/pages/employee-dashboard/employee-dashboard.component').then(
            (m) => m.EmployeeDashboardComponent,
          ),
      },
      {
        path: 'dashboard/new-request',
        loadComponent: () =>
          import('./features/dashboard/pages/employee-dashboard/employee-dashboard.component').then(
            (m) => m.EmployeeDashboardComponent,
          ),
      },
      {
        path: 'requests/create',
        loadComponent: () =>
          import('./features/dashboard/pages/employee-requests/create-request.component').then(
            (m) => m.CreateRequestComponent,
          ),
      },
      {
        path: 'requests/pending',
        loadComponent: () =>
          import('./features/dashboard/pages/employee-requests/pending-requests.component').then(
            (m) => m.PendingRequestsComponent,
          ),
      },
      {
        path: 'requests/approved',
        loadComponent: () =>
          import('./features/dashboard/pages/employee-requests/approved-requests.component').then(
            (m) => m.ApprovedRequestsComponent,
          ),
      },
      {
        path: 'requests/rejected',
        loadComponent: () =>
          import('./features/dashboard/pages/employee-requests/rejected-requests.component').then(
            (m) => m.RejectedRequestsComponent,
          ),
      },
      {
        path: 'requests/completed',
        loadComponent: () =>
          import('./features/dashboard/pages/employee-requests/completed-requests.component').then(
            (m) => m.CompletedRequestsComponent,
          ),
      },
      {
        path: 'requests/sivs',
        loadComponent: () =>
          import('./features/dashboard/pages/employee-requests/my-sivs.component').then(
            (m) => m.MySIVsComponent,
          ),
      },
      {
        path: 'returns',
        loadComponent: () =>
          import('./features/dashboard/pages/employee-returns/my-returns.component').then(
            (m) => m.MyReturnsComponent,
          ),
      },
      {
        path: 'returns/create',
        loadComponent: () =>
          import('./features/dashboard/pages/employee-returns/create-return.component').then(
            (m) => m.CreateReturnComponent,
          ),
      },
    ],
  },
  {
    path: 'manager',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/pages/manager-approval-dashboard/manager-approval-dashboard.component').then(
            (m) => m.ManagerApprovalDashboardComponent,
          ),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/dashboard/pages/manager-notifications-page/manager-notifications-page.component').then(
            (m) => m.ManagerNotificationsPageComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/dashboard/pages/decision-profile-page/decision-profile-page.component').then(
            (m) => m.DecisionProfilePageComponent,
          ),
      },
      {
        path: 'approvals/pending',
        loadComponent: () =>
          import('./features/dashboard/pages/manager-approvals/pending-approvals.component').then(
            (m) => m.PendingApprovalsComponent,
          ),
      },
      {
        path: 'approvals/decisions',
        loadComponent: () =>
          import('./features/dashboard/pages/manager-approvals/my-decisions.component').then(
            (m) => m.MyDecisionsComponent,
          ),
      },
      {
        path: 'approvals/history',
        loadComponent: () =>
          import('./features/dashboard/pages/manager-approvals/approval-history.component').then(
            (m) => m.ApprovalHistoryComponent,
          ),
      },
      {
        path: 'requests/all',
        loadComponent: () =>
          import('./features/dashboard/pages/manager-requests/all-requests.component').then(
            (m) => m.AllRequestsComponent,
          ),
      },
      {
        path: 'requests/pending',
        loadComponent: () =>
          import('./features/dashboard/pages/manager-requests/pending-requests.component').then(
            (m) => m.PendingRequestsComponent,
          ),
      },
      {
        path: 'requests/approved',
        loadComponent: () =>
          import('./features/dashboard/pages/manager-requests/approved-requests.component').then(
            (m) => m.ApprovedRequestsComponent,
          ),
      },
      {
        path: 'requests/rejected',
        loadComponent: () =>
          import('./features/dashboard/pages/manager-requests/rejected-requests.component').then(
            (m) => m.RejectedRequestsComponent,
          ),
      },
      {
        path: 'requests/issued',
        loadComponent: () =>
          import('./features/dashboard/pages/manager-requests/issued-requests.component').then(
            (m) => m.IssuedRequestsComponent,
          ),
      },
      {
        path: 'sivs/all',
        loadComponent: () =>
          import('./features/dashboard/pages/manager-sivs/all-sivs.component').then(
            (m) => m.AllSIVsComponent,
          ),
      },
      {
        path: 'sivs/pending',
        loadComponent: () =>
          import('./features/dashboard/pages/manager-sivs/pending-sivs.component').then(
            (m) => m.PendingSIVsComponent,
          ),
      },
      {
        path: 'sivs/issued',
        loadComponent: () =>
          import('./features/dashboard/pages/manager-sivs/issued-sivs.component').then(
            (m) => m.IssuedSIVsComponent,
          ),
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import('./features/store-inventory/stock-overview/pages/stock-overview.component').then(
            (m) => m.StockOverviewComponent,
          ),
        canActivate: [AuthGuard],
      },
      {
        path: 'inventory/low-stock',
        loadComponent: () =>
          import('./features/store-inventory/low-stock/pages/low-stock.component').then(
            (m) => m.LowStockComponent,
          ),
        canActivate: [AuthGuard],
      },
      {
        path: 'inventory/movements',
        loadComponent: () =>
          import('./features/store-inventory/stock-movements/pages/stock-movements.component').then(
            (m) => m.StockMovementsComponent,
          ),
        canActivate: [AuthGuard],
      },
      {
        path: 'inventory/ledger',
        loadComponent: () =>
          import('./features/store-inventory/stock-ledger/pages/stock-ledger.component').then(
            (m) => m.StockLedgerComponent,
          ),
        canActivate: [AuthGuard],
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/store-inventory/reports-page/reports-page.component').then(m => m.ReportsPageComponent),
        canActivate: [AuthGuard],
      },
      {
        path: 'workflows/all',
        loadComponent: () =>
          import('./features/dashboard/pages/manager-approvals/all-workflows.component').then(
            (m) => m.AllWorkflowsComponent,
          ),
      },
      {
        path: 'workflows/create',
        loadComponent: () =>
          import('./features/dashboard/pages/manager-approvals/create-workflow.component').then(
            (m) => m.CreateWorkflowComponent,
          ),
      },
      {
        path: 'workflows/approvers',
        loadComponent: () =>
          import('./features/dashboard/pages/approver-matrix-page/approver-matrix-page.component').then(
            (m) => m.ApproverMatrixPageComponent,
          ),
      },
      {
        path: 'reports/dashboard',
        loadComponent: () =>
          import('./features/dashboard/pages/manager-reports/reports-dashboard.component').then(
            (m) => m.ReportsDashboardComponent,
          ),
      },
      {
        path: 'reports/approval',
        redirectTo: '/manager/reports/dashboard',
        pathMatch: 'full',
      },
      {
        path: 'reports/requests',
        redirectTo: '/manager/reports/dashboard',
        pathMatch: 'full',
      },
      {
        path: 'reports/sivs',
        redirectTo: '/manager/reports/dashboard',
        pathMatch: 'full',
      },
      {
        path: 'reports/inventory',
        loadComponent: () =>
          import('./features/store-inventory/reports-page/reports-page.component').then(
            (m) => m.ReportsPageComponent,
          ),
      },
      {
        path: 'audit-trail',
        loadComponent: () =>
          import('./features/dashboard/pages/audit-reference-page/audit-reference-page.component').then(
            (m) => m.AuditReferencePageComponent,
          ),
      },
      {
        path: 'approval-queue',
        loadComponent: () =>
          import('./features/dashboard/pages/approval-queue-page/approval-queue-page.component').then(
            (m) => m.ApprovalQueuePageComponent,
          ),
      },
      {
        path: 'approval-workflow',
        loadComponent: () =>
          import('./features/dashboard/pages/approval-workflow-page/approval-workflow-page.component').then(
            (m) => m.ApprovalWorkflowPageComponent,
          ),
      },
      {
        path: 'approver-matrix',
        loadComponent: () =>
          import('./features/dashboard/pages/approver-matrix-page/approver-matrix-page.component').then(
            (m) => m.ApproverMatrixPageComponent,
          ),
      },
      {
        path: 'decision-reports',
        loadComponent: () =>
          import('./features/dashboard/pages/decision-reports-page/decision-reports-page.component').then(
            (m) => m.DecisionReportsPageComponent,
          ),
      },
      {
        path: 'audit-reference',
        loadComponent: () =>
          import('./features/dashboard/pages/audit-reference-page/audit-reference-page.component').then(
            (m) => m.AuditReferencePageComponent,
          ),
      },
      {
        path: 'requisition',
        loadChildren: () =>
          import('./features/requisition/requisition.module').then((m) => m.RequisitionModule),
      },
      {
        path: 'workflow',
        loadChildren: () =>
          import('./features/workflow/workflow.module').then((m) => m.WorkflowModule),
      },
      {
        path: 'reports',
        loadChildren: () =>
          import('./features/reports/reports.module').then((m) => m.ReportsModule),
      },
      {
        path: 'audit-trail',
        loadChildren: () => import('./features/common/common.module').then((m) => m.CommonModule),
      },
    ],
  },
  {
    path: 'compliance-officer',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/compliance/pages/compliance-dashboard/compliance-dashboard.component').then(
            (m) => m.ComplianceDashboardComponent,
          ),
      },
      {
        path: 'risk-alerts',
        loadComponent: () =>
          import('./features/compliance/pages/risk-alerts-page/risk-alerts-page.component').then(
            (m) => m.RiskAlertsPageComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/compliance/pages/officer-profile-page/officer-profile-page.component').then(
            (m) => m.OfficerProfilePageComponent,
          ),
      },
      {
        path: 'audits/all',
        loadComponent: () =>
          import('./features/dashboard/pages/compliance-audits/all-audits.component').then(
            (m) => m.AllAuditsComponent,
          ),
      },
      {
        path: 'audits/pending',
        loadComponent: () =>
          import('./features/dashboard/pages/compliance-audits/pending-audits.component').then(
            (m) => m.PendingAuditsComponent,
          ),
      },
      {
        path: 'audits/completed',
        loadComponent: () =>
          import('./features/dashboard/pages/compliance-audits/completed-audits.component').then(
            (m) => m.CompletedAuditsComponent,
          ),
      },
      {
        path: 'reports/risk',
        loadComponent: () =>
          import('./features/dashboard/pages/compliance-reports/risk-reports.component').then(
            (m) => m.RiskReportsComponent,
          ),
      },
      {
        path: 'reports/audit',
        loadComponent: () =>
          import('./features/dashboard/pages/compliance-reports/audit-reports.component').then(
            (m) => m.AuditReportsComponent,
          ),
      },
      {
        path: 'reports/status',
        loadComponent: () =>
          import('./features/dashboard/pages/compliance-reports/status-reports.component').then(
            (m) => m.StatusReportsComponent,
          ),
      },
      {
        path: 'reports/disposal',
        loadComponent: () =>
          import('./features/dashboard/pages/compliance-reports/disposal-reports.component').then(
            (m) => m.DisposalReportsComponent,
          ),
      },
      {
        path: 'reports/inspection',
        loadComponent: () =>
          import('./features/dashboard/pages/compliance-reports/inspection-reports.component').then(
            (m) => m.InspectionReportsComponent,
          ),
      },
      {
        path: 'decisions',
        loadComponent: () =>
          import('./features/dashboard/pages/compliance-decisions/decisions.component').then(
            (m) => m.DecisionsComponent,
          ),
      },
      {
        path: 'decisions/approvals',
        loadComponent: () =>
          import('./features/dashboard/pages/compliance-decisions/approval-decisions.component').then(
            (m) => m.ApprovalDecisionsComponent,
          ),
      },
      {
        path: 'decisions/rejections',
        loadComponent: () =>
          import('./features/dashboard/pages/compliance-decisions/rejection-analysis.component').then(
            (m) => m.RejectionAnalysisComponent,
          ),
      },
      {
        path: 'decisions/response-times',
        loadComponent: () =>
          import('./features/dashboard/pages/compliance-decisions/response-times.component').then(
            (m) => m.ResponseTimesComponent,
          ),
      },
      {
        path: 'disposal',
        loadComponent: () =>
          import('./features/dashboard/pages/compliance-records/disposal-records.component').then(
            (m) => m.DisposalRecordsComponent,
          ),
      },
      {
        path: 'inspections',
        loadComponent: () =>
          import('./features/dashboard/pages/compliance-records/inspections.component').then(
            (m) => m.InspectionsComponent,
          ),
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./features/dashboard/pages/compliance-records/documents.component').then(
            (m) => m.DocumentsComponent,
          ),
      },
      {
        path: 'audit-trail',
        loadComponent: () =>
          import('./features/compliance/pages/audit-trail-page/audit-trail-page.component').then(
            (m) => m.AuditTrailPageComponent,
          ),
      },
    ],
  },

  {
    path: 'requisition',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./features/requisition/requisition.module').then((m) => m.RequisitionModule),
      },
    ],
  },
  {
    path: 'storage',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./features/storage/storage-module').then((m) => m.StorageModule),
      },
    ],
  },
  {
    path: 'notifications',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/notifications/pages/notifications-page').then(
            (m) => m.NotificationsPage,
          ),
      },
    ],
  },
  {
    path: 'reports',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./features/reports/reports.module').then((m) => m.ReportsModule),
      },
    ],
  },
  {
    path: 'workflow',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./features/workflow/workflow.module').then((m) => m.WorkflowModule),
      },
    ],
  },
  {
    path: 'audit-trail',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () => import('./features/common/common.module').then((m) => m.CommonModule),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'landing',
  },
];
