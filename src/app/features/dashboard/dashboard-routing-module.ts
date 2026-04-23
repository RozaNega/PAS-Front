import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainLayoutComponent } from '../../layouts/main-layout/main-layout.component';
import { Pages } from './pages/pages';
import { Profile } from './profile/profile';
import { Services } from './services/services';
import { DashboardRoleRouteGuard } from './guards/dashboard-role-route.guard';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'employee',
  },
  {
    path: 'admin',
    component: MainLayoutComponent,
    canActivate: [DashboardRoleRouteGuard],
    children: [{ path: '', component: Pages, data: { dashboardRole: 'admin' } }],
  },
  {
    path: 'storekeeper',
    component: MainLayoutComponent,
    canActivate: [DashboardRoleRouteGuard],
    children: [{ path: '', component: Pages, data: { dashboardRole: 'storekeeper' } }],
  },
  {
    path: 'employee',
    component: MainLayoutComponent,
    canActivate: [DashboardRoleRouteGuard],
    children: [{ path: '', component: Pages, data: { dashboardRole: 'employee' } }],
  },
  {
    path: 'manager',
    component: MainLayoutComponent,
    canActivate: [DashboardRoleRouteGuard],
    children: [{ path: '', component: Pages, data: { dashboardRole: 'manager' } }],
  },
  {
    path: 'compliance-officer',
    component: MainLayoutComponent,
    canActivate: [DashboardRoleRouteGuard],
    children: [{ path: '', component: Pages, data: { dashboardRole: 'compliance-officer' } }],
  },
  {
    path: 'services',
    component: MainLayoutComponent,
    children: [{ path: '', component: Services }],
  },
  {
    path: 'profile',
    component: MainLayoutComponent,
    children: [{ path: '', component: Profile }],
  },
  {
    path: '**',
    pathMatch: 'full',
    redirectTo: 'employee',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DashboardRoutingModule {}
