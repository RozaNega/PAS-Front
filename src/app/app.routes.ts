import { Routes } from '@angular/router';

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
    path: '**',
    redirectTo: 'dashboard',
  },
];
