import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CalendarWidgetComponent } from '../../../../shared/components/calendar-widget/calendar-widget.component';
import { DashboardService, DashboardStatistics } from '../../../../core/services/dashboard.service';

type GRNStatus = 'Pending' | 'Received' | 'Rejected';
type Priority = 'Urgent' | 'Medium' | 'Normal';

interface GRN {
  readonly id: number;
  readonly grnNo: string;
  readonly supplier: string;
  readonly items: string;
  readonly date: string;
  readonly status: GRNStatus;
}

interface KPICard {
  readonly title: string;
  readonly value: string;
  readonly secondary: string;
  readonly trend: string;
  readonly color: string;
  readonly icon: string;
  readonly route: string;
}

interface PendingIssue {
  readonly id: string;
  readonly priority: Priority;
  readonly item: string;
  readonly quantity: number;
  readonly waitTime: string;
}

interface PendingReceiving {
  readonly id: string;
  readonly grnNo: string;
  readonly supplier: string;
  readonly items: string;
  readonly receivedTime: string;
}

interface RecentIssue {
  readonly sivNo: string;
  readonly item: string;
  readonly quantity: number;
  readonly department: string;
  readonly time: string;
}

interface RecentReceiving {
  readonly grnNo: string;
  readonly item: string;
  readonly quantity: number;
  readonly supplier: string;
  readonly time: string;
}

interface StockCategory {
  readonly name: string;
  readonly percentage: number;
  readonly units: number;
  readonly color: string;
}

