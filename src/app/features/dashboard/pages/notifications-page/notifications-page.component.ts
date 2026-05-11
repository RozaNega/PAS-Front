import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PasApiService } from '../../../../shared/services/pas-api.service';

import { NotificationService, Notification } from '../../../common/notifications/services/notification-feature.service';

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

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [NotificationService],
  templateUrl: './notifications-page.component.html',
  styleUrl: './notifications-page.component.scss',
})
export class NotificationsPageComponent {
  private router = inject(Router);
  private modal = inject(NgbModal);
  private readonly pasApi = inject(PasApiService);
  private readonly notificationService = inject(NotificationService);

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

  requestUpdates: RequestUpdate[] = [
    {
      srNumber: 'SR-2024-123',
      status: 'Pending Approval',
      submittedDate: 'Dec 15',
    },
    {
      srNumber: 'SR-2024-122',
      status: 'Pending Approval',
      submittedDate: 'Dec 14',
    },
  ];

  systemAlerts: SystemAlert[] = [];

  get filteredNotifications(): Notification[] {
    let filtered = this.notifications;
    
    if (this.searchQuery) {
      filtered = filtered.filter(
        (n: Notification) =>
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

  viewRequest(srNumber: string): void {
    // This assumes srNumber can be extracted from message or is part of the data
    // For now, navigating to requests list or a generic handler
    this.router.navigate(['/employee/requests/pending']);
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
