import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import {
  RequestSummaryCard,
  PendingRequest,
  RecentActivity,
  RequestTrendData,
  QuickLink,
  ServiceRequest,
  CatalogItem,
} from '../../../../types/dashboard.types';
import { CreateRequestModalComponent } from '../../components/create-request-modal/create-request-modal.component';
import { DashboardService, DashboardStatistics } from '../../../../core/services/dashboard.service';
import { finalize } from 'rxjs';

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
export class EmployeeDashboardComponent implements OnInit {
  readonly router = inject(Router);
  readonly modalService = inject(NgbModal);
  private readonly dashboardService = inject(DashboardService);

  readonly isLoading = signal(false);
  readonly statistics = signal<DashboardStatistics | null>(null);

  readonly userName = 'John';
  readonly currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  readonly greeting = this.getGreeting();

  readonly summaryCards = signal<RequestSummaryCard[]>([
    {
      title: 'Total Requests',
      value: 0,
      subtitle: 'This Month',
      trend: 'Loading...',
      icon: 'bi-clipboard2-data',
      tone: 'blue',
    },
    {
      title: 'Pending',
      value: 0,
      subtitle: 'Approval',
      trend: 'Loading...',
      icon: 'bi-clock-history',
      tone: 'amber',
    },
    {
      title: 'Approved',
      value: 0,
      subtitle: '',
      trend: 'Loading...',
      icon: 'bi-check-circle',
      tone: 'green',
    },
    {
      title: 'Rejected',
      value: 0,
      subtitle: '',
      trend: 'Loading...',
      icon: 'bi-x-circle',
      tone: 'rose',
    },
    {
      title: 'Completed',
      value: 0,
      subtitle: '',
      trend: 'Loading...',
      icon: 'bi-check2-all',
      tone: 'green',
    },
  ]);

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading.set(true);
    this.dashboardService.getStatistics().pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.statistics.set(response.data);
          this.updateSummaryCards(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
      }
    });
  }

  updateSummaryCards(stats: DashboardStatistics): void {
    this.summaryCards.set([
      {
        title: 'Total Requests',
        value: stats.approvedRequisitions + stats.rejectedRequisitions + stats.pendingRequisitions,
        subtitle: 'This Month',
        trend: '▲ +0 from last month',
        icon: 'bi-clipboard2-data',
        tone: 'blue',
      },
      {
        title: 'Pending',
        value: stats.pendingRequisitions,
        subtitle: 'Approval',
        trend: '🔴 Urgent: 0',
        icon: 'bi-clock-history',
        tone: 'amber',
      },
      {
        title: 'Approved',
        value: stats.approvedRequisitions,
        subtitle: '',
        trend: '🟢 Ready',
        icon: 'bi-check-circle',
        tone: 'green',
      },
      {
        title: 'Rejected',
        value: stats.rejectedRequisitions,
        subtitle: '',
        trend: '● Same',
        icon: 'bi-x-circle',
        tone: 'rose',
      },
      {
        title: 'Completed',
        value: stats.completedRequisitions,
        subtitle: '',
        trend: '✅ Done',
        icon: 'bi-check2-all',
        tone: 'green',
      },
    ]);
  }

  readonly pendingRequests: PendingRequest[] = [
    {
      srNumber: 'SR-2024-123',
      priority: 'Urgent',
      requestedDate: 'Dec 15, 2024',
      waitingTime: '2 hours',
      requiredDate: 'Dec 18, 2024',
      items: ['Dell XPS Laptop (2)', 'HP Monitor (1)'],
      status: 'Pending',
    },
    {
      srNumber: 'SR-2024-122',
      priority: 'Medium',
      requestedDate: 'Dec 14, 2024',
      waitingTime: '1 day',
      requiredDate: 'Dec 20, 2024',
      items: ['Office Chair (2)', 'Desk (1)'],
      status: 'Pending',
    },
  ];

  readonly recentActivity: RecentActivity[] = [
    {
      date: 'Dec 14, 2024',
      description: 'Your request SR-2024-121 was approved',
      type: 'approved',
    },
    {
      date: 'Dec 13, 2024',
      description: 'Your request SR-2024-120 was completed (SIV-045 issued)',
      type: 'completed',
    },
    {
      date: 'Dec 12, 2024',
      description: 'Your request SR-2024-119 was submitted for approval',
      type: 'submitted',
    },
    {
      date: 'Dec 10, 2024',
      description: 'Your request SR-2024-118 was approved',
      type: 'approved',
    },
    {
      date: 'Dec 08, 2024',
      description: 'Your request SR-2024-117 was rejected (Reason: Budget constraints)',
      type: 'rejected',
    },
  ];

  readonly requestTrendData: RequestTrendData[] = [
    { month: 'Jul', submitted: 3, approved: 2, completed: 2, rejected: 0 },
    { month: 'Aug', submitted: 4, approved: 3, completed: 3, rejected: 1 },
    { month: 'Sep', submitted: 5, approved: 4, completed: 4, rejected: 0 },
    { month: 'Oct', submitted: 6, approved: 5, completed: 5, rejected: 1 },
    { month: 'Nov', submitted: 7, approved: 6, completed: 6, rejected: 0 },
    { month: 'Dec', submitted: 5, approved: 2, completed: 1, rejected: 0 },
  ];

  readonly quickLinks: QuickLink[] = [
    { label: 'Create New Request', icon: 'bi-plus-lg', route: '/employee/dashboard/new-request' },
    { label: 'My Requests', icon: 'bi-clipboard-list', route: '/employee/dashboard/my-requests' },
    { label: 'Available Items', icon: 'bi-box-seam', route: '/employee/dashboard/catalog-items' },
    { label: 'My Profile', icon: 'bi-person', route: '/employee/dashboard/profile' },
  ];

  readonly myRequests: ServiceRequest[] = [
    {
      srNumber: 'SR-2024-123',
      date: 'Dec 15',
      items: 3,
      priority: 'Urgent',
      status: 'Pending',
      requiredBy: 'Dec 18, 2024',
      requester: 'John Doe',
      department: 'IT Department',
      justification: 'New equipment for project',
    },
    {
      srNumber: 'SR-2024-122',
      date: 'Dec 14',
      items: 2,
      priority: 'Medium',
      status: 'Pending',
      requiredBy: 'Dec 20, 2024',
      requester: 'John Doe',
      department: 'IT Department',
      justification: 'Office furniture',
    },
    {
      srNumber: 'SR-2024-121',
      date: 'Dec 13',
      items: 1,
      priority: 'Normal',
      status: 'Approved',
      requiredBy: 'Dec 19, 2024',
      requester: 'John Doe',
      department: 'IT Department',
      justification: 'New equipment for intern',
    },
    {
      srNumber: 'SR-2024-120',
      date: 'Dec 12',
      items: 2,
      priority: 'Medium',
      status: 'Completed',
      requiredBy: 'Dec 15, 2024',
      requester: 'John Doe',
      department: 'IT Department',
      justification: 'Monitor upgrade',
    },
    {
      srNumber: 'SR-2024-119',
      date: 'Dec 10',
      items: 3,
      priority: 'Normal',
      status: 'Rejected',
      requiredBy: 'Dec 14, 2024',
      requester: 'John Doe',
      department: 'IT Department',
      justification: 'Additional supplies',
    },
    {
      srNumber: 'SR-2024-118',
      date: 'Dec 08',
      items: 1,
      priority: 'Normal',
      status: 'Approved',
      requiredBy: 'Dec 12, 2024',
      requester: 'John Doe',
      department: 'IT Department',
      justification: 'Laptop replacement',
    },
  ];

  readonly catalogItems: CatalogItem[] = [
    {
      sku: 'LAP-001',
      name: 'Dell XPS Laptop',
      category: 'Electronics',
      available: 45,
      status: 'Good',
      lastRestocked: 'Dec 15, 2024',
      uom: 'PCS',
      location: 'Warehouse A',
    },
    {
      sku: 'MON-002',
      name: 'HP 27" Monitor',
      category: 'Electronics',
      available: 67,
      status: 'Good',
      lastRestocked: 'Dec 14, 2024',
      uom: 'PCS',
      location: 'Warehouse A',
    },
    {
      sku: 'CHR-003',
      name: 'Office Chair',
      category: 'Furniture',
      available: 23,
      status: 'Low',
      lastRestocked: 'Dec 10, 2024',
      uom: 'PCS',
      location: 'Warehouse B',
    },
    {
      sku: 'CAB-004',
      name: 'USB Cables (10-pack)',
      category: 'Supplies',
      available: 55,
      status: 'Good',
      lastRestocked: 'Dec 12, 2024',
      uom: 'PCS',
      location: 'Warehouse A',
    },
    {
      sku: 'PAP-005',
      name: 'A4 Paper',
      category: 'Stationery',
      available: 120,
      status: 'Good',
      lastRestocked: 'Dec 08, 2024',
      uom: 'PCS',
      location: 'Warehouse A',
    },
  ];

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

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
      return 'My Requests Summary';
    }

    if (this.currentView === 'my-activity') {
      return 'My Activity';
    }

    if (this.currentView === 'new-request') {
      return 'Create New Request';
    }

    if (this.currentView === 'my-requests') {
      return 'My Requisitions';
    }

    if (this.currentView === 'profile') {
      return 'My Profile';
    }

    if (this.currentView === 'notifications') {
      return 'Notifications';
    }

    if (this.currentView === 'catalog-items') {
      return 'Available Items';
    }

    return 'Employee Dashboard';
  }

  get pageSubtitle(): string {
    if (this.currentView === 'home') {
      return 'My request summary and recent activity';
    }

    if (this.currentView === 'my-requests') {
      return 'View and manage all my service requests';
    }

    if (this.currentView === 'catalog-items') {
      return 'Browse all items and check availability';
    }

    if (this.currentView === 'profile') {
      return 'Personal information and request history';
    }

    return '';
  }

  getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'Urgent':
        return '🔴';
      case 'Medium':
        return '🟡';
      case 'Normal':
      default:
        return '🟢';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'Approved':
        return '🟢';
      case 'Rejected':
        return '🔴';
      case 'Completed':
        return '✅';
      case 'Pending':
      default:
        return '⏳';
    }
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'approved':
        return '🟢';
      case 'rejected':
        return '🔴';
      case 'completed':
        return '🔵';
      case 'submitted':
      default:
        return '🟡';
    }
  }

  openCreateRequestModal(): void {
    const modalRef = this.modalService.open(CreateRequestModalComponent, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
    });

    modalRef.result.then(
      (result) => {
        console.log('Modal closed with result:', result);
      },
      (reason) => {
        console.log('Modal dismissed');
      }
    );
  }

  trackRequest(srNumber: string): void {
    console.log('Tracking request:', srNumber);
    alert(`Tracking request ${srNumber} - This would open a detailed view of the request status.`);
  }

  cancelRequest(srNumber: string): void {
    if (confirm(`Are you sure you want to cancel request ${srNumber}?`)) {
      console.log('Cancelling request:', srNumber);
      alert(`Request ${srNumber} has been cancelled.`);
    }
  }

  editProfile(): void {
    console.log('Editing profile');
    alert('Profile edit functionality would open an edit modal here.');
  }

  submitRequest(): void {
    console.log('Submitting request');
    alert('Request submitted successfully!');
  }
}
