import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';

// Notifications
import { NotificationListComponent } from './notifications/pages/notification-list/notification-list.component';
import { NotificationService } from './notifications/services/notification-feature.service';

// Documents
import { DocumentListComponent } from './documents/pages/document-list/document-list.component';
import { DocumentService } from './documents/services/document.service';

// Audit Trail
import { AuditTrailComponent } from './audit-trail/pages/audit-trail/audit-trail.component';
import { AuditTrailService } from './audit-trail/services/audit-trail.service';

const routes: Routes = [
  { path: 'notifications', component: NotificationListComponent },
  { path: 'documents', component: DocumentListComponent },
  { path: 'audit-trail', component: AuditTrailComponent }
];

@NgModule({
  declarations: [
    DocumentListComponent,
    AuditTrailComponent
  ],
  imports: [SharedModule, RouterModule.forChild(routes)],
  providers: [NotificationService, DocumentService, AuditTrailService]
})
export class CommonModule {}