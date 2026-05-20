import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, take } from 'rxjs';
import { WorkflowService, ApiServiceRequestRow } from '../../../../core/services/workflow.service';
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
          const items = (res as { data?: { items?: ApiServiceRequestRow[] } })?.data?.items ?? [];
          this.workflowService.mergeApiServiceRequests(items, {
            managerQueueId: this.workflowService.getAssignedManagerQueueId(),
            employeeIdFilter: null,
          });
          this.loadRequests();
        },
        error: () => {
          this.loadRequests();
        },
      });
  }

  private loadRequests(): void {
    const rejectedStatuses = ['Manager Rejected', 'Admin Rejected'];
    const currentUser = this.currentUserService.getCurrentUserValue();
    const rejectedFromNotifications = new Set(
      this.workflowService
        .getNotificationsForUser(currentUser?.id || '', 'Employee')
        .filter(
          (notification) =>
            !!notification.requestId &&
            (notification.title.toLowerCase().includes('rejected') ||
              notification.message.toLowerCase().includes('rejected')),
        )
        .map((notification) => notification.requestId as string),
    );

    const employeeKeys = [
      this.currentUserId,
      currentUser?.email,
      currentUser?.fullName,
      currentUser?.username,
    ]
      .map((value) => value?.trim())
      .filter((value): value is string => !!value);

    const rejectedRequests = this.workflowService.getAllRequests().filter((req) => {
      if (!rejectedStatuses.includes(req.status)) {
        return false;
      }

      return (
        rejectedFromNotifications.has(req.id) ||
        employeeKeys.includes(req.employeeId) ||
        employeeKeys.includes(req.employeeEmail) ||
        employeeKeys.includes(req.employeeName)
      );
    });

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
