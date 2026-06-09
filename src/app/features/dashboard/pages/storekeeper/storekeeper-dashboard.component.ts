import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';

import { DashboardService, DashboardStatistics } from '../../../../core/services/dashboard.service';
import {
  WorkflowService,
  ServiceRequest,
  NotificationMessage,
} from '../../../../core/services/workflow.service';

import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([LineChart, PieChart, BarChart, TooltipComponent, GridComponent, LegendComponent, TitleComponent, CanvasRenderer]);

type GRNStatus = 'Pending' | 'Received' | 'Rejected';
type Priority = 'Urgent' | 'Medium' | 'Normal';

interface KPICard {
  readonly title: string;
  readonly value: string;
  readonly secondary: string;
  readonly trend: string;
  readonly color: string;
  readonly icon: string;
  readonly route: string;
}

interface StockCategory {
  readonly name: string;
  readonly percentage: number;
  readonly units: number;
  readonly color: string;
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

interface GRN {
  readonly id: number;
  readonly grnNo: string;
  readonly supplier: string;
  readonly items: string;
  readonly date: string;
  readonly status: GRNStatus;
}

interface WeeklyTrend {
  label: string;
  total: number;
  electronics: number;
  furniture: number;
}

@Component({
  selector: 'app-storekeeper-dashboard',
  standalone: true,
  imports: [NgxEchartsDirective, CommonModule, CurrencyPipe],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './storekeeper-dashboard.component.html',
  styleUrl: './storekeeper-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorekeeperDashboardComponent implements OnInit {
  readonly router = inject(Router);
  private readonly dashboardService = inject(DashboardService);
  private readonly workflowService = inject(WorkflowService);

  readonly isLoading = signal(false);
  readonly statistics = signal<DashboardStatistics | null>(null);
  readonly kpiCards = signal<KPICard[]>([]);

  readonly defaultKPICards: KPICard[] = [
    { title: 'Total Items in Stock', value: '0', secondary: 'Loading...', trend: '---', color: 'orange', icon: 'bi bi-boxes', route: '/storekeeper/inventory' },
    { title: 'Pending Issues', value: '0', secondary: 'Loading...', trend: '---', color: 'red', icon: 'bi bi-arrow-up-circle', route: '/storekeeper/issuing' },
    { title: 'Pending Receivings', value: '0', secondary: 'Loading...', trend: '---', color: 'yellow', icon: 'bi bi-arrow-down-circle', route: '/storekeeper/receiving' },
    { title: 'Low Stock Alerts', value: '0', secondary: 'Loading...', trend: '---', color: 'red', icon: 'bi bi-exclamation-triangle', route: '/storekeeper/inventory/low-stock' },
    { title: 'Issued This Week', value: '0', secondary: 'Loading...', trend: '---', color: 'green', icon: 'bi bi-check-circle', route: '/storekeeper/reports' },
  ];

  // Workflow integration
  readonly workflowRequests = signal<ServiceRequest[]>([]);
  readonly workflowNotifications = signal<NotificationMessage[]>([]);

  readonly weeklyTrends: WeeklyTrend[] = [
    { label: 'W1', total: 4200, electronics: 1800, furniture: 1200 },
    { label: 'W2', total: 4350, electronics: 1900, furniture: 1250 },
    { label: 'W3', total: 4100, electronics: 1750, furniture: 1180 },
    { label: 'W4', total: 4450, electronics: 2000, furniture: 1300 },
    { label: 'W5', total: 4600, electronics: 2100, furniture: 1350 },
    { label: 'W6', total: 4500, electronics: 2050, furniture: 1320 },
    { label: 'W7', total: 4700, electronics: 2200, furniture: 1400 },
    { label: 'W8', total: 4900, electronics: 2300, furniture: 1450 },
    { label: 'W9', total: 4800, electronics: 2250, furniture: 1420 },
    { label: 'W10', total: 5100, electronics: 2400, furniture: 1500 },
    { label: 'W11', total: 5000, electronics: 2350, furniture: 1480 },
    { label: 'W12', total: 5200, electronics: 2450, furniture: 1520 },
  ];

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
    { id: 1, grnNo: 'GRN-001', supplier: 'Tech Supplies', items: 'Laptop x5', date: '2024-04-28', status: 'Pending' },
    { id: 2, grnNo: 'GRN-002', supplier: 'XYZ Corp', items: 'Monitor x10', date: '2024-04-27', status: 'Received' },
    { id: 3, grnNo: 'GRN-003', supplier: 'ABC Supplies', items: 'Keyboard x20', date: '2024-04-26', status: 'Rejected' },
  ];

  today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  isScanning = false;
  scannedItem = {
    name: 'Dell XPS Laptop',
    sku: 'LAP-DEL-XPS-001',
    location: 'Warehouse A - Aisle 12 - Shelf B-03',
    stock: 23,
  };

  ngOnInit(): void {
    this.loadDashboardData();
    this.setupWorkflowSubscriptions();
    this.loadWorkflowData();
  }

  private setupWorkflowSubscriptions(): void {
    this.workflowService.getRequestUpdates().subscribe(() => {
      this.loadWorkflowData();
    });

    this.workflowService.getNotificationUpdates().subscribe(() => {
      this.loadWorkflowData();
    });
  }

  private loadWorkflowData(): void {
    const requests = this.workflowService.getRequestsForManagerAll('storekeeper_queue');
    this.workflowRequests.set(requests);

    const notifications = this.workflowService.getNotificationsForUser(
      'storekeeper_001',
      'Manager'
    );
    this.workflowNotifications.set(notifications);
  }

  refreshWorkflowData(): void {
    this.loadWorkflowData();
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
      error: () => {
        this.kpiCards.set(this.defaultKPICards);
        this.isLoading.set(false);
      }
    });
  }

  updateKPICards(stats: DashboardStatistics): void {
    this.kpiCards.set([
      { title: 'Total Items in Stock', value: stats.totalItems.toLocaleString(), secondary: 'Items in inventory', trend: '12% vs last month', color: 'orange', icon: 'bi bi-boxes', route: '/storekeeper/inventory' },
      { title: 'Pending Issues', value: stats.pendingRequisitions.toString(), secondary: 'Awaiting fulfillment', trend: stats.pendingRequisitions > 0 ? 'Needs attention' : 'All clear', color: 'red', icon: 'bi bi-arrow-up-circle', route: '/storekeeper/issuing' },
      { title: 'Pending Receivings', value: stats.pendingInspections.toString(), secondary: 'Awaiting inspection', trend: stats.pendingInspections > 0 ? 'Pending' : 'No items', color: 'yellow', icon: 'bi bi-arrow-down-circle', route: '/storekeeper/receiving' },
      { title: 'Low Stock Alerts', value: stats.lowStockItemsCount.toString(), secondary: 'Items need reordering', trend: stats.lowStockItemsCount > 0 ? 'Action required' : 'Stock healthy', color: 'red', icon: 'bi bi-exclamation-triangle', route: '/storekeeper/inventory/low-stock' },
      { title: 'Issued This Week', value: stats.issuedRequisitions.toString(), secondary: 'Items issued', trend: '---', color: 'green', icon: 'bi bi-check-circle', route: '/storekeeper/reports' },
    ]);
  }

  get trendChartOpts(): Record<string, unknown> {
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
      legend: { data: ['Total Stock', 'Electronics', 'Furniture'], bottom: 0, textStyle: { color: '#64748b', fontSize: 11 } },
      grid: { left: '2%', right: '2%', bottom: '20%', top: '3%', containLabel: true },
      xAxis: { type: 'category', data: this.weeklyTrends.map(w => w.label), axisLabel: { color: '#94a3b8', fontSize: 10 }, axisLine: { show: false }, axisTick: { show: false } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)', type: 'dashed' } } },
      series: [
        {
          name: 'Total Stock', type: 'line', smooth: true,
          data: this.weeklyTrends.map(w => w.total),
          lineStyle: { width: 3, color: '#6366f1' },
          itemStyle: { color: '#6366f1' },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(99,102,241,0.3)' }, { offset: 1, color: 'rgba(99,102,241,0.02)' }]) as any },
          symbol: 'circle', symbolSize: 6,
          animationDuration: 1000,
        },
        {
          name: 'Electronics', type: 'line', smooth: true,
          data: this.weeklyTrends.map(w => w.electronics),
          lineStyle: { width: 2, color: '#10b981' },
          itemStyle: { color: '#10b981' },
          symbol: 'diamond', symbolSize: 5,
          animationDuration: 1200,
        },
        {
          name: 'Furniture', type: 'line', smooth: true,
          data: this.weeklyTrends.map(w => w.furniture),
          lineStyle: { width: 2, color: '#f59e0b' },
          itemStyle: { color: '#f59e0b' },
          symbol: 'triangle', symbolSize: 5,
          animationDuration: 1400,
        },
      ]
    };
  }

  get categoryChartOpts(): Record<string, unknown> {
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} units ({d}%)' },
      series: [{
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        padAngle: 2,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, position: 'outside', formatter: '{b}\n{d}%', color: '#94a3b8', fontSize: 10, lineHeight: 14, fontWeight: 600 },
        emphasis: { itemStyle: { shadowBlur: 15, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.15)' } },
        animationDuration: 1000, animationEasing: 'cubicOut',
        labelLine: { length: 8, length2: 12, smooth: true },
        data: this.stockCategories.map(c => ({ name: c.name, value: c.units, itemStyle: { color: c.color } })),
      }]
    };
  }

  getPriorityClass(priority: Priority): string {
    switch (priority) {
      case 'Urgent': return 'priority-urgent';
      case 'Medium': return 'priority-medium';
      case 'Normal': return 'priority-normal';
      default: return 'priority-normal';
    }
  }

  getPriorityColor(priority: Priority): string {
    switch (priority) {
      case 'Urgent': return '#ef4444';
      case 'Medium': return '#f59e0b';
      case 'Normal': return '#10b981';
      default: return '#10b981';
    }
  }

  getStatusClass(status: GRNStatus): string {
    switch (status) {
      case 'Pending': return 'status-pending';
      case 'Received': return 'status-received';
      case 'Rejected': return 'status-rejected';
      default: return '';
    }
  }

  processIssue(id: string): void {
    this.router.navigate(['/storekeeper/issuing']);
  }

  startInspection(id: string): void {
    this.router.navigate(['/storekeeper/receiving']);
  }

  toggleScanner(): void {
    this.isScanning = !this.isScanning;
  }

  viewItemDetails(): void {
    this.router.navigate(['/storekeeper/inventory'], { queryParams: { search: this.scannedItem.sku } });
  }

  issueItem(): void {
    this.router.navigate(['/storekeeper/issuing']);
  }

  transferStock(): void {
    this.router.navigate(['/storekeeper/inventory/transfer']);
  }

  adjustStock(): void {
    this.router.navigate(['/storekeeper/inventory/adjustment']);
  }

  refreshData(): void {
    this.loadDashboardData();
  }

  viewAllGRNs(): void {
    this.router.navigate(['/storekeeper/receiving']);
  }

  receiveGRN(id: number): void {
    this.router.navigate(['/storekeeper/receiving']);
  }

  viewGRN(grn: GRN): void {
    this.router.navigate(['/storekeeper/receiving']);
  }

  formatNumber(n: number): string {
    return n.toLocaleString();
  }
}
