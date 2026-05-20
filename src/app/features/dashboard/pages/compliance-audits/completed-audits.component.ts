import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowService } from '../../../../core/services/workflow.service';

interface Audit {
  id: string;
  auditId: string;
  type: string;
  completedBy: string;
  completedDate: string;
  findings: number;
  riskLevel: string;
}

@Component({
  selector: 'app-completed-audits',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './completed-audits.component.html',
  styleUrls: ['./completed-audits.component.scss']
})
export class CompletedAuditsComponent {
  private readonly workflowService = inject(WorkflowService);

  private readonly defaultSeeds: Audit[] = [
    { id: 'seed-1', auditId: 'AUD-2024-001', type: 'Request Review', completedBy: 'Officer A', completedDate: '2024-01-20', findings: 2, riskLevel: 'Low' }
  ];

  protected readonly audits = computed<Audit[]>(() => {
    const reqs = this.workflowService.getAllRequests();
    
    // Filter completed/approved requests
    const completedReqs = reqs.filter(r => ['Completed', 'Manager Approved', 'Admin Approved'].includes(r.status));

    const mapped: Audit[] = completedReqs.map(req => {
      const reviewDate = req.managerReviewDate || req.submittedDate;
      return {
        id: `aud_comp_${req.id}`,
        auditId: `AUD-${req.srNumber.replace('SR-', '')}`,
        type: 'Requisition Clearance',
        completedBy: req.managerName || 'System Clearance Officer',
        completedDate: new Date(reviewDate).toISOString().split('T')[0],
        findings: 0,
        riskLevel: req.priority === 'Urgent' || req.priority === 'High' ? 'High' : 'Low'
      };
    });

    return [...mapped, ...this.defaultSeeds];
  });
}
