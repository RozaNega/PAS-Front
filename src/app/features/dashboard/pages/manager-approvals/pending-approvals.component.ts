import { Component, OnDestroy, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, take } from 'rxjs';
import {
  ManagerDataService,
  ManagerRequestRow,
} from '../../../../core/services/manager-data.service';
import {
  WorkflowService,
  ServiceRequest,
  NotificationMessage,
} from '../../../../core/services/workflow.service';
import { CurrentUserService } from '../../../../core/services/current-user.service';
import { ServiceRequestService } from '../../../requisition/service-requests/services/service-request.service';

@Component({
  selector: 'app-pending-approvals',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pending-approvals.component.html',
  styleUrls: ['./pending-approvals.component.scss']
})
export class PendingApprovalsComponent implements OnInit, OnDestroy {
  private readonly managerData = inject(ManagerDataService);
  private readonly workflowService = inject(WorkflowService);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly serviceRequestService = inject(ServiceRequestService);
  private readonly subs: Subscription[] = [];

  protected readonly pendingRequests = signal<ManagerRequestRow[]>([]);

  // Stock verification
  protected readonly workflowNotifications = signal<NotificationMessage[]>([]);

  ngOnInit(): void {
    this.loadRequests();
    this.loadNotifications();
    this.subs.push(
      this.workflowService.getRequestUpdates().subscribe(() => {
        this.loadRequests();
        this.loadNotifications();
      }),
      this.workflowService.getNotificationUpdates().subscribe(() => {
        this.loadNotifications();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((sub) => sub.unsubscribe());
  }

  protected getStockStatus(requestId: string): 'pending' | 'available' | 'unavailable' | undefined {
    const req = this.workflowService.getRequestById(requestId);
    return req?.stockStatus;
  }

  protected checkStock(requestId: string): void {
    const user = this.currentUserService.getCurrentUserValue();
    const managerName = user?.fullName || user?.username || 'Manager';
    this.workflowService.requestStockVerification(requestId, managerName);
  }

  protected approve(id: string): void {
    const user = this.currentUserService.getCurrentUserValue();
    this.workflowService.managerReviewRequest(
      id,
      'approve',
      'Approved from pending approvals',
      this.workflowService.getManagerQueueIdForCurrentUser(),
      user?.fullName || user?.username || 'Manager',
    );
    this.serviceRequestService
      .approveServiceRequest({ id, remarks: 'Approved from pending approvals' })
      .pipe(take(1))
      .subscribe({ error: () => {} });
    this.loadRequests();
  }

  protected reject(id: string): void {
    const reason = prompt('Please enter a reason for rejection:');
    if (reason === null) return;
    const user = this.currentUserService.getCurrentUserValue();
    this.workflowService.managerReviewRequest(
      id,
      'reject',
      reason || 'Rejected from pending approvals',
      this.workflowService.getManagerQueueIdForCurrentUser(),
      user?.fullName || user?.username || 'Manager',
    );
    this.serviceRequestService
      .reject({ id, reason: reason || 'Rejected from pending approvals' })
      .pipe(take(1))
      .subscribe({ error: () => {} });
    this.loadRequests();
  }

  protected viewDetails(id: string): void {
    const request = this.pendingRequests().find((item) => item.id === id);
    if (request) {
      alert(`${request.requestNumber}\n${request.requesterName}\n${request.description}`);
    }
  }

  protected markNotifAsRead(id: string): void {
    this.workflowService.markNotificationAsRead(id);
    this.loadNotifications();
  }

  protected dismissNotif(id: string): void {
    this.workflowService.dismissNotification(id);
    this.loadNotifications();
  }

  private loadRequests(): void {
    this.managerData.syncServiceRequests().subscribe(() => {
      this.pendingRequests.set(this.managerData.requestRows('pending'));
    });
  }

  private loadNotifications(): void {
    const userId = this.currentUserService.getCurrentUserValue()?.id || 'mgr_001';
    const notifs = this.workflowService.getNotificationsForUser(userId, 'Manager');
    this.workflowNotifications.set(notifs);
  }
}
