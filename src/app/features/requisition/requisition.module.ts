import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { RequisitionRoutingModule } from './requisition-routing.module';

// Service Request Components
import { ServiceRequestListComponent } from './service-requests/pages/service-request-list/service-request-list.component';
import { ServiceRequestFormComponent } from './service-requests/pages/service-request-form/service-request-form.component';
import { ServiceRequestDetailComponent } from './service-requests/pages/service-request-detail/service-request-detail.component';

// SIV Components
import { SivListComponent } from './sivs/pages/siv-list/siv-list.component';

// Services
import { ServiceRequestService } from './service-requests/services/service-request.service';
import { StoreIssueVoucherService } from './sivs/services/siv.service';

@NgModule({
  declarations: [
    // Components are standalone, so we don't declare them here
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    RequisitionRoutingModule,
    
    // Import standalone components
    ServiceRequestListComponent,
    ServiceRequestFormComponent,
    ServiceRequestDetailComponent,
    SivListComponent
  ],
  providers: [
    ServiceRequestService,
    StoreIssueVoucherService
  ]
})
export class RequisitionModule { }