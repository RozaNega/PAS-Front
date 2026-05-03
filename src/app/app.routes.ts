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
        path: 'dashboard/new-request',
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
          import('./features/dashboard/pages/employee-dashboard/employee-dashboard.component').then(
            (m) => m.EmployeeDashboardComponent,
          ),
      },
      {
        path: 'dashboard/my-activity',
        loadComponent: () =>
          import('./features/dashboard/pages/employee-dashboard/employee-dashboard.component').then(
            (m) => m.EmployeeDashboardComponent,
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
          import('./features/dashboard/pages/employee-dashboard/employee-dashboard.component').then(
            (m) => m.EmployeeDashboardComponent,
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
          import('./features/dashboard/pages/manager-dashboard/manager-dashboard.component').then(
            (m) => m.ManagerDashboardComponent,
          ),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/notifications/pages/notifications-page').then(
            (m) => m.NotificationsPage,
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
          import('./features/dashboard/pages/compliance-officer-dashboard/compliance-officer-dashboard.component').then(
            (m) => m.ComplianceOfficerDashboardComponent,
          ),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/notifications/pages/notifications-page').then(
            (m) => m.NotificationsPage,
          ),
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
