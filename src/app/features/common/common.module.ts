import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';

// Notifications (standalone; imported for legacy child route)
import { NotificationListComponent } from './notifications/pages/notification-list/notification-list.component';

// Documents
import { DocumentListComponent } from './documents/pages/document-list/document-list.component';
import { DocumentService } from './documents/services/document.service';

// Audit Trail
import { AuditTrailComponent } from './audit-trail/pages/audit-trail/audit-trail.component';
import { AuditTrailService } from './audit-trail/services/audit-trail.service';

const routes: Routes = [
  { path: '', component: AuditTrailComponent },
  { path: 'notifications', component: NotificationListComponent },
  { path: 'documents', component: DocumentListComponent },
];

@NgModule({
  declarations: [DocumentListComponent, AuditTrailComponent],
  imports: [SharedModule, RouterModule.forChild(routes), NotificationListComponent],
  providers: [DocumentService, AuditTrailService],
})
export class CommonModule {}
