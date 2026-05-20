import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowService } from '../../../../core/services/workflow.service';

interface ResponseTime {
  id: string;
  approver: string;
  department: string;
  avgResponseTime: string;
  totalDecisions: number;
  onTimeRate: number;
}

@Component({
  selector: 'app-response-times',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './response-times.component.html',
  styleUrls: ['./response-times.component.scss']
})
export class ResponseTimesComponent {
  private readonly workflowService = inject(WorkflowService);

  private readonly defaultSeeds: ResponseTime[] = [
    { id: 'seed-1', approver: 'Manager A', department: 'IT', avgResponseTime: '2.3 hours', totalDecisions: 45, onTimeRate: 92 },
    { id: 'seed-2', approver: 'Manager B', department: 'Finance', avgResponseTime: '1.8 hours', totalDecisions: 32, onTimeRate: 95 }
  ];

  protected readonly responseTimes = computed<ResponseTime[]>(() => {
    const reqs = this.workflowService.getAllRequests();
    
    // Filter only those requests that have been decided by a manager
    const decidedReqs = reqs.filter(r => r.managerReviewDate !== undefined);
    
    if (decidedReqs.length === 0) return this.defaultSeeds;

    // Group by managerName or department to compute statistics
    const groups: { [key: string]: { total: number; sumMs: number; onTime: number; dept: string } } = {};

    decidedReqs.forEach(req => {
      const name = req.managerName || 'Standard Manager';
      const dept = req.department || 'Operations';
      
      const submitted = new Date(req.submittedDate).getTime();
      const reviewed = new Date(req.managerReviewDate!).getTime();
      const diffMs = reviewed - submitted;
      const hours = diffMs / 3600000;

      if (!groups[name]) {
        groups[name] = { total: 0, sumMs: 0, onTime: 0, dept };
      }

      groups[name].total += 1;
      groups[name].sumMs += diffMs;
      // On-time is defined as within 24 hours
      if (hours <= 24) {
        groups[name].onTime += 1;
      }
    });

    const mapped: ResponseTime[] = Object.keys(groups).map((name, i) => {
      const g = groups[name];
      const avgHours = g.total > 0 ? (g.sumMs / g.total) / 3600000 : 0;
      const rate = g.total > 0 ? Math.round((g.onTime / g.total) * 100) : 100;

      // Friendly string
      const avgStr = avgHours < 1 
        ? `${Math.max(1, Math.round(avgHours * 60))} mins` 
        : `${avgHours.toFixed(1)} hours`;

      return {
        id: `resp_${i}`,
        approver: name,
        department: g.dept,
        avgResponseTime: avgStr,
        totalDecisions: g.total,
        onTimeRate: rate
      };
    });

    return [...mapped, ...this.defaultSeeds];
  });
}
