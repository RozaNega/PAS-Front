import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'employee/dashboard',
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
    ],
  },
  {
    path: 'manager',
    component: MainLayoutComponent,
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
        path: 'decision-profile',
        loadComponent: () =>
          import('./features/dashboard/pages/decision-profile-page/decision-profile-page.component').then(
            (m) => m.DecisionProfilePageComponent,
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
        path: 'officer-profile',
        loadComponent: () =>
          import('./features/compliance/pages/officer-profile-page/officer-profile-page.component').then(
            (m) => m.OfficerProfilePageComponent,
          ),
      },
      {
        path: 'audit-trail',
        loadComponent: () =>
          import('./features/compliance/pages/audit-trail-page/audit-trail-page.component').then(
            (m) => m.AuditTrailPageComponent,
          ),
      },
      {
        path: 'compliance-reports',
        loadComponent: () =>
          import('./features/compliance/pages/compliance-reports-page/compliance-reports-page.component').then(
            (m) => m.ComplianceReportsPageComponent,
          ),
      },
      {
        path: 'report-preview',
        loadComponent: () =>
          import('./features/compliance/pages/report-preview-page/report-preview-page.component').then(
            (m) => m.ReportPreviewPageComponent,
          ),
      },
    ],
  },
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./features/dashboard/dashboard-module').then((m) => m.DashboardModule),
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
