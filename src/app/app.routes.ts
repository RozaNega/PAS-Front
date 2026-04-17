import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth-module').then((m) => m.AuthModule),
  },
  {
    path: 'catalog',
    loadChildren: () => import('./features/catalog/catalog-module').then((m) => m.CatalogModule),
  },
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./features/dashboard/dashboard-module').then((m) => m.DashboardModule),
  },
  {
    path: 'storage',
    loadChildren: () => import('./features/storage/storage-module').then((m) => m.StorageModule),
  },
  {
    path: 'notifications',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/notifications/pages/notifications-page').then((m) => m.NotificationsPage),
      },
    ],
  },
  {
    path: 'reports',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () => import('./features/reports/reports.module').then((m) => m.ReportsModule),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
