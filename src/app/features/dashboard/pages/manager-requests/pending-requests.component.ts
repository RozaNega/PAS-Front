import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { take } from 'rxjs';
import {
  WorkflowService,
  ServiceRequest,
  ApiServiceRequestRow,
} from '../../../../core/services/workflow.service';
import { ServiceRequestService } from '../../../requisition/service-requests/services/service-request.service';
import { CurrentUserService } from '../../../../core/services/current-user.service';

@Component({
  selector: 'app-pending-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pending-requests.component.html',
  styleUrls: ['./pending-requests.component.scss'],
})
export class PendingRequestsComponent implements OnInit, OnDestroy {
  private readonly workflowService = inject(WorkflowService);
  private readonly serviceRequestService = inject(ServiceRequestService);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly subs: Subscription[] = [];

  protected readonly requests = signal<ServiceRequest[]>([]);
  protected readonly managerName = signal('Manager');

  ngOnInit(): void {
    const user = this.currentUserService.getCurrentUserValue();
    this.managerName.set(user?.fullName || user?.username || 'Manager');
    this.syncFromApi();
    this.subs.push(
      this.workflowService.getRequestUpdates().subscribe(() => this.loadRequests()),
      this.workflowService.getNotificationUpdates().subscribe(() => this.loadRequests()),
    );
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
          const pending = items.filter(
            (r) => (r.status || '').toLowerCase() === 'pending',
          );
          this.workflowService.mergeApiServiceRequests(pending, {
            managerQueueId: this.workflowService.getManagerQueueIdForCurrentUser(),
          });
          this.loadRequests();
        },
        error: () => this.loadRequests(),
      });
  }

  loadRequests(): void {
    const mgr = this.workflowService.getManagerQueueIdForCurrentUser();
    this.requests.set(this.workflowService.getRequestsForManager(mgr));
  }

  approveRequest(id: string): void {
    const mgr = this.workflowService.getManagerQueueIdForCurrentUser();
    const name = this.managerName();
    this.workflowService.managerReviewRequest(
      id,
      'approve',
      'Approved from pending list',
      mgr,
      name,
    );
    this.serviceRequestService
      .approveServiceRequest({ id, remarks: 'Approved from pending list' })
      .pipe(take(1))
      .subscribe({ error: () => {} });
    this.loadRequests();
  }

  rejectRequest(id: string): void {
    const reason = prompt('Please enter a reason for rejection:');
    if (reason === null) return;
    const mgr = this.workflowService.getManagerQueueIdForCurrentUser();
    const name = this.managerName();
    this.workflowService.managerReviewRequest(
      id,
      'reject',
      reason || 'Rejected from pending list',
      mgr,
      name,
    );
    this.serviceRequestService
      .rejectServiceRequest({ id, reason: reason || 'Rejected from pending list' })
      .pipe(take(1))
      .subscribe({ error: () => {} });
    this.loadRequests();
  }
}
