import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

type NotificationType = 'Info' | 'Success' | 'Warning';

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: string;
  read: boolean;
};

@Component({
  selector: 'app-notifications-page',
  templateUrl: './notifications-page.html',
  styleUrl: './notifications-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPage {
  readonly notifications = signal<NotificationItem[]>([
    {
      id: 1,
      title: 'Requisition Approved',
      message: 'REQ-2026-041 was approved by workflow manager.',
      type: 'Success',
      createdAt: '2 min ago',
      read: false,
    },
    {
      id: 2,
      title: 'Low Stock Alert',
      message: 'Stock for item ECX-BOX-101 is below minimum threshold.',
      type: 'Warning',
      createdAt: '14 min ago',
      read: false,
    },
    {
      id: 3,
      title: 'System Message',
      message: 'Daily synchronization completed successfully.',
      type: 'Info',
      createdAt: '1 hour ago',
      read: true,
    },
  ]);

  readonly unreadCount = computed(() => this.notifications().filter((item) => !item.read).length);

  markAllAsRead(): void {
    this.notifications.update((items) => items.map((item) => ({ ...item, read: true })));
  }
}
