import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { SignalRService } from '../../../../core/services/signalr.service';
import { DashboardService, DashboardStatistics } from '../../../../core/services/dashboard.service';
import { finalize } from 'rxjs';

type RequestStatus = 'Pending' | 'Approved' | 'Rejected';
type RequestFilter = 'All' | RequestStatus;
type OverviewPeriod = 'This Month' | 'This Week' | 'Today';

interface ManagerRequest {
  readonly id: number;
  readonly employeeName: string;
  readonly itemName: string;
  readonly quantity: number;
  readonly date: string;
  readonly status: RequestStatus;
}

interface SummaryCard {
  readonly icon: string;
  readonly tone: 'warning' | 'success' | 'danger' | 'info';
  readonly title: string;
  readonly value: number;
  readonly description: string;
}

interface OverviewSlice {
  readonly label: string;
  readonly value: number;
  readonly percent: number;
  readonly color: string;
}

interface ActivityItem {
  readonly title: string;
  readonly detail: string;
  readonly time: string;
  readonly avatar: string;
}

interface ApprovalItem {
  readonly id: string;
  readonly employeeName: string;
  readonly itemName: string;
  readonly status: RequestStatus;
  readonly date: string;
}

@Component({
  selector: 'app-manager-dashboard',
  templateUrl: './manager-dashboard.component.html',
  styleUrl: './manager-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagerDashboardComponent implements OnInit {
  private readonly signalRService = inject(SignalRService);
  private readonly dashboardService = inject(DashboardService);

  readonly isLoading = signal(false);
  readonly statistics = signal<DashboardStatistics | null>(null);

  readonly managerName = signal('Manager');
  readonly filters: RequestFilter[] = ['All', 'Pending', 'Approved', 'Rejected'];
  readonly selectedFilter = signal<RequestFilter>('Pending');
  readonly selectedPeriod = signal<OverviewPeriod>('This Month');

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
        }
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
      }
    });
  }

  readonly requests = signal<ManagerRequest[]>([
    {
      id: 123,
      employeeName: 'Emma Collins',
      itemName: 'Laptop',
      quantity: 1,
      date: 'Today',
      status: 'Pending',
    },
    {
      id: 124,
      employeeName: 'David Miles',
      itemName: 'Printer',
      quantity: 2,
      date: 'Apr 24, 2026',
      status: 'Rejected',
    },
    {
      id: 125,
      employeeName: 'Sophia Reed',
      itemName: 'Office Chair',
      quantity: 4,
      date: 'Today',
      status: 'Approved',
    },
    {
      id: 126,
      employeeName: 'Noah Bright',
      itemName: 'Monitor',
      quantity: 2,
      date: 'Apr 23, 2026',
      status: 'Pending',
    },
  ]);

  readonly recentActivity = signal<ActivityItem[]>([
    {
      title: 'Emma Collins submitted a request for Laptop',
      detail: 'Pending manager review',
      time: 'Apr 25, 2026 08:15 AM',
      avatar: 'EC',
    },
    {
      title: 'John Smith submitted a request for Office Chair',
      detail: 'Waiting in the approval queue',
      time: 'Apr 25, 2026 09:10 AM',
      avatar: 'JS',
    },
    {
      title: 'You approved request REQ-123',
      detail: 'Approval completed successfully',
      time: 'Apr 24, 2026 04:45 PM',
      avatar: 'YM',
    },
  ]);

  readonly approvals = signal<ApprovalItem[]>([
    {
      id: 'REQ-123',
      employeeName: 'Emma Collins',
      itemName: 'Laptop',
      status: 'Approved',
      date: 'Apr 24',
    },
    {
      id: 'REQ-124',
      employeeName: 'John Smith',
      itemName: 'Monitor',
      status: 'Rejected',
      date: 'Apr 24',
    },
    {
      id: 'REQ-125',
      employeeName: 'Emma Collins',
      itemName: 'Laptop',
      status: 'Pending',
      date: 'Apr 25',
    },
  ]);

  readonly summaryCards = computed<SummaryCard[]>(() => {
    const stats = this.statistics();
    const requests = this.requests();

    if (stats) {
      return [
        {
          icon: 'bi bi-clock-history',
          tone: 'warning',
          title: 'Pending Requests',
          value: stats.pendingRequisitions,
          description: 'Needs your action',
        },
        {
          icon: 'bi bi-check-circle',
          tone: 'success',
          title: 'Approved Requests',
          value: stats.approvedRequisitions,
          description: 'This month',
        },
        {
          icon: 'bi bi-x-circle',
          tone: 'danger',
          title: 'Rejected Requests',
          value: stats.rejectedRequisitions,
          description: 'This month',
        },
        {
          icon: 'bi bi-file-earmark-text',
          tone: 'info',
          title: 'Total Requests',
          value: stats.approvedRequisitions + stats.rejectedRequisitions + stats.pendingRequisitions,
          description: 'This month',
        },
      ];
    }

    return [
      {
        icon: 'bi bi-clock-history',
        tone: 'warning',
        title: 'Pending Requests',
        value: requests.filter((item) => item.status === 'Pending').length,
        description: 'Needs your action',
      },
      {
        icon: 'bi bi-check-circle',
        tone: 'success',
        title: 'Approved Requests',
        value: requests.filter((item) => item.status === 'Approved').length,
        description: 'This month',
      },
      {
        icon: 'bi bi-x-circle',
        tone: 'danger',
        title: 'Rejected Requests',
        value: requests.filter((item) => item.status === 'Rejected').length,
        description: 'This month',
      },
      {
        icon: 'bi bi-file-earmark-text',
        tone: 'info',
        title: 'Total Requests',
        value: requests.length,
        description: 'This month',
      },
    ];
  });

  readonly overviewSlices = computed<OverviewSlice[]>(() => {
    const requests = this.requests();
    const total = Math.max(requests.length, 1);
    const pending = requests.filter((item) => item.status === 'Pending').length;
    const approved = requests.filter((item) => item.status === 'Approved').length;
    const rejected = requests.filter((item) => item.status === 'Rejected').length;

    return [
      {
        label: 'Pending',
        value: pending,
        percent: Math.round((pending / total) * 100),
        color: '#fbbf24',
      },
      {
        label: 'Approved',
        value: approved,
        percent: Math.round((approved / total) * 100),
        color: '#16a34a',
      },
      {
        label: 'Rejected',
        value: rejected,
        percent: Math.round((rejected / total) * 100),
        color: '#ef4444',
      },
    ];
  });

  readonly overviewConicGradient = computed(() => {
    const slices = this.overviewSlices();
    const total = slices.reduce((sum, item) => sum + item.value, 0) || 1;
    let accumulated = 0;

    return slices
      .map((slice) => {
        const start = accumulated;
        const end = accumulated + (slice.value / total) * 100;
        accumulated = end;
        return `${slice.color} ${start}% ${end}%`;
      })
      .join(', ');
  });

  readonly filteredRequests = computed(() => {
    const activeFilter = this.selectedFilter();
    const requests = this.requests();

    if (activeFilter === 'All') {
      return requests;
    }

    return requests.filter((item) => item.status === activeFilter);
  });

  setFilter(filter: RequestFilter): void {
    this.selectedFilter.set(filter);
  }

  setPeriod(period: OverviewPeriod): void {
    this.selectedPeriod.set(period);
  }

  refresh(): void {
    this.prependActivity('You refreshed the approval queue', 'Queue refreshed', 'YM');
  }

  viewAllRequests(): void {
    this.selectedFilter.set('All');
  }

  approveRequest(id: number): void {
    this.updateRequestStatus(id, 'Approved');
    this.prependActivity(`You approved request #${id}`, 'Approval completed successfully', 'YM');
    this.signalRService.pushNotification({
      id: crypto.randomUUID(),
      message: `Request #${id} was approved`,
      type: 'success',
      sentDate: new Date(),
    });
  }

  rejectRequest(id: number): void {
    this.updateRequestStatus(id, 'Rejected');
    this.prependActivity(`You rejected request #${id}`, 'Request moved to rejected', 'YM');
    this.signalRService.pushNotification({
      id: crypto.randomUUID(),
      message: `Request #${id} was rejected`,
      type: 'error',
      sentDate: new Date(),
    });
  }

  private updateRequestStatus(id: number, status: RequestStatus): void {
    this.requests.update((items) =>
      items.map((item) => (item.id === id ? { ...item, status } : item)),
    );
  }

  private prependActivity(title: string, detail: string, avatar: string): void {
    this.recentActivity.update((items) => [
      {
        title,
        detail,
        time: this.formatActivityTime(),
        avatar,
      },
      ...items,
    ]);
  }

  private formatActivityTime(): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());
  }
}
