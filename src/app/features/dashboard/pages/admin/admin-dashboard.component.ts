import { ChangeDetectionStrategy, Component, inject, signal, DestroyRef, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CalendarWidgetComponent } from '../../../../shared/components/calendar-widget/calendar-widget.component';
import { DashboardService, DashboardStatistics } from '../../../../core/services/dashboard.service';
import { finalize } from 'rxjs';

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
  imports: [RouterLink, CalendarWidgetComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent implements OnInit {
  readonly router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private readonly dashboardService = inject(DashboardService);

  readonly isLoading = signal(false);
  readonly statistics = signal<DashboardStatistics | null>(null);

  readonly currentDate = signal('');
  readonly currentTime = signal('');
  readonly location = signal('Addis Ababa');
  readonly isAutoRefreshEnabled = signal(true);
  readonly refreshInterval = 30000; // 30 seconds
  readonly animatedValue = signal('');

  readonly summaryCards = signal([
    { title: 'Total Properties Value', value: '$0', trend: '+0%', icon: 'bi bi-currency-dollar', color: 'blue' },
    { title: 'Total Properties', value: '0', trend: '+0%', icon: 'bi bi-buildings', color: 'green' },
    { title: 'Total Locations', value: '0', trend: '+0', icon: 'bi bi-geo-alt', color: 'purple' },
    { title: 'Total Safety Boxes', value: '0', trend: '+0', icon: 'bi bi-box-seam', color: 'orange' },
    { title: 'Pending Requisitions', value: '0', trend: '-0', icon: 'bi bi-clock', color: 'red' },
    { title: 'Active Users', value: '0', trend: '+0', icon: 'bi bi-people', color: 'teal' },
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
  ]);
  readonly recentActivities = signal<ActivityItem[]>([
    { id: 1, title: 'Property Added', description: 'Office Building A added to inventory', time: '5 min ago', icon: 'bi bi-building' },
    { id: 2, title: 'Requisition Approved', description: 'REQ-1234 approved for John Doe', time: '15 min ago', icon: 'bi bi-check-circle' },
    { id: 3, title: 'Stock Adjustment', description: 'Adjusted stock for SKU-002 (+10)', time: '30 min ago', icon: 'bi bi-sliders' },
    { id: 4, title: 'User Created', description: 'Alice Wilson account created', time: '1 hour ago', icon: 'bi bi-person-plus' },
    { id: 5, title: 'Asset Transfer', description: 'Transfer completed between departments', time: '2 hours ago', icon: 'bi bi-arrow-left-right' },
  ]);
  readonly lowStockAlerts = signal<LowStockAlert[]>([
    { id: 1, item: 'USB Cable', sku: 'SKU-005', currentStock: 3, minLevel: 25, location: 'Warehouse A', level: 'Critical' },
    { id: 2, item: 'Desk Lamp', sku: 'SKU-004', currentStock: 8, minLevel: 30, location: 'Warehouse B', level: 'Critical' },
    { id: 3, item: 'Laptop', sku: 'SKU-002', currentStock: 5, minLevel: 20, location: 'Warehouse A', level: 'Warning' },
  ]);
  readonly requisitionStatus = signal<{ label: string; value: number; color: string }[]>([
    { label: 'Pending', value: 12, color: '#f59e0b' },
    { label: 'Approved', value: 45, color: '#10b981' },
    { label: 'Rejected', value: 8, color: '#ef4444' },
    { label: 'Completed', value: 156, color: '#3b82f6' },
    { label: 'Issued', value: 89, color: '#8b5cf6' },
  ]);

  constructor() {
    this.updateDateTime();
    const interval = setInterval(() => this.updateDateTime(), 1000);
    this.destroyRef.onDestroy(() => clearInterval(interval));
  }

  ngOnInit(): void {
    this.loadDashboardData();
    this.startAutoRefresh();
  }

  startAutoRefresh(): void {
    if (this.isAutoRefreshEnabled()) {
      const refreshInterval = setInterval(() => {
        this.loadDashboardData();
      }, this.refreshInterval);
      this.destroyRef.onDestroy(() => clearInterval(refreshInterval));
    }
  }

  toggleAutoRefresh(): void {
    this.isAutoRefreshEnabled.set(!this.isAutoRefreshEnabled());
    if (this.isAutoRefreshEnabled()) {
      this.startAutoRefresh();
    }
  }

  animateNumber(target: number, duration: number = 1000): number {
    let start = 0;
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      start = Math.floor(target * easeOutQuart);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        start = target;
      }
    };
    
    requestAnimationFrame(animate);
    return start;
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
          
          // Populate recent activities from backend
          this.recentActivities.set(response.data.recentActivities.map(activity => ({
            id: parseInt(activity.id.substring(0, 8), 16) || Date.now(),
            title: activity.action,
            description: `${activity.entityName} - ${activity.entityId}`,
            time: activity.timeAgo,
            icon: activity.icon
          })));
          
          // Populate recent requisitions from recent activities (filter for requisition-related actions)
          this.recentRequisitions.set(response.data.recentActivities
            .filter(activity => activity.action.toLowerCase().includes('requisition') || 
                                activity.action.toLowerCase().includes('request'))
            .map(activity => ({
              id: parseInt(activity.id.substring(0, 8), 16) || Date.now(),
              requestor: activity.userName,
              item: activity.entityName,
              quantity: 1,
              date: new Date(activity.actionDate).toLocaleDateString(),
              status: activity.action.includes('Approved') ? 'Approved' : 
                     activity.action.includes('Rejected') ? 'Rejected' : 
                     activity.action.includes('Completed') ? 'Completed' : 'Pending'
            }))
          );
          
          // Populate low stock alerts
          this.lowStockAlerts.set(response.data.lowStockAlerts.map(alert => ({
            id: parseInt(alert.itemId.substring(0, 8), 16) || Date.now(),
            item: alert.itemName,
            sku: alert.sku,
            currentStock: alert.currentStock,
            minLevel: alert.minStockLevel,
            location: alert.location,
            level: alert.severity as 'Critical' | 'Warning' | 'Attention'
          })));
          
          // Populate requisition status chart data
          this.requisitionStatus.set(response.data.requisitionsByStatus);
        }
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        // Set fallback data on error
        this.setFallbackData();
      }
    });
  }

  setFallbackData(): void {
    this.recentRequisitions.set([
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
    ]);
    this.recentActivities.set([
      { id: 1, title: 'Property Added', description: 'Office Building A added to inventory', time: '5 min ago', icon: 'bi bi-building' },
      { id: 2, title: 'Requisition Approved', description: 'REQ-1234 approved for John Doe', time: '15 min ago', icon: 'bi bi-check-circle' },
    ]);
    this.requisitionStatus.set([
      { label: 'Pending', value: 12, color: '#f59e0b' },
      { label: 'Approved', value: 45, color: '#10b981' },
      { label: 'Rejected', value: 8, color: '#ef4444' },
      { label: 'Completed', value: 156, color: '#3b82f6' },
    ]);
  }

  updateSummaryCards(stats: DashboardStatistics): void {
    this.summaryCards.set([
      { title: 'Total Properties Value', value: `$${(stats.totalPropertyValue / 1000000).toFixed(1)}M`, trend: '+0%', icon: 'bi bi-currency-dollar', color: 'blue' },
      { title: 'Total Properties', value: stats.totalProperties.toLocaleString(), trend: '+0%', icon: 'bi bi-buildings', color: 'green' },
      { title: 'Total Locations', value: stats.totalLocations.toLocaleString(), trend: '+0', icon: 'bi bi-geo-alt', color: 'purple' },
      { title: 'Total Safety Boxes', value: stats.totalSafetyBoxes.toLocaleString(), trend: '+0', icon: 'bi bi-box-seam', color: 'orange' },
      { title: 'Pending Requisitions', value: stats.pendingRequisitions.toLocaleString(), trend: '-0', icon: 'bi bi-clock', color: 'red' },
      { title: 'Active Users', value: stats.totalEmployees.toLocaleString(), trend: '+0', icon: 'bi bi-people', color: 'teal' },
    ]);
  }

  readonly topRequestedItems: TopRequestedItem[] = [
    { id: 1, name: 'Laptop', category: 'Electronics', quantity: 25, requests: 45 },
    { id: 2, name: 'Office Chair', category: 'Furniture', quantity: 120, requests: 38 },
    { id: 3, name: 'Printer Paper', category: 'Office Supplies', quantity: 500, requests: 32 },
    { id: 4, name: 'Monitor', category: 'Electronics', quantity: 15, requests: 28 },
    { id: 5, name: 'Desk Lamp', category: 'Furniture', quantity: 8, requests: 25 },
  ];

  readonly locationDistribution = [
    { name: 'Warehouse A', value: 450 },
    { name: 'Warehouse B', value: 320 },
    { name: 'Warehouse C', value: 280 },
    { name: 'North Office', value: 120 },
    { name: 'South Office', value: 64 },
  ];

  readonly complianceScore = 94;

  updateDateTime(): void {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    this.currentDate.set(now.toLocaleDateString('en-US', options));
    this.currentTime.set(now.toLocaleTimeString('en-US', { hour12: true }));
  }

  refreshData() {
    console.log('Refreshing data...');
    this.updateDateTime();
    this.loadDashboardData();
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
