import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComplianceDataService } from '../../../../core/services/compliance-data.service';
import { ServiceRequestDto } from '../../../../core/services/requisitions.service';

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
export class ResponseTimesComponent implements OnInit {
  private readonly complianceData = inject(ComplianceDataService);
  protected readonly responseTimes = signal<ResponseTime[]>([]);

  ngOnInit(): void {
    this.complianceData.getServiceRequests().subscribe((requests) => {
      this.responseTimes.set(this.buildResponseTimes(requests));
    });
  }

  private buildResponseTimes(requests: ServiceRequestDto[]): ResponseTime[] {
    const decided = requests.filter((request) => request.approvedDate);
    const groups: Record<string, { total: number; sumMs: number; onTime: number; dept: string }> = {};

    decided.forEach((request) => {
      const approver = request.approvedBy || 'Approver';
      const submitted = new Date(request.requestDate).getTime();
      const reviewed = new Date(request.approvedDate as string).getTime();
      const diffMs = Math.max(0, reviewed - submitted);
      const hours = diffMs / 3600000;

      groups[approver] ??= { total: 0, sumMs: 0, onTime: 0, dept: request.department || 'Unassigned' };
      groups[approver].total += 1;
      groups[approver].sumMs += diffMs;
      if (hours <= 24) {
        groups[approver].onTime += 1;
      }
    });

    return Object.entries(groups).map(([approver, group], index) => {
      const avgHours = group.total > 0 ? group.sumMs / group.total / 3600000 : 0;
      return {
        id: `resp_${index}`,
        approver,
        department: group.dept,
        avgResponseTime:
          avgHours < 1 ? `${Math.max(1, Math.round(avgHours * 60))} mins` : `${avgHours.toFixed(1)} hours`,
        totalDecisions: group.total,
        onTimeRate: group.total > 0 ? Math.round((group.onTime / group.total) * 100) : 100,
      };
    });
  }
}
