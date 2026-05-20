import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowService } from '../../../../core/services/workflow.service';

interface Audit {
  id: string;
  auditId: string;
  type: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  auditedBy: string;
  auditDate: string;
  findings: number;
}

@Component({
  selector: 'app-all-audits',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './all-audits.component.html',
  styleUrls: ['./all-audits.component.scss']
})
export class AllAuditsComponent {
  private readonly workflowService = inject(WorkflowService);

  private readonly defaultSeeds: Audit[] = [
    { id: 'seed-1', auditId: 'AUD-2024-001', type: 'Request Review', status: 'Completed', auditedBy: 'Officer A', auditDate: '2024-01-20', findings: 2 },
    { id: 'seed-2', auditId: 'AUD-2024-002', type: 'SIV Verification', status: 'In Progress', auditedBy: 'Officer B', auditDate: '2024-01-21', findings: 0 }
  ];

  protected readonly audits = computed<Audit[]>(() => {
    const reqs = this.workflowService.getAllRequests();
    
    const mapped: Audit[] = reqs.map(req => {
      const isCompliant = ['Completed', 'Manager Approved', 'Admin Approved'].includes(req.status);
      const isPending = ['Submitted', 'Under Review'].includes(req.status);
      
      return {
        id: `aud_${req.id}`,
        auditId: `AUD-${req.srNumber.replace('SR-', '')}`,
        type: req.priority === 'Urgent' ? 'Critical Audit Review' : 'Asset Quality Review',
        status: isCompliant ? 'Completed' : (isPending ? 'Pending' : 'In Progress') as 'Pending' | 'In Progress' | 'Completed',
        auditedBy: req.managerName || 'System Integrity Bot',
        auditDate: new Date(req.submittedDate).toISOString().split('T')[0],
        findings: req.items.length
      };
    });

    return [...mapped, ...this.defaultSeeds];
  });
}
