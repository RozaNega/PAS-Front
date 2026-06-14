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

  currentPage = 1;
  pageSize = 10;

  filterTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'completed', label: 'Completed' },
  ];

  constructor() {
    this.loadNotifications();
  }

  requestUpdates: RequestUpdate[] = [];
  systemAlerts: SystemAlert[] = [];

  loadNotifications(): void {
    this.notificationService.getNotifications().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.notifications = response.data.notifications;
        }
      },
      error: (err) => console.error('Error loading notifications:', err),
    });

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
        requestId: n.requestId,
      }));

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

    combined.sort((a, b) => new Date(b.sentDate).getTime() - new Date(a.sentDate).getTime());

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      combined = combined.filter((n) => n.message.toLowerCase().includes(q));
    }

    if (this.filterType !== 'all') {
      combined = combined.filter((n) =>
        n.message.toLowerCase().includes(this.filterType),
      );
    }

    return combined;
  }

  get paginatedNotifications(): ExtendedNotification[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredNotifications.slice(start, start + this.pageSize);
  }

  get totalNotifications(): number {
    return this.filteredNotifications.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalNotifications / this.pageSize));
  }

  get paginationStart(): number {
    return this.totalNotifications === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get paginationEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalNotifications);
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.totalPages;
    const current = this.currentPage;

    if (total <= 5) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, current - 1);
      let end = Math.min(total - 1, current + 1);
      if (current <= 2) { start = 2; end = 4; }
      if (current >= total - 1) { start = total - 3; end = total - 1; }
      if (start > 2) pages.push(-1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < total - 1) pages.push(-2);
      pages.push(total);
    }
    return pages;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  setFilter(type: string): void {
    this.filterType = type;
    this.currentPage = 1;
  }

  onSearchInput(): void {
    this.currentPage = 1;
  }

  get unreadCount(): number {
    return this.notifications.filter((n) => !n.isRead).length;
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe(() => {
      this.notifications.forEach((n) => (n.isRead = true));
    });

    const currentUser = this.currentUserService.getCurrentUserValue();
    if (currentUser?.id) {
      const role = this.mapRoleToWfRole(this.authService.mapUserToDashboardRole(currentUser));
      this.workflowService.markAllNotificationsAsRead(currentUser.id, role);
      this.workflowNotifications.forEach((n) => (n.isRead = true));
    }
  }

  markAsRead(id: string): void {
    if (id.startsWith('req_')) {
      this.workflowService.markNotificationAsRead(id);
      const notification = this.workflowNotifications.find((n) => n.id === id);
      if (notification) {
        notification.isRead = true;
      }
    } else {
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

  viewRequestBySr(srNumber: string): void {
    this.router.navigate(['/employee/dashboard/my-requests'], {
      queryParams: { search: srNumber },
    });
  }

  viewAllRequestUpdates(): void {
    this.router.navigate(['/employee/dashboard/my-requests']);
  }

  viewAllSystemAlerts(): void {
    this.searchQuery = 'Alert';
  }

  formatDate(date: string): string {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: 'numeric',
      minute: '2-digit',
    });
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
    if (msg.includes('approved')) return 'approved';
    if (msg.includes('completed')) return 'completed';
    if (msg.includes('submitted')) return 'submitted';
    if (msg.includes('rejected')) return 'rejected';
    return 'info';
  }

  getNotificationType(message: string): string {
    const msg = message.toLowerCase();
    if (msg.includes('approved')) return 'Approved';
    if (msg.includes('rejected')) return 'Rejected';
    if (msg.includes('submitted')) return 'Submitted';
    if (msg.includes('completed')) return 'Completed';
    return 'Info';
  }

  getNotificationTitle(message: string): string {
    return message.length > 60 ? message.substring(0, 60) + '...' : message;
  }

  getStatusClass(status: string): string {
    const s = status.toLowerCase();
    if (s.includes('approv')) return 'approved';
    if (s.includes('reject')) return 'rejected';
    if (s.includes('submit')) return 'submitted';
    if (s.includes('complet') || s.includes('fulfill')) return 'completed';
    if (s.includes('progress') || s.includes('pending')) return 'pending';
    return 'info';
  }
}
