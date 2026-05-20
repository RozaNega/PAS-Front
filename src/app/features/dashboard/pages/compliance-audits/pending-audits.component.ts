import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowService } from '../../../../core/services/workflow.service';

interface Audit {
  id: string;
  auditId: string;
  type: string;
  priority: string;
  assignedTo: string;
  dueDate: string;
}

@Component({
  selector: 'app-pending-audits',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pending-audits.component.html',
  styleUrls: ['./pending-audits.component.scss']
})
export class PendingAuditsComponent {
  private readonly workflowService = inject(WorkflowService);

  private readonly defaultSeeds: Audit[] = [
    { id: 'seed-1', auditId: 'AUD-2024-003', type: 'Request Review', priority: 'High', assignedTo: 'Officer A', dueDate: '2024-01-25' }
  ];

  protected readonly audits = computed<Audit[]>(() => {
    const reqs = this.workflowService.getAllRequests();
    
    // Filter pending/under review requests
    const pendingReqs = reqs.filter(r => ['Submitted', 'Under Review'].includes(r.status));

    const mapped: Audit[] = pendingReqs.map(req => {
      const due = new Date(new Date(req.submittedDate).getTime() + 5 * 86400000);
      return {
        id: `aud_pend_${req.id}`,
        auditId: `AUD-${req.srNumber.replace('SR-', '')}`,
        type: 'Active Asset Review',
        priority: req.priority,
        assignedTo: req.managerName || 'System Inspector',
        dueDate: due.toISOString().split('T')[0]
      };
    });

    return [...mapped, ...this.defaultSeeds];
  });
}
