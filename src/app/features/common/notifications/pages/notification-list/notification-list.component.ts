import { Component, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  timestamp: Date;
  read: boolean;
}

@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-list.component.html',
  styleUrls: ['./notification-list.component.scss']
})
export class NotificationListComponent {
  private readonly router = inject(Router);
  
  isAdminRoute = computed(() => this.router.url.startsWith('/admin'));
  isStorekeeperRoute = computed(() => this.router.url.startsWith('/storekeeper'));

  currentFilter: 'all' | 'unread' | 'success' | 'warning' | 'error' = 'all';

  // Admin notifications
  adminNotifications: Notification[] = [
    {
      id: '1',
      title: 'New Property Added',
      message: 'Property "Sunset Villas" has been successfully added to the system.',
      type: 'success',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      read: false
    },
    {
      id: '2',
      title: 'User Approval Request',
      message: '3 new users awaiting approval for admin access.',
      type: 'warning',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      read: false
    },
    {
      id: '3',
      title: 'System Backup Completed',
      message: 'Daily backup completed successfully. Database size: 2.4GB',
      type: 'success',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      read: true
    },
    {
      id: '4',
      title: 'Security Alert',
      message: 'Multiple failed login attempts detected from unknown IP address.',
      type: 'error',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
      read: true
    },
    {
      id: '5',
      title: 'Compliance Report Ready',
      message: 'Monthly compliance report is ready for review.',
      type: 'info',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
      read: true
    }
  ];

  // Storekeeper notifications
  storekeeperNotifications: Notification[] = [
    {
      id: '1',
      title: 'Urgent: Stock Issuance Pending',
      message: '3 urgent stock issuance requests need immediate attention.',
      type: 'warning',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      read: false
    },
    {
      id: '2',
      title: 'New GRN Received',
      message: 'GRN-2024-0456 received from Tech Supplies Ltd. Ready for inspection.',
      type: 'success',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      read: false
    },
    {
      id: '3',
      title: 'Low Stock Alert',
      message: 'Laptop stock is critically low (5 units). Minimum threshold: 20 units.',
      type: 'error',
      timestamp: new Date(Date.now() - 1000 * 60 * 45),
      read: false
    },
    {
      id: '4',
      title: 'Warehouse Transfer Completed',
      message: 'Transfer of 50 monitors from Warehouse A to Warehouse B completed.',
      type: 'success',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      read: true
    },
    {
      id: '5',
      title: 'Shelf Maintenance Due',
      message: 'Shelf A-12-B in Warehouse A requires maintenance inspection.',
      type: 'info',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
      read: true
    }
  ];

  get notifications(): Notification[] {
    if (this.isAdminRoute()) {
      return this.adminNotifications;
    }
    if (this.isStorekeeperRoute()) {
      return this.storekeeperNotifications;
    }
    return this.adminNotifications;
  }

  get filteredNotifications(): Notification[] {
    const notifications = this.notifications;
    
    switch (this.currentFilter) {
      case 'unread':
        return notifications.filter(n => !n.read);
      case 'success':
        return notifications.filter(n => n.type === 'success');
      case 'warning':
        return notifications.filter(n => n.type === 'warning');
      case 'error':
        return notifications.filter(n => n.type === 'error');
      default:
        return notifications;
    }
  }

  setFilter(filter: 'all' | 'unread' | 'success' | 'warning' | 'error'): void {
    this.currentFilter = filter;
  }

  markAsRead(id: string): void {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
  }

  deleteNotification(id: string): void {
    if (this.isAdminRoute()) {
      this.adminNotifications = this.adminNotifications.filter(n => n.id !== id);
    } else {
      this.storekeeperNotifications = this.storekeeperNotifications.filter(n => n.id !== id);
    }
  }

  formatTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
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

  getIconClass(type: string): string {
    switch (type) {
      case 'success':
        return 'bi-check-circle';
      case 'warning':
        return 'bi-exclamation-triangle';
      case 'error':
        return 'bi-x-circle';
      case 'info':
        return 'bi-info-circle';
      default:
        return 'bi-bell';
    }
  }

  getTypeClass(type: string): string {
    return `type-${type}`;
  }
}
