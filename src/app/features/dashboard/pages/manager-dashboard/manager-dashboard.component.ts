import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { SignalRService } from '../../../../core/services/signalr.service';

type RequestStatus = 'Pending' | 'Approved' | 'Rejected';
type RequestFilter = 'All' | RequestStatus;

interface ManagerRequest {
  readonly id: number;
  readonly employeeName: string;
  readonly itemName: string;
  readonly quantity: number;
  readonly date: string;
  readonly status: RequestStatus;
}

interface SummaryCard {
  readonly title: string;
  readonly value: number;
}

@Component({
  selector: 'app-manager-dashboard',
  templateUrl: './manager-dashboard.component.html',
  styleUrl: './manager-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagerDashboardComponent {
  private readonly signalRService = inject(SignalRService);

  readonly managerName = signal('Manager');
  readonly filters: RequestFilter[] = ['All', 'Pending', 'Approved', 'Rejected'];
  readonly selectedFilter = signal<RequestFilter>('Pending');

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

  readonly recentActivity = signal<string[]>([
    'You approved request #123',
    'You rejected request #124',
  ]);

  readonly summaryCards = computed<SummaryCard[]>(() => {
    const requests = this.requests();

    return [
      {
        title: 'Pending Requests',
        value: requests.filter((item) => item.status === 'Pending').length,
      },
      {
        title: 'Approved Requests',
        value: requests.filter((item) => item.status === 'Approved').length,
      },
      {
        title: 'Rejected Requests',
        value: requests.filter((item) => item.status === 'Rejected').length,
      },
      {
        title: 'Total Requests',
        value: requests.length,
      },
    ];
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

  refresh(): void {
    this.recentActivity.update((items) => ['You refreshed the manager dashboard', ...items]);
  }

  viewAllRequests(): void {
    this.selectedFilter.set('All');
  }

  approveRequest(id: number): void {
    this.updateRequestStatus(id, 'Approved');
    this.recentActivity.update((items) => [`You approved request #${id}`, ...items]);
    this.signalRService.pushNotification({
      id: crypto.randomUUID(),
      message: `Request #${id} was approved`,
      type: 'success',
      sentDate: new Date(),
    });
  }

  rejectRequest(id: number): void {
    this.updateRequestStatus(id, 'Rejected');
    this.recentActivity.update((items) => [`You rejected request #${id}`, ...items]);
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
}