@Component({
  selector: 'app-storekeeper-dashboard',
  standalone: true,
  imports: [RouterLink, CalendarWidgetComponent],
  templateUrl: './storekeeper-dashboard.component.html',
  styleUrl: './storekeeper-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorekeeperDashboardComponent implements OnInit {
  readonly router = inject(Router);
  private readonly dashboardService = inject(DashboardService);

  // Signals for reactive state
  readonly isLoading = signal(false);
  readonly statistics = signal<DashboardStatistics | null>(null);
  readonly kpiCards = signal<KPICard[]>([]);

  readonly defaultKPICards: KPICard[] = [
    {
      title: 'Total Items in Stock',
      value: '0',
      secondary: 'Loading...',
      trend: '---',
      color: 'orange',
      icon: 'bi bi-boxes',
      route: '/storekeeper/inventory',
    },
    {
      title: 'Pending Issues',
      value: '0',
      secondary: 'Loading...',
      trend: '---',
      color: 'red',
      icon: 'bi bi-arrow-up-circle',
      route: '/storekeeper/issuing/pending',
    },
    {
      title: 'Pending Receivings',
      value: '0',
      secondary: 'Loading...',
      trend: '---',
      color: 'yellow',
      icon: 'bi bi-arrow-down-circle',
      route: '/storekeeper/receiving/pending',
    },
    {
      title: 'Low Stock Alerts',
      value: '0',
      secondary: 'Loading...',
      trend: '---',
      color: 'red',
      icon: 'bi bi-exclamation-triangle',
      route: '/storekeeper/inventory/low-stock',
    },
    {
      title: 'Issued This Week',
      value: '0',
      secondary: 'Loading...',
      trend: '---',
      color: 'green',
      icon: 'bi bi-check-circle',
      route: '/storekeeper/reports/issuance',
    },
  ];

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading.set(true);
    this.dashboardService.getStatistics().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.statistics.set(response.data);
          this.updateKPICards(response.data);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.kpiCards.set(this.defaultKPICards);
        this.isLoading.set(false);
      }
    });
  }

  updateKPICards(stats: DashboardStatistics): void {
    this.kpiCards.set([
      {
        title: 'Total Items in Stock',
        value: stats.totalItems.toLocaleString(),
        secondary: 'Value: Calculating...',
        trend: '---',
        color: 'orange',
        icon: 'bi bi-boxes',
        route: '/storekeeper/inventory',
      },
      {
        title: 'Pending Issues',
        value: stats.pendingRequisitions.toString(),
        secondary: 'Urgent: 0',
        trend: '🔴',
        color: 'red',
        icon: 'bi bi-arrow-up-circle',
        route: '/storekeeper/issuing/pending',
      },
      {
        title: 'Pending Receivings',
        value: stats.pendingInspections.toString(),
        secondary: 'Awaiting inspection: 0',
        trend: '🟡',
        color: 'yellow',
        icon: 'bi bi-arrow-down-circle',
        route: '/storekeeper/receiving/pending',
      },
      {
        title: 'Low Stock Alerts',
        value: stats.lowStockItemsCount.toString(),
        secondary: 'Critical: 0',
        trend: '🔴',
        color: 'red',
        icon: 'bi bi-exclamation-triangle',
        route: '/storekeeper/inventory/low-stock',
      },
      {
        title: 'Issued This Week',
        value: stats.issuedRequisitions.toString(),
        secondary: 'VS last week',
        trend: '---',
        color: 'green',
        icon: 'bi bi-check-circle',
        route: '/storekeeper/reports/issuance',
      },
    ]);
  }

  readonly stockCategories: StockCategory[] = [
    { name: 'Electronics', percentage: 35, units: 4320, color: '#3B82F6' },
    { name: 'Furniture', percentage: 25, units: 3086, color: '#10B981' },
    { name: 'Office Supplies', percentage: 15, units: 1852, color: '#F59E0B' },
    { name: 'IT Equipment', percentage: 10, units: 1234, color: '#8B5CF6' },
    { name: 'Stationery', percentage: 8, units: 988, color: '#EC4899' },
    { name: 'Other', percentage: 7, units: 865, color: '#6B7280' },
  ];

  readonly pendingIssues: PendingIssue[] = [
    { id: 'SR-2024-0123', priority: 'Urgent', item: 'Laptop', quantity: 5, waitTime: '2 hours' },
    { id: 'SR-2024-0124', priority: 'Medium', item: 'Monitor', quantity: 3, waitTime: '5 hours' },
    { id: 'SR-2024-0125', priority: 'Normal', item: 'Keyboard', quantity: 10, waitTime: '1 day' },
    { id: 'SR-2024-0126', priority: 'Normal', item: 'Mouse', quantity: 15, waitTime: '1 day' },
  ];

  readonly pendingReceivings: PendingReceiving[] = [
    { id: '1', grnNo: 'GRN-2024-0456', supplier: 'Tech Supplies Ltd', items: 'Laptop (45 units)', receivedTime: '10:30 AM' },
    { id: '2', grnNo: 'GRN-2024-0457', supplier: 'Office Depot', items: 'Chair (30 units)', receivedTime: '09:15 AM' },
    { id: '3', grnNo: 'GRN-2024-0458', supplier: 'Global Suppliers', items: 'Paper (100 boxes)', receivedTime: '08:00 AM' },
  ];

  readonly recentIssues: RecentIssue[] = [
    { sivNo: 'SIV-0012', item: 'Laptop', quantity: 2, department: 'IT Dept', time: '10:15 AM' },
    { sivNo: 'SIV-0011', item: 'Monitor', quantity: 3, department: 'HR Dept', time: '09:30 AM' },
    { sivNo: 'SIV-0010', item: 'Keyboard', quantity: 5, department: 'Sales Dept', time: '08:45 AM' },
  ];

  readonly recentReceivings: RecentReceiving[] = [
    { grnNo: 'GRN-0456', item: 'Laptop', quantity: 45, supplier: 'Tech Supplies', time: '10:30 AM' },
    { grnNo: 'GRN-0455', item: 'Chair', quantity: 30, supplier: 'Office Depot', time: '09:15 AM' },
    { grnNo: 'GRN-0454', item: 'Paper', quantity: 100, supplier: 'Paper Co', time: '08:00 AM' },
  ];

  readonly recentGRNs: GRN[] = [
    {
      id: 1,
      grnNo: 'GRN-001',
      supplier: 'Tech Supplies',
      items: 'Laptop x5',
      date: '2024-04-28',
      status: 'Pending',
    },
    {
      id: 2,
      grnNo: 'GRN-002',
      supplier: 'XYZ Corp',
      items: 'Monitor x10',
      date: '2024-04-27',
      status: 'Received',
    },
    {
      id: 3,
      grnNo: 'GRN-003',
      supplier: 'ABC Supplies',
      items: 'Keyboard x20',
      date: '2024-04-26',
      status: 'Rejected',
    },
  ];

  readonly recentActivity: string[] = [
    'GRN #1234 received from Tech Supplies',
    'Stock level low for Item #5678',
    'SIV #9999 completed',
    'Warehouse A capacity updated',
  ];

  // Quick Scan Data
  isScanning = false;
  scannedItem = {
    name: 'Dell XPS Laptop',
    sku: 'LAP-DEL-XPS-001',
    location: 'Warehouse A - Aisle 12 - Shelf B-03',
    stock: 23,
  };

  getPriorityClass(priority: Priority): string {
    switch (priority) {
      case 'Urgent':
        return 'priority-urgent';
      case 'Medium':
        return 'priority-medium';
      case 'Normal':
        return 'priority-normal';
      default:
        return 'priority-normal';
    }
  }

  getPriorityIcon(priority: Priority): string {
    switch (priority) {
      case 'Urgent':
        return '🔴';
      case 'Medium':
        return '🟡';
      case 'Normal':
        return '🟢';
      default:
        return '🟢';
    }
  }

  processIssue(id: string): void {
    console.log(`Processing issue ${id}`);
    this.router.navigate(['/storekeeper/issuing/pending']);
  }

  startInspection(id: string): void {
    console.log(`Starting inspection for ${id}`);
    this.router.navigate(['/storekeeper/receiving/inspection']);
  }

  toggleScanner(): void {
    this.isScanning = !this.isScanning;
  }

  viewItemDetails(): void {
    console.log('Viewing item details');
  }

  issueItem(): void {
    console.log('Issuing item');
    this.router.navigate(['/storekeeper/issuing/create']);
  }

  transferStock(): void {
    console.log('Transferring stock');
    this.router.navigate(['/storekeeper/inventory/transfer']);
  }

  adjustStock(): void {
    console.log('Adjusting stock');
    this.router.navigate(['/storekeeper/inventory/adjustment']);
  }

  refreshData() {
    this.loadDashboardData();
  }

  viewAllGRNs() {
    this.router.navigate(['/storekeeper/receiving']);
  }

  receiveGRN(id: number) {
    const grn = this.recentGRNs.find(g => g.id === id);
    if (grn) {
      console.log(`Receiving GRN ${id}`);
    }
  }
}
