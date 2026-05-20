import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, take } from 'rxjs';
import { ServiceRequestService } from '../../../../features/requisition/service-requests/services/service-request.service';
import {
  WorkflowService,
  ServiceRequest,
  ApiServiceRequestRow,
  NotificationMessage,
} from '../../../../core/services/workflow.service';
import { CurrentUserService } from '../../../../core/services/current-user.service';
import {
  ServiceRequestDetail,
  ServiceRequestTimeline,
  ServiceRequestActivity,
  CancelServiceRequestRequest,
} from '../../../../features/requisition/service-requests/models/service-request.model';

interface Request {
  id: string;
  srNumber: string;
  title?: string;
  description?: string;
  priority?: string;
  status: string;
  approvedDate?: string;
  canCancel: boolean;
  currentStep: number;
  totalSteps: number;
  estimatedCompletion?: string;
  currentApprover?: string;
  items: RequestItem[];
  activityLog: ActivityLogEntry[];
}

interface RequestItem {
  name: string;
  quantity: number;
  status: string;
  expectedDate: string;
}

interface ActivityLogEntry {
  timestamp: string;
  action: string;
  performedBy: string;
}

@Component({
  selector: 'app-approved-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './approved-requests.component.html',
  styleUrls: ['./approved-requests.component.scss'],
})
export class ApprovedRequestsComponent implements OnInit, OnDestroy {
  private serviceRequestService = inject(ServiceRequestService);
  private readonly workflowService = inject(WorkflowService);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly subs: Subscription[] = [];
  private currentUserId = '';

  protected readonly requests = signal<Request[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);

  // Track request data
  protected readonly trackingData = signal<{
    [key: string]: { timeline?: ServiceRequestTimeline; activity?: ServiceRequestActivity[] };
  }>({});
  protected readonly isLoadingTracking = signal<string | null>(null);
  protected readonly trackingError = signal<string | null>(null);

  protected readonly expandedRequest = signal<string | null>(null);
  protected readonly showCancelConfirm = signal<string | null>(null);
  protected readonly showCancelSuccess = signal<string | null>(null);
  protected readonly cancelReason = signal('');
  protected readonly notifyApprover = signal(true);
  protected readonly sendEmailConfirmation = signal(true);
  protected readonly newComment = signal('');

  protected showCancelConfirmation(requestId: string): void {
    console.log('Show cancel confirmation clicked for request:', requestId);
    this.showCancelConfirm.set(requestId);
    this.cancelReason.set('');
    this.notifyApprover.set(true);
    this.sendEmailConfirmation.set(true);
    console.log('Cancel confirmation shown for:', requestId);
  }

  protected hideCancelConfirmation(): void {
    this.showCancelConfirm.set(null);
  }

  protected isCancelConfirmShown(requestId: string): boolean {
    return this.showCancelConfirm() === requestId;
  }

  protected cancelRequest(requestId: string): void {
    const request: CancelServiceRequestRequest = {
      id: requestId,
      reason: this.cancelReason() || undefined,
      notifyApprover: this.notifyApprover(),
      sendEmailConfirmation: this.sendEmailConfirmation(),
    };

    this.serviceRequestService.cancelServiceRequest(request).subscribe({
      next: () => {
        // Remove the request from the list
        const requests = this.requests();
        const index = requests.findIndex((r) => r.id === requestId);
        if (index !== -1) {
          const updatedRequests = [...requests];
          updatedRequests.splice(index, 1);
          this.requests.set(updatedRequests);
        }
        this.showCancelConfirm.set(null);
        this.showCancelSuccess.set(requestId);
      },
      error: (err) => {
        console.error('Error cancelling request:', err);
        alert('Failed to cancel request. Please try again.');
      },
    });
  }

  protected hideCancelSuccess(): void {
    this.showCancelSuccess.set(null);
  }

  protected isCancelSuccessShown(requestId: string): boolean {
    return this.showCancelSuccess() === requestId;
  }

  protected canCancelRequest(status: string): boolean {
    return status === 'Draft' || status === 'Pending';
  }

  protected getStepStatusClass(step: number, currentStep: number, totalSteps: number): string {
    if (step < currentStep) return 'step-completed';
    if (step === currentStep) return 'step-current';
    return 'step-pending';
  }

  protected getStepWidth(totalSteps: number): number {
    return 100 / totalSteps;
  }

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
    this.isLoading.set(true);
    this.error.set(null);

    const approvedStatuses = ['Manager Approved', 'Admin Approved', 'Completed'];
    const currentUser = this.currentUserService.getCurrentUserValue();
    const approvedNotifications = this.workflowService
      .getNotificationsForUser(currentUser?.id || '', 'Employee')
      .filter((notification) => {
        const title = notification.title.toLowerCase();
        const message = notification.message.toLowerCase();
        const isApprovedLike =
          title.includes('approved') ||
          message.includes('approved') ||
          message.includes('completed');
        const isRejectedLike = title.includes('rejected') || message.includes('rejected');
        return isApprovedLike && !isRejectedLike;
      });

    const approvedFromNotificationIds = new Set(
      approvedNotifications
        .map((notification) => notification.requestId)
        .filter((requestId): requestId is string => !!requestId),
    );

    const approvedFromNotificationSrNumbers = new Set(
      approvedNotifications
        .map(
          (notification) =>
            this.extractSrNumber(notification.requestId) ||
            this.extractSrNumber(notification.message),
        )
        .filter((srNumber): srNumber is string => !!srNumber),
    );

