import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, take } from 'rxjs';
import { WorkflowService, ApiServiceRequestRow } from '../../../../core/services/workflow.service';
import { CurrentUserService } from '../../../../core/services/current-user.service';
import { ServiceRequestService } from '../../../requisition/service-requests/services/service-request.service';

@Component({
  selector: 'app-approved-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './approved-requests.component.html',
  styleUrls: ['./approved-requests.component.scss'],
})
export class ApprovedRequestsComponent implements OnInit, OnDestroy {
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
    const approvedRequests = this.workflowService.getApprovedRequestsForManager(mgr);
    this.requests.set(
      approvedRequests.map((req) => ({
        id: req.id,
        requestNumber: req.srNumber,
        priority: req.priority,
        approvedDate: req.managerReviewDate ? req.managerReviewDate.toLocaleDateString() : 'N/A',
        description: req.justification,
      })),
    );
  }
}
