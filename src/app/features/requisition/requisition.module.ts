import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';

// Service Requests
import { ServiceRequestListComponent } from './service-requests/pages/service-request-list/service-request-list.component';
import { ServiceRequestDetailComponent } from './service-requests/pages/service-request-detail/service-request-detail.component';
import { ServiceRequestService } from './service-requests/services/service-request.service';

// Store Issue Vouchers
import { SIVListComponent } from './store-issue-vouchers/pages/siv-list/siv-list.component';
import { SIVDetailComponent } from './store-issue-vouchers/pages/siv-detail/siv-detail.component';
import { SIVService } from './store-issue-vouchers/services/siv.service';

const routes: Routes = [
  { path: 'service-requests', component: ServiceRequestListComponent },
  { path: 'service-requests/:id', component: ServiceRequestDetailComponent },
  { path: 'store-issue-vouchers', component: SIVListComponent },
  { path: 'store-issue-vouchers/:id', component: SIVDetailComponent }
];

@NgModule({
  declarations: [
    ServiceRequestDetailComponent,
    SIVListComponent,
    SIVDetailComponent
  ],
  imports: [SharedModule, RouterModule.forChild(routes), ServiceRequestListComponent],
  providers: [ServiceRequestService, SIVService]
})
export class RequisitionModule {}                      