    const employeeKeys = [
      this.currentUserId,
      currentUser?.email,
      currentUser?.fullName,
      currentUser?.username,
    ]
      .map((value) => value?.trim())
      .filter((value): value is string => !!value);

    const mappedRequests: Request[] = this.workflowService
      .getAllRequests()
      .filter((sr: ServiceRequest) => {
        if (!approvedStatuses.includes(sr.status)) {
          return false;
        }

        const isNotificationMatched =
          approvedFromNotificationIds.has(sr.id) ||
          approvedFromNotificationSrNumbers.has(sr.srNumber);

        if (isNotificationMatched) {
          return true;
        }

        return (
          employeeKeys.includes(sr.employeeId) ||
          employeeKeys.includes(sr.employeeEmail) ||
          employeeKeys.includes(sr.employeeName)
        );
      })
      .map((sr: ServiceRequest) => ({
        id: sr.id,
        srNumber: sr.srNumber,
        title: sr.items[0]?.name || 'Approved Request',
        description:
          sr.justification || sr.items[0]?.description || 'Approved request from workflow',
        priority: sr.priority,
        status: sr.status,
        canCancel:
          sr.status === 'Draft' || sr.status === 'Submitted' || sr.status === 'Under Review',
        currentStep: this.getCurrentStepFromStatus(sr.status),
        totalSteps: 5,
        approvedDate:
          sr.managerReviewDate?.toLocaleDateString() || sr.adminReviewDate?.toLocaleDateString(),
        items: sr.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          status: sr.status,
          expectedDate: sr.requiredDate.toLocaleDateString(),
        })),
        activityLog: (sr.workflowHistory || []).map((h) => ({
          timestamp: new Date(h.timestamp).toLocaleString(),
          action: h.action,
          performedBy: h.performedBy,
        })),
      }));

    const existingRequestKeys = new Set(
      mappedRequests
        .flatMap((request) => [request.id, request.srNumber])
        .filter((v): v is string => !!v),
    );

    const notificationOnlyRequests: Request[] = approvedNotifications
      .map((notification: NotificationMessage) => {
        const srNumber =
          this.extractSrNumber(notification.requestId) ||
          this.extractSrNumber(notification.message);
        if (!srNumber || existingRequestKeys.has(srNumber)) {
          return null;
        }

        return {
          id: `notif_${notification.id}`,
          srNumber,
          title: 'Request approved',
          description: notification.message,
          priority: 'N/A',
          status: 'Manager Approved',
          approvedDate: notification.createdDate?.toLocaleDateString(),
          canCancel: false,
          currentStep: this.getCurrentStepFromStatus('Manager Approved'),
          totalSteps: 5,
          items: [],
          activityLog: [
            {
              timestamp: notification.createdDate?.toLocaleString() || '',
              action: notification.title,
              performedBy: 'Manager',
            },
          ],
        } as Request;
      })
      .filter((request): request is Request => !!request);

    this.requests.set([...mappedRequests, ...notificationOnlyRequests]);
    this.isLoading.set(false);
  }

  private extractSrNumber(value?: string): string | null {
    if (!value) {
      return null;
    }

    const match = value.match(/SR-\d{8}-\d{4}/i);
    return match ? match[0].toUpperCase() : null;
  }

  private getCurrentStepFromStatus(status: string): number {
    const statusMap: { [key: string]: number } = {
      Draft: 1,
      Submitted: 2,
      'Under Review': 2,
      'Manager Approved': 3,
      'Admin Approved': 4,
      'Compliance Review': 4,
      Completed: 5,
      'Manager Rejected': 2,
      'Admin Rejected': 2,
    };
    return statusMap[status] || 1;
  }

  protected toggleTracking(requestId: string): void {
    if (this.expandedRequest() === requestId) {
      this.expandedRequest.set(null);
    } else {
      this.expandedRequest.set(requestId);
      this.loadTrackingData(requestId);
    }
  }

  private loadTrackingData(requestId: string): void {
    this.isLoadingTracking.set(requestId);
    this.trackingError.set(null);

    // Load timeline and activity in parallel
    this.serviceRequestService.getServiceRequestTimeline(requestId).subscribe({
      next: (response) => {
        const current = this.trackingData();
        this.trackingData.set({
          ...current,
          [requestId]: { ...current[requestId], timeline: response.data },
        });
        this.isLoadingTracking.set(null);
      },
      error: (err) => {
        console.error('Error loading timeline:', err);
        this.trackingError.set('Failed to load timeline');
        this.isLoadingTracking.set(null);
      },
    });

    this.serviceRequestService.getServiceRequestActivity(requestId).subscribe({
      next: (response) => {
        const current = this.trackingData();
        this.trackingData.set({
          ...current,
          [requestId]: { ...current[requestId], activity: response.data },
        });
      },
      error: (err) => {
        console.error('Error loading activity:', err);
      },
    });
  }

  protected isTrackingExpanded(requestId: string): boolean {
    return this.expandedRequest() === requestId;
  }

  protected getTrackingData(requestId: string) {
    return this.trackingData()[requestId];
  }

  protected addComment(requestId: string): void {
    if (this.newComment().trim()) {
      this.serviceRequestService.addServiceRequestComment(requestId, this.newComment()).subscribe({
        next: () => {
          this.newComment.set('');
          // Reload activity log to show new comment
          this.loadTrackingData(requestId);
        },
        error: (err) => {
          console.error('Error adding comment:', err);
          alert('Failed to add comment');
        },
      });
    }
  }
}
