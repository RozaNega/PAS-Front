import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowService } from '../../../../core/services/workflow.service';

interface Decision {
  id: string;
  requestNumber: string;
  approver: string;
  department: string;
  approvedDate: string;
  value: number;
}

@Component({
  selector: 'app-approval-decisions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './approval-decisions.component.html',
  styleUrls: ['./approval-decisions.component.scss']
})
export class ApprovalDecisionsComponent {
  private readonly workflowService = inject(WorkflowService);

  private readonly defaultSeeds: Decision[] = [
    { id: 'seed-1', requestNumber: 'SR-2024-001', approver: 'Manager A', department: 'IT', approvedDate: '2024-01-20', value: 5348 }
  ];

  protected readonly decisions = computed<Decision[]>(() => {
    const reqs = this.workflowService.getAllRequests();
    
    // Filter approved / completed requests
    const approvedReqs = reqs.filter(r => ['Completed', 'Manager Approved', 'Admin Approved'].includes(r.status));

    const mapped: Decision[] = approvedReqs.map(req => {
      const decisionDate = req.managerReviewDate || req.submittedDate;
      const totalQty = req.items.reduce((s, it) => s + it.quantity, 0);
      const estimatedCost = req.estimatedCost || (totalQty * 150);

      return {
        id: `dec_app_${req.id}`,
        requestNumber: req.srNumber,
        approver: req.managerName || 'Assigned Manager',
        department: req.department || 'Operations',
        approvedDate: new Date(decisionDate).toISOString().split('T')[0],
        value: estimatedCost
      };
    });

    return [...mapped, ...this.defaultSeeds];
  });
}
