import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  NotificationFeatureService,
  Notification,
} from '../../../common/notifications/services/notification-feature.service';

export interface ApprovalRequest {
  srNumber: string;
  requester: string;
  priority: string;
  value: string;
}

export interface DepartmentAlert {
  message: string;
}

export interface BudgetAlert {
  message: string;
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

  searchQuery = '';
  filterType = 'all';

  notifications: Notification[] = [];

  constructor() {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.notificationService.getNotifications().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.notifications = response.data.notifications;
        }
      },
      error: (err) => console.error('Error loading notifications:', err)
    });
  }

  approvalRequests: ApprovalRequest[] = [];
  departmentAlerts: DepartmentAlert[] = [];
  budgetAlerts: BudgetAlert[] = [];

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

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe(() => {
      this.notifications.forEach((n) => (n.isRead = true));
    });
  }

  markAsRead(id: string): void {
    this.notificationService.markAsRead(id).subscribe(() => {
      const notification = this.notifications.find((n) => n.id === id);
      if (notification) {
        notification.isRead = true;
      }
    });
  }

  dismiss(id: string): void {
    this.notificationService.deleteNotification(id).subscribe(() => {
      this.notifications = this.notifications.filter((n) => n.id !== id);
    });
  }

  getNotificationIcon(message: string): string {
    const msg = message.toLowerCase();
    if (msg.includes('approval') || msg.includes('request')) return '✅';
    if (msg.includes('department')) return '🏢';
    if (msg.includes('budget')) return '💰';
    return '🔔';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleString();
  }

  getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'Urgent':
        return '🔴';
      case 'Medium':
        return '🟡';
      case 'Normal':
        return '🟢';
      default:
        return '⚪';
    }
  }

  approveRequest(srNumber?: string): void {
    if (srNumber) {
      this.approvalRequests = this.approvalRequests.filter(r => r.srNumber !== srNumber);
    }
  }

  rejectRequest(srNumber?: string): void {
    if (confirm(`Are you sure you want to reject request ${srNumber || 'N/A'}?`)) {
      if (srNumber) {
        this.approvalRequests = this.approvalRequests.filter(r => r.srNumber !== srNumber);
      }
    }
  }

  viewRequestDetails(srNumber?: string): void {
    void this.router.navigate(['/manager/approvals/pending']);
  }

  viewDepartmentRequest(): void {
    void this.router.navigate(['/manager/dashboard']);
  }

  viewBudget(): void {
    void this.router.navigate(['/manager/dashboard']);
  }

  viewAllApprovalRequests(): void {
    void this.router.navigate(['/manager/approvals/pending']);
  }
}
