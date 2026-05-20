import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowService } from '../../../../core/services/workflow.service';

interface Rejection {
  id: string;
  requestNumber: string;
  rejecter: string;
  department: string;
  rejectionDate: string;
  value: number;
  reason: string;
}

@Component({
  selector: 'app-rejection-analysis',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rejection-analysis.component.html',
  styleUrls: ['./rejection-analysis.component.scss']
})
export class RejectionAnalysisComponent {
  private readonly workflowService = inject(WorkflowService);

  private readonly defaultSeeds: Rejection[] = [
    { id: 'seed-1', requestNumber: 'SR-2024-004', rejecter: 'Manager B', department: 'Finance', rejectionDate: '2024-01-19', value: 1200, reason: 'Budget exceeded' }
  ];

  protected readonly rejections = computed<Rejection[]>(() => {
    const reqs = this.workflowService.getAllRequests();
    
    // Filter rejected or cancelled requests
    const rejectedReqs = reqs.filter(r => ['Manager Rejected', 'Admin Rejected', 'Cancelled'].includes(r.status));

    const mapped: Rejection[] = rejectedReqs.map(req => {
      const decisionDate = req.managerReviewDate || req.submittedDate;
      const totalQty = req.items.reduce((s, it) => s + it.quantity, 0);
      const estimatedCost = req.estimatedCost || (totalQty * 120);

      return {
        id: `rej_${req.id}`,
        requestNumber: req.srNumber,
        rejecter: req.managerName || 'System Reviewer',
        department: req.department || 'Operations',
        rejectionDate: new Date(decisionDate).toISOString().split('T')[0],
        value: estimatedCost,
        reason: req.managerComments || 'Budget re-prioritization / asset technical specifications mismatch'
      };
    });

    return [...mapped, ...this.defaultSeeds];
  });
}
