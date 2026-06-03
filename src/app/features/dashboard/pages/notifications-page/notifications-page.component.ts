import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PasApiService } from '../../../../shared/services/pas-api.service';
import { CurrentUserService } from '../../../../core/services/current-user.service';
import { AuthService } from '../../../../core/services/auth.service';

import {
  NotificationFeatureService as NotificationService,
  Notification,
} from '../../../common/notifications/services/notification-feature.service';
import {
  WorkflowService,
  ServiceRequest,
  NotificationMessage,
} from '../../../../core/services/workflow.service';

export interface RequestUpdate {
  srNumber: string;
  status: string;
  submittedDate: string;
}

export interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error';
  message: string;
  date: string;
}

export interface ExtendedNotification extends Notification {
  requestId?: string;
}

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notifications-page.component.html',
  styleUrl: './notifications-page.component.scss',
})
export class NotificationsPageComponent {
  private router = inject(Router);
  private modal = inject(NgbModal);
  private readonly pasApi = inject(PasApiService);
  private readonly notificationService = inject(NotificationService);
  private readonly workflowService = inject(WorkflowService);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly authService = inject(AuthService);

  searchQuery = '';
  filterType = 'all';
  notifications: ExtendedNotification[] = [];
  workflowNotifications: ExtendedNotification[] = [];

  constructor() {
    this.loadNotifications();
  }

  requestUpdates: RequestUpdate[] = [];
  systemAlerts: SystemAlert[] = [];

  loadNotifications(): void {
    // API
    this.notificationService.getNotifications().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.notifications = response.data.notifications;
        }
      },
      error: (err) => console.error('Error loading notifications:', err),
    });

    // Workflow
    const currentUser = this.currentUserService.getCurrentUserValue();
    if (currentUser?.id) {
      const role = this.authService.mapUserToDashboardRole(currentUser);
      const wfNotifs = this.workflowService.getNotificationsForUser(
        currentUser.id,
        this.mapRoleToWfRole(role),
      );
      this.workflowNotifications = wfNotifs.map((n: NotificationMessage) => ({
        id: n.id,
        message: n.message,
        isRead: n.isRead,
        sentDate: n.createdDate.toISOString(),
        isDeleted: false,
        type: n.type,
        requestId: n.requestId, // Add requestId here
      }));

      // Populate Request Updates
      const requests = this.workflowService.getRequestsForEmployee(currentUser.id);
      this.requestUpdates = requests.slice(0, 5).map((r: ServiceRequest) => ({
        srNumber: r.srNumber,
        status: r.status,
        submittedDate: r.submittedDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      }));
    }
  }

  private mapRoleToWfRole(role: string | null): any {
    if (role === 'manager') return 'Manager';
    if (role === 'admin') return 'Admin';
    if (role === 'compliance-officer') return 'Compliance';
    return 'Employee';
  }

  get filteredNotifications(): ExtendedNotification[] {
    let combined = [...this.notifications, ...this.workflowNotifications];

    // Sort by date descending
    combined.sort((a, b) => new Date(b.sentDate).getTime() - new Date(a.sentDate).getTime());

    if (this.searchQuery) {
      combined = combined.filter((n: Notification) =>
        n.message.toLowerCase().includes(this.searchQuery.toLowerCase()),
      );
    }

    if (this.filterType !== 'all') {
      // Optional: Filter by type if available in the model
    }

    return combined;
  }

  get unreadCount(): number {
    return this.notifications.filter((n) => !n.isRead).length;
  }

  markAllAsRead(): void {
    // API
    this.notificationService.markAllAsRead().subscribe(() => {
      this.notifications.forEach((n) => (n.isRead = true));
    });

    // Workflow
    const currentUser = this.currentUserService.getCurrentUserValue();
    if (currentUser?.id) {
      const role = this.mapRoleToWfRole(this.authService.mapUserToDashboardRole(currentUser));
      this.workflowService.markAllNotificationsAsRead(currentUser.id, role);
      this.workflowNotifications.forEach((n) => (n.isRead = true));
    }
  }

  markAsRead(id: string): void {
    // Check if it's a workflow notification (workflow IDs start with req_)
    if (id.startsWith('req_')) {
      this.workflowService.markNotificationAsRead(id);
      const notification = this.workflowNotifications.find((n) => n.id === id);
      if (notification) {
        notification.isRead = true;
      }
    } else {
      // API
      this.notificationService.markAsRead(id).subscribe(() => {
        const notification = this.notifications.find((n) => n.id === id);
        if (notification) {
          notification.isRead = true;
        }
      });
    }
  }

  dismiss(id: string): void {
    if (id.startsWith('req_')) {
      this.workflowService.dismissNotification(id);
      this.workflowNotifications = this.workflowNotifications.filter((n) => n.id !== id);
    } else {
      this.notificationService.deleteNotification(id).subscribe(() => {
        this.notifications = this.notifications.filter((n) => n.id !== id);
      });
    }
  }

  viewRequest(srNumber?: string): void {
    if (!srNumber) return;
    this.router.navigate(['/employee/dashboard/my-requests'], {
      queryParams: { search: srNumber },
    });
  }

  viewAllRequestUpdates(): void {
    this.router.navigate(['/employee/dashboard/my-requests']);
  }

  viewAllSystemAlerts(): void {
    // Navigate to a section or stay here and just show filter
    this.searchQuery = 'Alert';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString();
  }

  getNotificationIcon(message: string): string {
    const msg = message.toLowerCase();
    if (msg.includes('approved')) return '🟢';
    if (msg.includes('completed')) return '🔵';
    if (msg.includes('submitted')) return '🟡';
    if (msg.includes('rejected')) return '🔴';
    return '🔔';
  }

  getNotificationColor(message: string): string {
    const msg = message.toLowerCase();
    if (msg.includes('approved')) return 'green';
    if (msg.includes('completed')) return 'blue';
    if (msg.includes('submitted')) return 'yellow';
    if (msg.includes('rejected')) return 'red';
    return 'gray';
  }
}
