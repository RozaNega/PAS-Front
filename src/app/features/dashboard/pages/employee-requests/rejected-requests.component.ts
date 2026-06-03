import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, take } from 'rxjs';
import { WorkflowService } from '../../../../core/services/workflow.service';
import { CurrentUserService } from '../../../../core/services/current-user.service';
import { ServiceRequestService } from '../../../../features/requisition/service-requests/services/service-request.service';

interface Request {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  rejectedDate: string;
  rejectionReason: string;
}

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
  private currentUserId = '';

  protected readonly requests = signal<Request[]>([]);

  ngOnInit(): void {
    this.currentUserId = this.currentUserService.getUserId() || '';
    this.syncFromApi();
    this.subs.push(
      this.currentUserService.currentUser$.subscribe((user) => {
        this.currentUserId = user?.id || '';
        this.loadRequests();
      }),
    );
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
          const items = this.workflowService.extractApiServiceRequestRows(res);
          const user = this.currentUserService.getCurrentUserValue();
          this.workflowService.mergeApiServiceRequests(items, {
            managerQueueId: this.workflowService.getAssignedManagerQueueId(),
            employeeIdFilter: this.currentUserId || user?.id || null,
            employeeIdentity: {
              email: user?.email,
              fullName: user?.fullName,
              username: user?.username,
              employeeCode: user?.employeeCode,
            },
          });
          this.loadRequests();
        },
        error: () => {
          this.loadRequests();
        },
      });
  }

  private loadRequests(): void {
    const currentUser = this.currentUserService.getCurrentUserValue();
    const employeeId = this.currentUserId || currentUser?.id || '';
    const identity = {
      email: currentUser?.email,
      fullName: currentUser?.fullName,
      username: currentUser?.username,
      employeeCode: currentUser?.employeeCode,
    };

    const rejectedRequests = this.workflowService.getRejectedRequestsForEmployee(employeeId, identity);

    this.requests.set(
      rejectedRequests.map((req) => ({
        id: req.srNumber,
        title: req.items[0]?.name || 'Service Request',
        description: req.justification || req.items[0]?.description || 'No description',
        priority: req.priority,
        status: 'Rejected',
        rejectedDate:
          req.managerReviewDate?.toLocaleDateString() ||
          req.adminReviewDate?.toLocaleDateString() ||
          'N/A',
        rejectionReason: req.managerComments || req.adminComments || 'No reason provided',
      })),
    );
  }
}
