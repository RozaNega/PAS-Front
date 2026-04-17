import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';

// Approval Workflows
import { ApprovalWorkflowListComponent } from './approval-workflows/pages/approval-workflow-list/approval-workflow-list.component';
import { ApprovalWorkflowFormComponent } from './approval-workflows/pages/approval-workflow-form/approval-workflow-form.component';
import { ApprovalWorkflowService } from './approval-workflows/services/approval-workflow.service';

// Approvers
import { ApproverListComponent } from './approvers/pages/approver-list/approver-list.component';
import { ApproverService } from './approvers/services/approver.service';

const routes: Routes = [
  { path: 'approval-workflows', component: ApprovalWorkflowListComponent },
  { path: 'approval-workflows/new', component: ApprovalWorkflowFormComponent },
  { path: 'approval-workflows/edit/:id', component: ApprovalWorkflowFormComponent },
  { path: 'approval-workflows/:id', component: ApprovalWorkflowFormComponent },
  { path: 'approvers', component: ApproverListComponent }
];

@NgModule({
  declarations: [
    ApprovalWorkflowListComponent,
    ApprovalWorkflowFormComponent,
    ApproverListComponent
  ],
  imports: [SharedModule, RouterModule.forChild(routes)],
  providers: [ApprovalWorkflowService, ApproverService]
})
export class WorkflowModule {}