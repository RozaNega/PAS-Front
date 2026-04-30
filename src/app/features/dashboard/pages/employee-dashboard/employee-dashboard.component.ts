import { ChangeDetectionStrategy, Component } from '@angular/core';
import { inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';

type RequestStatus = 'Pending' | 'Approved' | 'Rejected';

interface SummaryCard {
  readonly title: string;
  readonly value: number;
}

interface RecentRequest {
  readonly itemName: string;
  readonly quantity: number;
  readonly status: RequestStatus;
  readonly dateLabel: string;
}

interface RequestSummaryMetric {
  readonly label: string;
  readonly value: string;
}

interface CatalogItem {
  readonly name: string;
  readonly category: string;
  readonly availability: string;
}

type DashboardView =
  | 'home'
  | 'new-request'
  | 'my-requests'
  | 'my-requests-summary'
  | 'my-activity'
  | 'profile'
  | 'notifications'
  | 'catalog-items';

@Component({
  selector: 'app-employee-dashboard',
  imports: [RouterLink],
  templateUrl: './employee-dashboard.component.html',
  styleUrl: './employee-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeDashboardComponent {
  readonly router = inject(Router);
  readonly userName = 'User';

  readonly summaryCards: SummaryCard[] = [
    { title: 'Total', value: 24 },
    { title: 'Pending', value: 7 },
    { title: 'Approved', value: 13 },
    { title: 'Rejected', value: 4 },
  ];

  readonly recentRequests: RecentRequest[] = [
    {
      itemName: 'Laptop',
      quantity: 1,
      status: 'Pending',
      dateLabel: 'Today',
    },
    {
      itemName: 'Printer',
      quantity: 2,
      status: 'Approved',
      dateLabel: 'Apr 23, 2026',
    },
    {
      itemName: 'Monitor',
      quantity: 1,
      status: 'Rejected',
      dateLabel: 'Apr 22, 2026',
    },
  ];

  readonly notifications: string[] = ['Your request #123 approved', 'Request #124 rejected'];

  readonly catalogItems: CatalogItem[] = [
    { name: 'Laptop', category: 'IT Equipment', availability: 'Available' },
    { name: 'Office Chair', category: 'Furniture', availability: 'Available' },
    { name: 'Printer Toner', category: 'Consumables', availability: 'Low Stock' },
  ];

  readonly activities: string[] = [
    'Submitted service request SR-123',
    'Received approval for request SR-122',
    'Updated quantity for request SR-121',
  ];

  readonly requestSummaryMetrics: RequestSummaryMetric[] = [
    { label: 'Total Requests', value: '24' },
    { label: 'Approval Rate', value: '54%' },
    { label: 'Avg. Processing', value: '1.8 days' },
    { label: 'Rejected Rate', value: '16%' },
  ];

  get currentView(): DashboardView {
    if (this.router.url.includes('/employee/dashboard/new-request')) {
      return 'new-request';
    }

    if (this.router.url.includes('/employee/dashboard/my-requests-summary')) {
      return 'my-requests-summary';
    }

    if (this.router.url.includes('/employee/dashboard/my-activity')) {
      return 'my-activity';
    }

    if (this.router.url.includes('/employee/dashboard/my-requests')) {
      return 'my-requests';
    }

    if (this.router.url.includes('/employee/dashboard/profile')) {
      return 'profile';
    }

    if (this.router.url.includes('/employee/dashboard/notifications')) {
      return 'notifications';
    }

    if (this.router.url.includes('/employee/dashboard/catalog-items')) {
      return 'catalog-items';
    }

    return 'home';
  }

  get pageTitle(): string {
    if (this.currentView === 'my-requests-summary') {
      return 'Employee Dashboard - My Requests Summary';
    }

    if (this.currentView === 'my-activity') {
      return 'Employee Dashboard - My Activity';
    }

    if (this.currentView === 'new-request') {
      return 'Employee Dashboard - New Request';
    }

    if (this.currentView === 'my-requests') {
      return 'Employee Dashboard - My Requests';
    }

    if (this.currentView === 'profile') {
      return 'Employee Dashboard - Profile';
    }

    if (this.currentView === 'notifications') {
      return 'Employee Dashboard - Notifications';
    }

    if (this.currentView === 'catalog-items') {
      return 'Employee Dashboard - Catalog Items';
    }

    return 'Employee Dashboard';
  }

  get totalRequestedQuantity(): number {
    return this.recentRequests.reduce((sum, request) => sum + request.quantity, 0);
  }
}
