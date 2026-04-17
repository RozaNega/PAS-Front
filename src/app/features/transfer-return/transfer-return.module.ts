import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';

// Transfer Records
import { TransferRecordListComponent } from './transfer-records/pages/transfer-record-list/transfer-record-list.component';
import { TransferRecordService } from './transfer-records/services/transfer-record.service';

// Return Material Requests
import { ReturnRequestListComponent } from './return-material-requests/pages/return-request-list/return-request-list.component';
import { ReturnRequestService } from './return-material-requests/services/return-request.service';

const routes: Routes = [
  { path: 'transfer-records', component: TransferRecordListComponent },
  { path: 'return-requests', component: ReturnRequestListComponent }
];

@NgModule({
  declarations: [
    TransferRecordListComponent,
    ReturnRequestListComponent
  ],
  imports: [SharedModule, RouterModule.forChild(routes)],
  providers: [TransferRecordService, ReturnRequestService]
})
export class TransferReturnModule {}