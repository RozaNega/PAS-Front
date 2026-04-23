import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'landing',
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
    path: 'dashboard',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./features/dashboard/dashboard-module').then((m) => m.DashboardModule),
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
    path: '**',
    redirectTo: 'landing',
  },
];
