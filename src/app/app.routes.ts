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
      // Requisitions (API-backed)
      {
        path: 'requisitions',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/requisition/service-requests/pages/service-request-list/service-request-list.component').then(
                (m) => m.ServiceRequestListComponent,
              ),
            data: { initialStatus: 'All' },
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
      // Reports & Settings
      {
        path: 'reports/valuation',
        loadComponent: () => import('./features/pages/generic-page/generic-page.component').then(m => m.GenericPageComponent),
        data: { pageTitle: 'Valuation Reports', pageDescription: 'View property valuation reports', icon: 'bi bi-file-earmark-bar-graph', pageType: 'dashboard' },
      },
      {
        path: 'reports/requisition',
        loadComponent: () => import('./features/pages/generic-page/generic-page.component').then(m => m.GenericPageComponent),
        data: { pageTitle: 'Requisition Reports', pageDescription: 'View requisition reports', icon: 'bi bi-file-earmark-text', pageType: 'dashboard' },
      },
      {
        path: 'reports/stock',
        loadComponent: () => import('./features/store-inventory/stock-report/pages/stock-report.component').then(m => m.StockReportComponent),
      },
      {
        path: 'reports/issuance',
        loadComponent: () => import('./features/store-inventory/issuance-report/pages/issuance-report.component').then(m => m.IssuanceReportComponent),
      },
      {
        path: 'reports/receiving',
        loadComponent: () => import('./features/store-inventory/receiving-report/pages/receiving-report.component').then(m => m.ReceivingReportComponent),
      },
      {
        path: 'reports/compliance',
        loadComponent: () => import('./features/pages/generic-page/generic-page.component').then(m => m.GenericPageComponent),
        data: { pageTitle: 'Compliance Reports', pageDescription: 'View compliance reports', icon: 'bi bi-shield-check', pageType: 'dashboard' },
      },
      {
        path: 'reports/audit',
        loadComponent: () => import('./features/pages/generic-page/generic-page.component').then(m => m.GenericPageComponent),
        data: { pageTitle: 'Audit Reports', pageDescription: 'View audit reports', icon: 'bi bi-file-earmark-spreadsheet', pageType: 'dashboard' },
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/pages/generic-page/generic-page.component').then(m => m.GenericPageComponent),
        data: { pageTitle: 'System Settings', pageDescription: 'Configure system settings', icon: 'bi bi-gear', pageType: 'form' },
      },
      {
        path: 'settings/backup',
        loadComponent: () => import('./features/pages/generic-page/generic-page.component').then(m => m.GenericPageComponent),
        data: { pageTitle: 'Backup', pageDescription: 'Manage system backups', icon: 'bi bi-database', pageType: 'backup' },
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
        data: { pageTitle: 'QR Code Scanner', pageDescription: 'Scan QR codes for items', icon: 'bi bi-qr-code-scan', pageType: 'scanner' },
      },
      // Goods Receiving
      {
        path: 'receiving/create',
        loadComponent: () => import('./features/store-inventory/create-grn/pages/create-grn.component').then(m => m.CreateGRNComponent),
      },
      {
        path: 'receiving/pending',
        loadComponent: () => import('./features/store-inventory/pending-grns/pages/pending-grns.component').then(m => m.PendingGRNsComponent),
      },
      {
        path: 'receiving/inspection',
        loadComponent: () => import('./features/store-inventory/inspection-queue/pages/inspection-queue.component').then(m => m.InspectionQueueComponent),
      },
      {
        path: 'receiving/history',
        loadComponent: () => import('./features/store-inventory/receiving-history/pages/receiving-history.component').then(m => m.ReceivingHistoryComponent),
      },
      // Issuing
      {
        path: 'issuing/pending',
        loadComponent: () => import('./features/store-inventory/pending-issues/pages/pending-issues.component').then(m => m.PendingIssuesComponent),
      },
      {
        path: 'issuing/create',
        loadComponent: () => import('./features/store-inventory/create-siv/pages/create-siv.component').then(m => m.CreateSIVComponent),
      },
      {
        path: 'issuing/history',
        loadComponent: () => import('./features/store-inventory/issue-history/pages/issue-history.component').then(m => m.IssueHistoryComponent),
      },
      {
        path: 'issuing/print',
        loadComponent: () => import('./features/store-inventory/print-siv/pages/print-siv.component').then(m => m.PrintSIVComponent),
      },
      // Item Catalog
      {
        path: 'catalog',
        loadComponent: () => import('./features/store-inventory/item-catalog/pages/item-catalog.component').then(m => m.ItemCatalogComponent),
      },
      {
        path: 'catalog/add',
        loadComponent: () => import('./features/store-inventory/add-item/pages/add-item.component').then(m => m.AddItemComponent),
      },
      {
        path: 'catalog/categories',
        loadComponent: () => import('./features/store-inventory/categories/pages/categories.component').then(m => m.CategoriesComponent),
      },
      // Reports
      {
        path: 'reports/stock',
        loadComponent: () => import('./features/store-inventory/stock-report/pages/stock-report.component').then(m => m.StockReportComponent),
      },
      {
        path: 'reports/issuance',
        loadComponent: () => import('./features/store-inventory/issuance-report/pages/issuance-report.component').then(m => m.IssuanceReportComponent),
      },
      {
        path: 'reports/receiving',
        loadComponent: () => import('./features/store-inventory/receiving-report/pages/receiving-report.component').then(m => m.ReceivingReportComponent),
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
        path: 'reports/approval',
        loadComponent: () =>
          import('./features/dashboard/pages/manager-reports/approval-reports.component').then(
            (m) => m.ApprovalReportsComponent,
          ),
      },
      {
        path: 'reports/requests',
        loadComponent: () =>
          import('./features/dashboard/pages/manager-reports/request-reports.component').then(
            (m) => m.RequestReportsComponent,
          ),
      },
      {
        path: 'reports/sivs',
        loadComponent: () =>
          import('./features/dashboard/pages/manager-reports/siv-reports.component').then(
            (m) => m.SIVReportsComponent,
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
    redirectTo: 'employee/dashboard',
  },
];
