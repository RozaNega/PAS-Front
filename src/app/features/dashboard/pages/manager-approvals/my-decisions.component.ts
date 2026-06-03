import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ManagerDataService } from '../../../../core/services/manager-data.service';
import { WorkflowService } from '../../../../core/services/workflow.service';

interface Decision {
  id: string;
  requestNumber: string;
  requesterName: string;
  department: string;
  decision: 'Approved' | 'Rejected';
  itemCount: number;
  estimatedValue: number;
  decisionDate: string;
  responseTime: string;
  reason?: string;
}

@Component({
  selector: 'app-my-decisions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-decisions.component.html',
  styleUrls: ['./my-decisions.component.scss']
})
export class MyDecisionsComponent implements OnInit, OnDestroy {
  private readonly managerData = inject(ManagerDataService);
  private readonly workflowService = inject(WorkflowService);
  private readonly subs: Subscription[] = [];

  protected readonly decisions = signal<Decision[]>([]);

  ngOnInit(): void {
    this.loadDecisions();
    this.subs.push(this.workflowService.getRequestUpdates().subscribe(() => this.loadDecisions()));
  }

  ngOnDestroy(): void {
    this.subs.forEach((sub) => sub.unsubscribe());
  }

  private loadDecisions(): void {
    this.managerData.syncServiceRequests().subscribe(() => {
      const rows = [
        ...this.managerData.requestRows('approved').map((row) => ({
          id: row.id,
          requestNumber: row.requestNumber,
          requesterName: row.requesterName,
          department: row.department,
          decision: 'Approved' as const,
          itemCount: row.itemCount,
          estimatedValue: row.estimatedValue,
          decisionDate: row.approvedDate || row.requestedDate,
          responseTime: 'From backend',
        })),
        ...this.managerData.requestRows('rejected').map((row) => ({
          id: row.id,
          requestNumber: row.requestNumber,
          requesterName: row.requesterName,
          department: row.department,
          decision: 'Rejected' as const,
          itemCount: row.itemCount,
          estimatedValue: row.estimatedValue,
          decisionDate: row.rejectedDate || row.requestedDate,
          responseTime: 'From backend',
          reason: row.rejectionReason,
        })),
      ];
      this.decisions.set(rows);
    });
  }
}
