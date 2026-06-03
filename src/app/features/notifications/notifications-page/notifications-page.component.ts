import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { NotificationsService } from '../../../core/services/notifications.service';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  module?: string;
}

@Component({
  selector: 'app-notifications-page',
  templateUrl: './notifications-page.component.html',
  styleUrls: ['./notifications-page.component.scss'],
})
export class NotificationsPageComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  isLoading = false;
  searchTerm = '';
  filterType: 'all' | 'unread' | 'read' = 'all';

  private destroy$ = new Subject<void>();

  get filteredNotifications(): Notification[] {
    let filtered = this.notifications;
    if (this.filterType === 'unread') {
      filtered = filtered.filter((n) => !n.isRead);
    } else if (this.filterType === 'read') {
      filtered = filtered.filter((n) => n.isRead);
    }
    return filtered;
  }

  get unreadCount(): number {
    return this.notifications.filter((n) => !n.isRead).length;
  }

  constructor(
    private notificationsService: NotificationsService,
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadNotifications(): void {
    this.isLoading = true;
    this.notificationsService.getNotifications().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.notifications = response.data as unknown as Notification[];
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  markAsRead(notification: Notification): void {
    if (notification.isRead) return;
    this.notificationsService.markAsRead(String(notification.id)).subscribe({
      next: () => {
        notification.isRead = true;
      },
    });
  }

  markAllAsRead(): void {
    const unreadIds = this.notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length === 0) return;
    this.notificationsService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach((n) => (n.isRead = true));
      },
    });
  }

  deleteNotification(notification: Notification): void {
    this.notificationsService.deleteNotification(notification.id).subscribe({
      next: () => {
        this.notifications = this.notifications.filter((n) => n.id !== notification.id);
      },
    });
  }

  setFilterType(type: 'all' | 'unread' | 'read'): void {
    this.filterType = type;
  }

  refresh(): void {
    this.loadNotifications();
  }
}
