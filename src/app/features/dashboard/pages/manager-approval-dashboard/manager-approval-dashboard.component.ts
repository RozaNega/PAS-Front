import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface KeyMetric {
  title: string;
  subtitle: string;
  value: number;
  trend: string;
  tone: 'red' | 'green' | 'blue' | 'yellow';
}

export interface PendingRequest {
  srNumber: string;
  requester: string;
  priority: 'Urgent' | 'Medium' | 'Normal';
  requestedDate: string;
  requiredDate: string;
  items: string;
  value: string;
}

export interface RecentActivity {
  date: string;
  action: string;
  srNumber: string;
  requester: string;
  value?: string;
  reason?: string;
}

export interface RequestTrendData {
  month: string;
  submitted: number;
  approved: number;
  rejected: number;
}

@Component({
  selector: 'app-manager-approval-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manager-approval-dashboard.component.html',
  styleUrl: './manager-approval-dashboard.component.scss',
})
export class ManagerApprovalDashboardComponent {
  currentDate = new Date();
  greeting = this.getGreeting();
  managerName = 'Sarah';

  keyMetrics: KeyMetric[] = [
    {
      title: 'Pending Approvals',
      subtitle: '',
      value: 5,
      trend: '🔴 Urgent: 2',
      tone: 'red',
    },
    {
      title: 'Approved This Week',
      subtitle: '',
      value: 8,
      trend: '▲ +15%',
      tone: 'green',
    },
    {
      title: 'Rejected This Week',
      subtitle: '',
      value: 2,
      trend: '▼ -1',
      tone: 'red',
    },
    {
      title: 'Avg Response Time',
      subtitle: '',
      value: 1.2,
      trend: '▼ -0.3 days',
      tone: 'blue',
    },
    {
      title: 'Budget Utilization',
      subtitle: '',
      value: 65,
      trend: '⚠️ Near Limit',
      tone: 'yellow',
    },
  ];

  pendingRequests: PendingRequest[] = [
    {
      srNumber: 'SR-2024-123',
      requester: 'John Doe',
      priority: 'Urgent',
      requestedDate: 'Dec 15, 2024',
      requiredDate: 'Dec 18',
      items: 'Laptop (2), Monitor (1)',
      value: '$5,348',
    },
    {
      srNumber: 'SR-2024-122',
      requester: 'Peter Chen',
      priority: 'Urgent',
      requestedDate: 'Dec 14, 2024',
      requiredDate: 'Dec 17',
      items: 'Server Rack (1)',
      value: '$2,800',
    },
    {
      srNumber: 'SR-2024-121',
      requester: 'Lisa Wong',
      priority: 'Medium',
      requestedDate: 'Dec 13, 2024',
      requiredDate: 'Dec 20',
      items: 'Office Chair (2)',
      value: '$900',
    },
    {
      srNumber: 'SR-2024-120',
      requester: 'Mike Johnson',
      priority: 'Medium',
      requestedDate: 'Dec 12, 2024',
      requiredDate: 'Dec 21',
      items: 'USB Cables (50)',
      value: '$250',
    },
    {
      srNumber: 'SR-2024-119',
      requester: 'Anna Lee',
      priority: 'Normal',
      requestedDate: 'Dec 11, 2024',
      requiredDate: 'Dec 22',
      items: 'A4 Paper (10)',
      value: '$250',
    },
  ];

  recentActivity: RecentActivity[] = [
    {
      date: 'Dec 14, 2024',
      action: 'You approved',
      srNumber: 'SR-2024-118',
      requester: 'John Doe',
      value: '$450',
    },
    {
      date: 'Dec 13, 2024',
      action: 'You rejected',
      srNumber: 'SR-2024-117',
      requester: 'Lisa Wong',
      reason: 'Budget issue',
    },
    {
      date: 'Dec 12, 2024',
      action: 'You approved',
      srNumber: 'SR-2024-116',
      requester: 'Peter Chen',
      value: '$2,499',
    },
    {
      date: 'Dec 11, 2024',
      action: 'New urgent request from',
      srNumber: '',
      requester: 'John Doe',
    },
    {
      date: 'Dec 10, 2024',
      action: 'You approved',
      srNumber: 'SR-2024-115',
      requester: 'Mike Johnson',
      value: '$350',
    },
  ];

  requestTrendData: RequestTrendData[] = [
    { month: 'Jan', submitted: 8, approved: 7, rejected: 1 },
    { month: 'Feb', submitted: 6, approved: 5, rejected: 1 },
    { month: 'Mar', submitted: 10, approved: 9, rejected: 1 },
    { month: 'Apr', submitted: 8, approved: 7, rejected: 1 },
    { month: 'May', submitted: 6, approved: 5, rejected: 1 },
    { month: 'Jun', submitted: 12, approved: 10, rejected: 2 },
    { month: 'Jul', submitted: 10, approved: 9, rejected: 1 },
    { month: 'Aug', submitted: 8, approved: 7, rejected: 1 },
    { month: 'Sep', submitted: 6, approved: 5, rejected: 1 },
    { month: 'Oct', submitted: 8, approved: 7, rejected: 1 },
    { month: 'Nov', submitted: 6, approved: 5, rejected: 1 },
    { month: 'Dec', submitted: 8, approved: 7, rejected: 1 },
  ];

  getGreeting(): string {
    const hour = this.currentDate.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }

  get submittedPoints(): string {
    return this.requestTrendData.map((data, i) => `${50 + i * 45},${180 - data.submitted * 10}`).join(' ');
  }

  get approvedPoints(): string {
    return this.requestTrendData.map((data, i) => `${50 + i * 45},${180 - data.approved * 10}`).join(' ');
  }

  get rejectedPoints(): string {
    return this.requestTrendData.map((data, i) => `${50 + i * 45},${180 - data.rejected * 10}`).join(' ');
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

  getActivityIcon(action: string): string {
    if (action.includes('approved')) return '🟢';
    if (action.includes('rejected')) return '🔴';
    if (action.includes('New')) return '🟡';
    return '🔵';
  }

  approveRequest(srNumber: string): void {
    console.log('Approving request:', srNumber);
    alert(`Request ${srNumber} has been approved.`);
  }

  rejectRequest(srNumber: string): void {
    if (confirm(`Are you sure you want to reject request ${srNumber}?`)) {
      console.log('Rejecting request:', srNumber);
      alert(`Request ${srNumber} has been rejected.`);
    }
  }

  viewRequestDetails(srNumber: string): void {
    console.log('Viewing details for request:', srNumber);
    alert(`Opening detailed view for request ${srNumber}`);
  }

  viewAllRequests(): void {
    console.log('Viewing all pending requests');
    alert('Navigating to full pending requests list');
  }

  viewAllActivity(): void {
    console.log('Viewing all recent activity');
    alert('Navigating to full activity log');
  }
}
