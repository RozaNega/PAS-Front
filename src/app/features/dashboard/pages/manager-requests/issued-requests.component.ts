import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowService } from '../../../../core/services/workflow.service';

@Component({
  selector: 'app-issued-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './issued-requests.component.html',
  styleUrls: ['./issued-requests.component.scss']
})
export class IssuedRequestsComponent implements OnInit {
  private readonly workflowService = inject(WorkflowService);

  protected readonly requests = signal<any[]>([]);

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    const mgr = this.workflowService.getDefaultManagerQueueId();
    const issuedRequests = this.workflowService.getAllRequests().filter(req => 
      req.managerId === mgr && 
      req.status === 'Completed'
    );
    this.requests.set(issuedRequests.map(req => ({
      id: req.id,
      requestNumber: req.srNumber,
      sivNumber: 'SIV-' + req.srNumber.split('-').slice(1).join('-'), // Mock SIV number
      requesterName: req.employeeName,
      department: req.department,
      status: 'Issued',
      requestedDate: req.submittedDate.toLocaleDateString(),
      issuedDate: req.completedDate ? req.completedDate.toLocaleDateString() : 'N/A',
      itemCount: req.items.length,
      estimatedValue: req.estimatedCost || 0,
      description: req.justification,
      issuedBy: 'Storekeeper'
    })));
  }
}
