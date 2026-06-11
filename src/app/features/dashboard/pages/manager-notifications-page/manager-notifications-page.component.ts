import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  NotificationFeatureService,
  Notification,
} from '../../../common/notifications/services/notification-feature.service';
import { WorkflowService, NotificationMessage } from '../../../../core/services/workflow.service';
import { CurrentUserService } from '../../../../core/services/current-user.service';

interface NotificationMeta {
  requestId?: string;
  title?: string;
  type?: string;
  actionUrl?: string;
}

@Component({
  selector: 'app-manager-notifications-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manager-notifications-page.component.html',
  styleUrl: './manager-notifications-page.component.scss',
})
export class ManagerNotificationsPageComponent {
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationFeatureService);
  private readonly workflowService = inject(WorkflowService);
  private readonly currentUserService = inject(CurrentUserService);

  searchQuery = '';
  filterType = 'all';

  notifications: Notification[] = [];
  notificationMeta = new Map<string, NotificationMeta>();

  constructor() {
    this.loadNotifications();
  }

  loadNotifications(): void {
    // Load workflow notifications for Manager role
    const user = this.currentUserService.getCurrentUserValue();
    const workflowNotifications = this.workflowService.getNotificationsForUser(
      user?.id || '',
      'Manager'
    );

    this.notificationMeta.clear();
    const wfMapped: Notification[] = workflowNotifications.map((wn) => {
      if (wn.requestId) {
        this.notificationMeta.set(wn.id, {
          requestId: wn.requestId,
          title: wn.title,
          type: wn.type,
          actionUrl: wn.actionUrl,
        });
      }
      return {
        id: wn.id,
        message: `${wn.title}: ${wn.message}`,
        isRead: wn.isRead,
        sentDate: wn.createdDate?.toISOString() || new Date().toISOString(),
        type: wn.type,
      };
    });

    // Load from backend API
    this.notificationService.getNotifications().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const apiNotifications = response.data.notifications;
          const seenIds = new Set(apiNotifications.map((n) => n.id));
          const uniqueWf = wfMapped.filter((n) => !seenIds.has(n.id));
          this.notifications = [...apiNotifications, ...uniqueWf];
        }
      },
      error: () => {
        this.notifications = wfMapped;
      }
    });
  }

  get filteredNotifications(): Notification[] {
    let filtered = this.notifications;

    if (this.searchQuery) {
      filtered = filtered.filter((n) =>
        n.message.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }

    return filtered;
  }

  get unreadCount(): number {
    return this.notifications.filter((n) => !n.isRead).length;
  }

  hasAction(id: string): boolean {
    return this.notificationMeta.has(id) && !!this.notificationMeta.get(id)!.requestId;
  }

  getActionRequestId(id: string): string | undefined {
    return this.notificationMeta.get(id)?.requestId;
  }

  getNotificationIcon(notification: Notification): string {
    const meta = this.notificationMeta.get(notification.id);
    if (meta?.type === 'warning' || meta?.type === 'error') return '⚠️';
    if (meta?.type === 'success') return '✅';
    if (meta?.type === 'info') return 'ℹ️';
    const msg = notification.message.toLowerCase();
    if (msg.includes('approval') || msg.includes('request')) return '✅';
    if (msg.includes('department')) return '🏢';
    if (msg.includes('budget')) return '💰';
    return '🔔';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString();
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe(() => {
      this.notifications.forEach((n) => (n.isRead = true));
    });
    const user = this.currentUserService.getCurrentUserValue();
    this.workflowService.markAllNotificationsAsRead(user?.id || '', 'Manager');
  }

  markAsRead(id: string): void {
    this.notificationService.markAsRead(id).subscribe(() => {
      const n = this.notifications.find((x) => x.id === id);
      if (n) n.isRead = true;
    });
    this.workflowService.markNotificationAsRead(id);
  }

  dismiss(id: string): void {
    this.notificationService.deleteNotification(id).subscribe(() => {
      this.notifications = this.notifications.filter((n) => n.id !== id);
    });
    this.workflowService.dismissNotification(id);
  }

  approveFlaggedRequest(notifId: string): void {
    const meta = this.notificationMeta.get(notifId);
    if (!meta?.requestId) return;

    const user = this.currentUserService.getCurrentUserValue();
    const name = user?.fullName || user?.username || 'Manager';

    this.workflowService.managerReviewRequest(
      meta.requestId,
      'approve',
      'Approved per compliance flag review',
      user?.id || '',
      name
    );

    // Notify Compliance that flag was resolved
    this.workflowService.createNotification({
      recipientId: '',
      recipientRole: 'Compliance',
      type: 'success',
      title: 'Compliance Flag Resolved - Approved',
      message: `Manager approved the flagged request.`,
      requestId: meta.requestId,
      actionRequired: false,
      actionUrl: '/compliance-officer/risk-alerts',
    });

    this.workflowService.markNotificationAsRead(notifId);
    this.notifications = this.notifications.filter((n) => n.id !== notifId);
    this.notificationMeta.delete(notifId);
    alert('Request approved successfully.');
  }

  rejectFlaggedRequest(notifId: string): void {
    const meta = this.notificationMeta.get(notifId);
    if (!meta?.requestId) return;

    const user = this.currentUserService.getCurrentUserValue();
    const name = user?.fullName || user?.username || 'Manager';

    if (!confirm(`Reject this flagged request?`)) return;

    this.workflowService.managerReviewRequest(
      meta.requestId,
      'reject',
      'Rejected per compliance flag review',
      user?.id || '',
      name
    );

    // Notify Compliance that flag was resolved
    this.workflowService.createNotification({
      recipientId: '',
      recipientRole: 'Compliance',
      type: 'info',
      title: 'Compliance Flag Resolved - Rejected',
      message: `Manager rejected the flagged request.`,
      requestId: meta.requestId,
      actionRequired: false,
      actionUrl: '/compliance-officer/risk-alerts',
    });

    this.workflowService.markNotificationAsRead(notifId);
    this.notifications = this.notifications.filter((n) => n.id !== notifId);
    this.notificationMeta.delete(notifId);
    alert('Request rejected.');
  }

  viewRequestDetails(notifId?: string): void {
    if (notifId) {
      const meta = this.notificationMeta.get(notifId);
      if (meta?.actionUrl) {
        void this.router.navigate([meta.actionUrl]);
        return;
      }
    }
    void this.router.navigate(['/manager/approvals/pending']);
  }

  viewAllApprovalRequests(): void {
    void this.router.navigate(['/manager/approvals/pending']);
  }
}
