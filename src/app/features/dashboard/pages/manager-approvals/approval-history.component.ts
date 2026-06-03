import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ManagerDataService } from '../../../../core/services/manager-data.service';
import { WorkflowService } from '../../../../core/services/workflow.service';

interface HistoryItem {
  id: string;
  srNumber: string;
  requester: string;
  decision: string;
  date: string;
}

@Component({
  selector: 'app-approval-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './approval-history.component.html',
  styleUrls: ['./approval-history.component.scss']
})
export class ApprovalHistoryComponent implements OnInit, OnDestroy {
  private readonly managerData = inject(ManagerDataService);
  private readonly workflowService = inject(WorkflowService);
  private readonly subs: Subscription[] = [];

  protected readonly history = signal<HistoryItem[]>([]);

  ngOnInit(): void {
    this.loadHistory();
    this.subs.push(this.workflowService.getRequestUpdates().subscribe(() => this.loadHistory()));
  }

  ngOnDestroy(): void {
    this.subs.forEach((sub) => sub.unsubscribe());
  }

  private loadHistory(): void {
    this.managerData.syncServiceRequests().subscribe(() => {
      const approved = this.managerData.requestRows('approved').map((row) => ({
        id: row.id,
        srNumber: row.requestNumber,
        requester: row.requesterName,
        decision: 'Approved',
        date: row.approvedDate || row.requestedDate,
      }));
      const rejected = this.managerData.requestRows('rejected').map((row) => ({
        id: row.id,
        srNumber: row.requestNumber,
        requester: row.requesterName,
        decision: 'Rejected',
        date: row.rejectedDate || row.requestedDate,
      }));
      this.history.set([...approved, ...rejected]);
    });
  }
}
