import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowService } from '../../../../core/services/workflow.service';

@Component({
  selector: 'app-all-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './all-requests.component.html',
  styleUrls: ['./all-requests.component.scss']
})
export class AllRequestsComponent implements OnInit {
  private readonly workflowService = inject(WorkflowService);

  protected readonly requests = signal<any[]>([]);

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    const mgr = this.workflowService.getDefaultManagerQueueId();
    const allRequests = this.workflowService.getAllRequests().filter(req => req.managerId === mgr);
    this.requests.set(allRequests.map(req => ({
      id: req.id,
      requestNumber: req.srNumber,
      requesterName: req.employeeName,
      department: req.department,
      status: req.status,
      priority: req.priority,
      requestedDate: req.submittedDate.toLocaleDateString(),
      requiredDate: req.requiredDate.toLocaleDateString(),
      itemCount: req.items.length,
      estimatedValue: req.estimatedCost || 0,
      description: req.justification
    })));
  }
}
