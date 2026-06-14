import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, take } from 'rxjs';
import { WorkflowService, ApiServiceRequestRow } from '../../../../core/services/workflow.service';
import { CurrentUserService } from '../../../../core/services/current-user.service';
import { ServiceRequestService } from '../../../requisition/service-requests/services/service-request.service';

@Component({
  selector: 'app-approved-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './approved-requests.component.html',
  styleUrls: ['./_requests-common.scss'],
})
export class ApprovedRequestsComponent implements OnInit, OnDestroy {
  private readonly workflowService = inject(WorkflowService);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly serviceRequestService = inject(ServiceRequestService);
  private readonly router = inject(Router);
  private readonly subs: Subscription[] = [];

  protected readonly title = 'Approved Requests';
  protected readonly subtitle = 'Requests that have been approved and are ready for processing';
  protected readonly requests = signal<any[]>([]);

  get totalCount(): number { return this.requests().length; }
  get totalValue(): number { return this.requests().reduce((s, r) => s + (r.estimatedValue || 0), 0); }

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
        error: () => { this.loadRequests(); },
      });
  }

  loadRequests(): void {
    const mgr = this.workflowService.getManagerQueueIdForCurrentUser();
    const approvedRequests = this.workflowService.getApprovedRequestsForManager(mgr);
    this.requests.set(
      approvedRequests.map((req) => ({
        id: req.id,
        requestNumber: req.srNumber,
        requesterName: req.employeeName,
        department: req.department,
        status: req.status,
        priority: req.priority,
        requestedDate: req.submittedDate.toLocaleDateString(),
        approvedDate: req.managerReviewDate ? req.managerReviewDate.toLocaleDateString() : 'N/A',
        itemCount: req.items.length,
        estimatedValue: req.estimatedCost || 0,
        description: req.justification,
        approvedBy: req.managerName || 'Manager',
      })),
    );
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
}
