import { Component, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

import { NotificationService, Notification } from '../../services/notification-feature.service';

@Component({
  selector: 'app-notification-list',
  standalone: false,
  templateUrl: './notification-list.component.html',
  styleUrls: ['./notification-list.component.scss'],
  providers: [NotificationService]
})
export class NotificationListComponent {
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);
  
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
  
  isAdminRoute = computed(() => this.router.url.startsWith('/admin'));
  isStorekeeperRoute = computed(() => this.router.url.startsWith('/storekeeper'));

  currentFilter: 'all' | 'unread' | 'success' | 'warning' | 'error' = 'all';

  get filteredNotifications(): Notification[] {
    const notifications = this.notifications;
    
    switch (this.currentFilter) {
      case 'unread':
        return notifications.filter(n => !n.isRead);
      default:
        return notifications;
    }
  }

  setFilter(filter: 'all' | 'unread' | 'success' | 'warning' | 'error'): void {
    this.currentFilter = filter;
  }

  markAsRead(id: string): void {
    this.notificationService.markAsRead(id).subscribe(() => {
      const notification = this.notifications.find(n => n.id === id);
      if (notification) {
        notification.isRead = true;
      }
    });
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe(() => {
      this.notifications.forEach(n => n.isRead = true);
    });
  }

  deleteNotification(id: string): void {
    this.notificationService.deleteNotification(id).subscribe(() => {
      this.notifications = this.notifications.filter(n => n.id !== id);
    });
  }

  formatTime(timestamp: Date | string): string {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (hours < 24) {
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  }

  getIconClass(message: string): string {
    const msg = message.toLowerCase();
    if (msg.includes('success') || msg.includes('approved')) return 'bi-check-circle';
    if (msg.includes('warning') || msg.includes('pending')) return 'bi-exclamation-triangle';
    if (msg.includes('error') || msg.includes('rejected')) return 'bi-x-circle';
    if (msg.includes('info')) return 'bi-info-circle';
    return 'bi-bell';
  }

  getTypeClass(type: string): string {
    return `type-${type}`;
  }
}
