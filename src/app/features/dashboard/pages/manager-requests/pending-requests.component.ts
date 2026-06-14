import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { take } from 'rxjs';
import {
  WorkflowService,
  ServiceRequest,
} from '../../../../core/services/workflow.service';
import { ServiceRequestService } from '../../../requisition/service-requests/services/service-request.service';
import { CurrentUserService } from '../../../../core/services/current-user.service';

@Component({
  selector: 'app-pending-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pending-requests.component.html',
  styleUrls: ['./_requests-common.scss'],
})
export class PendingRequestsComponent implements OnInit, OnDestroy {
  private readonly workflowService = inject(WorkflowService);
  private readonly serviceRequestService = inject(ServiceRequestService);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly router = inject(Router);
  private readonly subs: Subscription[] = [];

  protected readonly title = 'Pending Requests';
  protected readonly subtitle = 'Requests awaiting your approval decision';
  protected readonly requests = signal<ServiceRequest[]>([]);
  protected readonly managerName = signal('Manager');

  get totalCount(): number { return this.requests().length; }
  get urgentCount(): number { return this.requests().filter(r => r.priority === 'Urgent' || r.priority === 'High').length; }
  get mediumCount(): number { return this.requests().filter(r => r.priority === 'Medium').length; }
  get totalValue(): number { return this.requests().reduce((s, r) => s + (r.estimatedCost || 0), 0); }

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
          const items = this.workflowService.extractApiServiceRequestRows(res);
          this.workflowService.mergeApiServiceRequests(items, {
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

  navigateTo(path: string): void {
    void this.router.navigate([path]);
  }

  getPriorityClass(p: string): string {
    if (p === 'Urgent') return 'td-priority td-priority--urgent';
    if (p === 'High') return 'td-priority td-priority--high';
    if (p === 'Medium') return 'td-priority td-priority--medium';
    return 'td-priority td-priority--low';
  }

  approveRequest(id: string): void {
    const mgr = this.workflowService.getManagerQueueIdForCurrentUser();
    const name = this.managerName();
    this.workflowService.managerReviewRequest(id, 'approve', 'Approved from pending list', mgr, name);
    this.serviceRequestService
      .approveServiceRequest({ id, remarks: 'Approved from pending list' })
      .pipe(take(1))
      .subscribe({ next: () => this.syncFromApi(), error: () => {} });
    this.loadRequests();
  }

  rejectRequest(id: string): void {
    const reason = prompt('Please enter a reason for rejection:');
    if (reason === null) return;
    const mgr = this.workflowService.getManagerQueueIdForCurrentUser();
    const name = this.managerName();
    this.workflowService.managerReviewRequest(id, 'reject', reason || 'Rejected from pending list', mgr, name);
    this.serviceRequestService
      .reject({ id, reason: reason || 'Rejected from pending list' })
      .pipe(take(1))
      .subscribe({ next: () => this.syncFromApi(), error: () => {} });
    this.loadRequests();
  }
}
