import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ManagerNotification {
  id: string;
  type: 'approval' | 'department' | 'budget';
  title: string;
  message: string;
  srNumber?: string;
  value?: string;
  timeAgo: string;
  read: boolean;
}

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
  searchQuery = '';
  filterType = 'all';

  notifications: ManagerNotification[] = [
    {
      id: '1',
      type: 'approval',
      title: 'Approval Request - SR-2024-123',
      message: 'John Doe has submitted an urgent request for approval. Value: $5,348',
      srNumber: 'SR-2024-123',
      value: '$5,348',
      timeAgo: '2 hours ago',
      read: false,
    },
    {
      id: '2',
      type: 'approval',
      title: 'Approval Request - SR-2024-122',
      message: 'Peter Chen has submitted a request for approval. Value: $2,800',
      srNumber: 'SR-2024-122',
      value: '$2,800',
      timeAgo: '3 hours ago',
      read: false,
    },
    {
      id: '3',
      type: 'department',
      title: 'Department Alert - New Staff Member',
      message: 'A new developer has joined your department. Please review onboarding equipment request.',
      timeAgo: '1 day ago',
      read: false,
    },
    {
      id: '4',
      type: 'budget',
      title: 'Budget Alert - IT Department',
      message: 'Department budget utilization has reached 65%. Remaining: $17,500',
      timeAgo: '2 days ago',
      read: false,
    },
    {
      id: '5',
      type: 'approval',
      title: 'Approval Request - SR-2024-121',
      message: 'Lisa Wong has submitted a request for approval. Value: $900',
      srNumber: 'SR-2024-121',
      value: '$900',
      timeAgo: '2 days ago',
      read: true,
    },
    {
      id: '6',
      type: 'approval',
      title: 'Approval Request - SR-2024-120',
      message: 'Mike Johnson has submitted a request for approval. Value: $250',
      srNumber: 'SR-2024-120',
      value: '$250',
      timeAgo: '3 days ago',
      read: true,
    },
    {
      id: '7',
      type: 'approval',
      title: 'Approval Request - SR-2024-119',
      message: 'Anna Lee has submitted a request for approval. Value: $250',
      srNumber: 'SR-2024-119',
      value: '$250',
      timeAgo: '3 days ago',
      read: true,
    },
    {
      id: '8',
      type: 'department',
      title: 'Department Alert - Quarterly Review',
      message: 'Quarterly department review meeting scheduled for Dec 20, 2024',
      timeAgo: '4 days ago',
      read: true,
    },
  ];

  approvalRequests: ApprovalRequest[] = [
    { srNumber: 'SR-2024-123', requester: 'John Doe', priority: 'Urgent', value: '$5,348' },
    { srNumber: 'SR-2024-122', requester: 'Peter Chen', priority: 'Urgent', value: '$2,800' },
    { srNumber: 'SR-2024-121', requester: 'Lisa Wong', priority: 'Medium', value: '$900' },
    { srNumber: 'SR-2024-120', requester: 'Mike Johnson', priority: 'Medium', value: '$250' },
    { srNumber: 'SR-2024-119', requester: 'Anna Lee', priority: 'Normal', value: '$250' },
  ];

  departmentAlerts: DepartmentAlert[] = [
    { message: 'New staff member joined - Review equipment request' },
    { message: 'Quarterly review meeting scheduled for Dec 20' },
  ];

  budgetAlerts: BudgetAlert[] = [
    { message: 'Department budget at 65% utilization - $17,500 remaining' },
  ];

  get filteredNotifications(): ManagerNotification[] {
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

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'approval':
        return '✅';
      case 'department':
        return '🏢';
      case 'budget':
        return '💰';
      default:
        return '🔔';
    }
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
    console.log('Approving request:', srNumber);
    alert(`Request ${srNumber || 'N/A'} has been approved.`);
  }

  rejectRequest(srNumber?: string): void {
    if (confirm(`Are you sure you want to reject request ${srNumber || 'N/A'}?`)) {
      console.log('Rejecting request:', srNumber);
      alert(`Request ${srNumber || 'N/A'} has been rejected.`);
    }
  }

  viewRequestDetails(srNumber?: string): void {
    console.log('Viewing details for request:', srNumber);
    alert(`Opening detailed view for request ${srNumber || 'N/A'}`);
  }

  viewDepartmentRequest(): void {
    console.log('Viewing department request');
    alert('Opening department request details');
  }

  viewBudget(): void {
    console.log('Viewing budget details');
    alert('Opening budget details');
  }

  viewAllApprovalRequests(): void {
    console.log('Viewing all approval requests');
    alert('Navigating to approval requests page');
  }
}
