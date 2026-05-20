import { ChangeDetectionStrategy, Component, inject, signal, DestroyRef, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CalendarWidgetComponent } from '../../../../shared/components/calendar-widget/calendar-widget.component';

type RequisitionStatus = 'Pending' | 'Approved' | 'Rejected' | 'Completed' | 'Issued';

interface Requisition {
  readonly id: number;
  readonly requestor: string;
  readonly item: string;
  readonly quantity: number;
  readonly date: string;
  readonly status: RequisitionStatus;
}

interface ActivityItem {
  readonly id: number;
  readonly title: string;
  readonly description: string;
  readonly time: string;
  readonly icon: string;
}

interface TopRequestedItem {
  readonly id: number;
  readonly name: string;
  readonly category: string;
  readonly quantity: number;
  readonly requests: number;
}

interface LowStockAlert {
  readonly id: number;
  readonly item: string;
  readonly sku: string;
  readonly currentStock: number;
  readonly minLevel: number;
  readonly location: string;
  readonly level: 'Critical' | 'Warning' | 'Attention';
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent {
  readonly router = inject(Router);
  private destroyRef = inject(DestroyRef);

  readonly currentDate = signal('');
  readonly currentTime = signal('');
  readonly location = signal('Addis Ababa, Ethiopia');

  readonly isLoading = signal(false);
  readonly isAutoRefreshEnabled = signal(false);

  toggleAutoRefresh(): void {
    this.isAutoRefreshEnabled.update(v => !v);
  }

  readonly summaryCards = signal([
    { title: 'Total Properties Value', value: '$2.4M', trend: '+12%', icon: 'bi bi-currency-dollar', color: 'blue' },
    { title: 'Total Properties', value: '1,234', trend: '+5%', icon: 'bi bi-buildings', color: 'green' },
    { title: 'Total Locations', value: '45', trend: '+2', icon: 'bi bi-geo-alt', color: 'purple' },
    { title: 'Total Safety Boxes', value: '234', trend: '+10', icon: 'bi bi-box-seam', color: 'orange' },
    { title: 'Pending Requisitions', value: '12', trend: '-3', icon: 'bi bi-clock', color: 'red' },
    { title: 'Active Users', value: '89', trend: '+5', icon: 'bi bi-people', color: 'teal' },
  ]);

  readonly recentRequisitions = signal<Requisition[]>([
    {
      id: 1,
      requestor: 'John Doe',
      item: 'Laptop',
      quantity: 1,
      date: '2024-04-28',
      status: 'Pending',
    },
    {
      id: 2,
      requestor: 'Jane Smith',
      item: 'Monitor',
      quantity: 2,
      date: '2024-04-27',
      status: 'Approved',
    },
    {
      id: 3,
      requestor: 'Bob Johnson',
      item: 'Printer',
      quantity: 1,
      date: '2024-04-26',
      status: 'Rejected',
    },
    {
      id: 4,
      requestor: 'Alice Wilson',
      item: 'Office Chair',
      quantity: 5,
      date: '2024-04-25',
      status: 'Completed',
    },
    {
      id: 5,
      requestor: 'Charlie Brown',
      item: 'Desk Lamp',
      quantity: 3,
      date: '2024-04-24',
      status: 'Issued',
    },
  ]);

  readonly recentActivities = signal<ActivityItem[]>([
    { id: 1, title: 'Property Added', description: 'Office Building A added to inventory', time: '5 min ago', icon: 'bi bi-building' },
    { id: 2, title: 'Requisition Approved', description: 'REQ-1234 approved for John Doe', time: '15 min ago', icon: 'bi bi-check-circle' },
    { id: 3, title: 'Stock Adjustment', description: 'Adjusted stock for SKU-002 (+10)', time: '30 min ago', icon: 'bi bi-sliders' },
    { id: 4, title: 'User Created', description: 'Alice Wilson account created', time: '1 hour ago', icon: 'bi bi-person-plus' },
    { id: 5, title: 'Asset Transfer', description: 'Transfer completed between departments', time: '2 hours ago', icon: 'bi bi-arrow-left-right' },
    { id: 6, title: 'GRN Received', description: 'GRN-456 received and inspected', time: '3 hours ago', icon: 'bi bi-arrow-up-circle' },
  ]);

  readonly topRequestedItems = signal<TopRequestedItem[]>([
    { id: 1, name: 'Laptop', category: 'Electronics', quantity: 25, requests: 45 },
    { id: 2, name: 'Office Chair', category: 'Furniture', quantity: 120, requests: 38 },
    { id: 3, name: 'Printer Paper', category: 'Office Supplies', quantity: 500, requests: 32 },
    { id: 4, name: 'Monitor', category: 'Electronics', quantity: 15, requests: 28 },
    { id: 5, name: 'Desk Lamp', category: 'Furniture', quantity: 8, requests: 25 },
  ]);

  readonly lowStockAlerts = signal<LowStockAlert[]>([
    { id: 1, item: 'USB Cable', sku: 'SKU-005', currentStock: 3, minLevel: 25, location: 'Warehouse A', level: 'Critical' },
    { id: 2, item: 'Desk Lamp', sku: 'SKU-004', currentStock: 8, minLevel: 30, location: 'Warehouse B', level: 'Critical' },
    { id: 3, item: 'Laptop', sku: 'SKU-002', currentStock: 5, minLevel: 20, location: 'Warehouse A', level: 'Warning' },
    { id: 4, item: 'Keyboard', sku: 'SKU-006', currentStock: 15, minLevel: 40, location: 'Warehouse C', level: 'Warning' },
    { id: 5, item: 'Mouse', sku: 'SKU-007', currentStock: 25, minLevel: 50, location: 'Warehouse B', level: 'Attention' },
  ]);

  readonly requisitionStatus = signal([
    { label: 'Pending', value: 12, color: '#f59e0b' },
    { label: 'Approved', value: 45, color: '#10b981' },
    { label: 'Rejected', value: 8, color: '#ef4444' },
    { label: 'Completed', value: 156, color: '#3b82f6' },
    { label: 'Issued', value: 89, color: '#8b5cf6' },
  ]);

  readonly locationDistribution = signal([
    { name: 'Warehouse A', value: 450 },
    { name: 'Warehouse B', value: 320 },
    { name: 'Warehouse C', value: 280 },
    { name: 'North Office', value: 120 },
    { name: 'South Office', value: 64 },
  ]);

  readonly complianceScore = 94;

  constructor() {
    this.updateDateTime();
    const interval = setInterval(() => this.updateDateTime(), 1000);
    this.destroyRef.onDestroy(() => clearInterval(interval));
  }

  updateDateTime(): void {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    this.currentDate.set(now.toLocaleDateString('en-US', options));
    this.currentTime.set(now.toLocaleTimeString('en-US', { hour12: true }));
  }

  refreshData() {
    console.log('Refreshing data...');
    this.updateDateTime();
    // In a real application, this would fetch fresh data from an API
  }

  viewAllRequisitions() {
    this.router.navigate(['/admin/requisitions']);
  }

  approveRequisition(id: number) {
    const req = this.recentRequisitions().find(r => r.id === id);
    if (req) {
      console.log(`Approving requisition ${id}`);
    }
  }

  rejectRequisition(id: number) {
    const req = this.recentRequisitions().find(r => r.id === id);
    if (req) {
      console.log(`Rejecting requisition ${id}`);
    }
  }

  getStatusClass(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower === 'approved' || statusLower === 'completed' || statusLower === 'issued') {
      return 'status-success';
    }
    if (statusLower === 'pending') {
      return 'status-warning';
    }
    if (statusLower === 'rejected') {
      return 'status-danger';
    }
    return 'status-info';
  }

  getAlertClass(level: string): string {
    switch (level) {
      case 'Critical':
        return 'alert-critical';
      case 'Warning':
        return 'alert-warning';
      case 'Attention':
        return 'alert-attention';
      default:
        return 'alert-info';
    }
  }
}
