import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';

import { ServiceRequestListComponent } from './service-requests/pages/service-request-list/service-request-list.component';
import { ServiceRequestFormComponent } from './service-requests/pages/service-request-form/service-request-form.component';
import { ServiceRequestDetailComponent } from './service-requests/pages/service-request-detail/service-request-detail.component';
import { SivListComponent } from './sivs/pages/siv-list/siv-list.component';

const routes: Routes = [
  {
    path: 'service-requests',
    canActivate: [AuthGuard],
    children: [
      { path: '', component: ServiceRequestListComponent, data: { initialStatus: 'All' } },
      { path: 'create', component: ServiceRequestFormComponent },
      { path: ':id/edit', component: ServiceRequestFormComponent },
      { path: ':id', component: ServiceRequestDetailComponent },
    ],
  },
  {
    path: 'sivs',
    canActivate: [AuthGuard],
    children: [
      { path: '', component: SivListComponent },
      {
        path: 'new',
        loadComponent: () =>
          import('./sivs/pages/siv-create/siv-create-page.component').then((m) => m.SivCreatePageComponent),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./sivs/pages/siv-detail/siv-detail-page.component').then((m) => m.SivDetailPageComponent),
      },
    ],
  },
  {
    path: 'requisitions/service-requests',
    canActivate: [AuthGuard],
    children: [
      { path: '', component: ServiceRequestListComponent, data: { initialStatus: 'All' } },
      { path: 'create', component: ServiceRequestFormComponent },
      { path: ':id/edit', component: ServiceRequestFormComponent },
      { path: ':id', component: ServiceRequestDetailComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RequisitionRoutingModule {}
