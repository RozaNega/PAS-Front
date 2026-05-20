import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, take } from 'rxjs';
import { WorkflowService, ApiServiceRequestRow } from '../../../../core/services/workflow.service';
import { CurrentUserService } from '../../../../core/services/current-user.service';
import { ServiceRequestService } from '../../../requisition/service-requests/services/service-request.service';

@Component({
  selector: 'app-rejected-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rejected-requests.component.html',
  styleUrls: ['./rejected-requests.component.scss'],
})
export class RejectedRequestsComponent implements OnInit, OnDestroy {
  private readonly workflowService = inject(WorkflowService);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly serviceRequestService = inject(ServiceRequestService);
  private readonly subs: Subscription[] = [];

  protected readonly requests = signal<any[]>([]);

  ngOnInit(): void {
    this.syncFromApi();
    this.subs.push(this.currentUserService.currentUser$.subscribe(() => this.loadRequests()));
    this.subs.push(
      this.workflowService.getRequestUpdates().subscribe(() => this.loadRequests()),
      this.workflowService.getNotificationUpdates().subscribe(() => this.loadRequests()),
    );
    this.loadRequests();
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  private syncFromApi(): void {
    this.serviceRequestService
      .getServiceRequests()
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          const items = (res as { data?: { items?: ApiServiceRequestRow[] } })?.data?.items ?? [];
          this.workflowService.mergeApiServiceRequests(items, {
            managerQueueId: this.workflowService.getManagerQueueIdForCurrentUser(),
          });
          this.loadRequests();
        },
        error: () => {
          this.loadRequests();
        },
      });
  }

  loadRequests(): void {
    const mgr = this.workflowService.getManagerQueueIdForCurrentUser();
    const rejectedRequests = this.workflowService.getRejectedRequestsForManager(mgr);
    this.requests.set(
      rejectedRequests.map((req) => ({
        id: req.id,
        requestNumber: req.srNumber,
        requesterName: req.employeeName,
        department: req.department,
        status: 'Rejected',
        priority: req.priority,
        requestedDate: req.submittedDate.toLocaleDateString(),
        rejectedDate: req.managerReviewDate ? req.managerReviewDate.toLocaleDateString() : 'N/A',
        itemCount: req.items.length,
        estimatedValue: req.estimatedCost || 0,
        description: req.justification,
        rejectedBy: req.managerName || 'Manager',
        rejectionReason: req.managerComments || 'No reason provided',
      })),
    );
  }
}
