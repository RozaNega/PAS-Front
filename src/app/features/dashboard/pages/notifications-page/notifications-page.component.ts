import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { RequestDetailsModalComponent } from '../../components/request-details-modal/request-details-modal.component';

export interface Notification {
  id: string;
  type: 'approved' | 'completed' | 'submitted' | 'rejected';
  title: string;
  message: string;
  srNumber?: string;
  sivNumber?: string;
  timeAgo: string;
  read: boolean;
}

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
  templateUrl: './notifications-page.component.html',
  styleUrl: './notifications-page.component.scss',
})
export class NotificationsPageComponent {
  private modal = inject(NgbModal);

  searchQuery = '';
  filterType = 'all';
  notifications: Notification[] = [
    {
      id: '1',
      type: 'approved',
      title: 'Request Approved - SR-2024-121',
      message: 'Your request for Dell XPS Laptop has been approved. It has been forwarded to store for issue.',
      srNumber: 'SR-2024-121',
      timeAgo: '2 hours ago',
      read: false,
    },
    {
      id: '2',
      type: 'completed',
      title: 'Request Completed - SR-2024-120',
      message: 'Your request has been completed. Store Issue Voucher SIV-045 has been issued.',
      srNumber: 'SR-2024-120',
      sivNumber: 'SIV-045',
      timeAgo: '1 day ago',
      read: false,
    },
    {
      id: '3',
      type: 'submitted',
      title: 'Request Submitted - SR-2024-123',
      message: 'Your request has been submitted for approval. You will be notified once reviewed.',
      srNumber: 'SR-2024-123',
      timeAgo: '2 days ago',
      read: false,
    },
    {
      id: '4',
      type: 'approved',
      title: 'Request Approved - SR-2024-118',
      message: 'Your request for Office Chair has been approved.',
      srNumber: 'SR-2024-118',
      timeAgo: '3 days ago',
      read: true,
    },
    {
      id: '5',
      type: 'rejected',
      title: 'Request Rejected - SR-2024-117',
      message: 'Your request was rejected. Reason: Budget constraints for Q4.',
      srNumber: 'SR-2024-117',
      timeAgo: '5 days ago',
      read: true,
    },
  ];

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
      filtered = filtered.filter((n) =>
        n.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        n.message.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }

    if (this.filterType !== 'all') {
      filtered = filtered.filter((n) => n.type === this.filterType);
    }

    return filtered;
  }

  get unreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  markAllAsRead(): void {
    this.notifications.forEach((n) => (n.read = true));
  }

  markAsRead(id: string): void {
    const notification = this.notifications.find((n) => n.id === id);
    if (notification) {
      notification.read = true;
    }
  }

  dismiss(id: string): void {
    this.notifications = this.notifications.filter((n) => n.id !== id);
  }

  viewRequest(srNumber: string): void {
    const modalRef = this.modal.open(RequestDetailsModalComponent);
    // Note: In a real implementation, you would pass data to the modal
    // modalRef.componentInstance.requestDetails = { ... };
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'approved':
        return '🟢';
      case 'completed':
        return '🔵';
      case 'submitted':
        return '🟡';
      case 'rejected':
        return '🔴';
      default:
        return '🔔';
    }
  }

  getNotificationColor(type: string): string {
    switch (type) {
      case 'approved':
        return 'green';
      case 'completed':
        return 'blue';
      case 'submitted':
        return 'yellow';
      case 'rejected':
        return 'red';
      default:
        return 'gray';
    }
  }
}
