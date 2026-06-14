import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';

import { DashboardService, DashboardStatistics } from '../../../../core/services/dashboard.service';

import { WorkflowService, ServiceRequest, NotificationMessage } from '../../../../core/services/workflow.service';
import { ServiceRequestService, ServiceRequestDto } from '../../../requisition/service-requests/services/service-request.service';
import { DisposalRecordsService, DisposalRecordDto } from '../../../../core/services/disposal-records.service';
import { ReceivingNotesService } from '../../../../core/services/receiving-notes.service';
import { RequisitionsService, StoreIssueVoucherDto } from '../../../../core/services/requisitions.service';
import { ReportsService } from '../../../../core/services/reports.service';


import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([LineChart, PieChart, BarChart, TooltipComponent, GridComponent, LegendComponent, TitleComponent, CanvasRenderer]);

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
  readonly id: string;
  readonly grnNo: string;
  readonly supplier: string;
  readonly items: string;
  readonly date: string;
  readonly status: string;
}

const CATEGORY_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280', '#EF4444', '#14B8A6', '#F97316', '#6366F1'];

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

  private readonly srService = inject(ServiceRequestService);
  private readonly disposalService = inject(DisposalRecordsService);

  private readonly receivingNotesService = inject(ReceivingNotesService);
  private readonly requisitionsService = inject(RequisitionsService);
  private readonly reportsService = inject(ReportsService);


  readonly isLoading = signal(false);
  readonly statistics = signal<DashboardStatistics | null>(null);
  readonly kpiCards = signal<KPICard[]>([]);
  readonly weeklyTrends = signal<{ label: string; total: number; electronics: number; furniture: number }[]>([]);
  readonly stockCategories = signal<StockCategory[]>([]);
  readonly pendingIssues = signal<PendingIssue[]>([]);
  readonly pendingReceivings = signal<PendingReceiving[]>([]);
  readonly recentIssues = signal<RecentIssue[]>([]);
  readonly recentReceivings = signal<RecentReceiving[]>([]);
  readonly recentGRNs = signal<GRN[]>([]);

  // Workflow integration
  readonly workflowRequests = signal<ServiceRequest[]>([]);
  readonly workflowNotifications = signal<NotificationMessage[]>([]);


  // Stock verification queue (API-based)
  readonly pendingVerifications = signal<ServiceRequestDto[]>([]);
  readonly loadingVerifications = signal(false);

  // Stock verification queue (workflow-based)
  readonly workflowPendingVerifications = signal<ServiceRequest[]>([]);
  readonly loadingWorkflowVerifications = signal(false);

  // Disposal
  readonly recentDisposals = signal<DisposalRecordDto[]>([]);
  readonly verificationNotifications = signal<{ type: string; message: string } | null>(null);

  readonly weeklyTrendsPlaceholder = [
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
    this.loadSectionData();
    this.setupWorkflowSubscriptions();
    this.loadWorkflowData();
    this.loadPendingVerifications();
    this.loadWorkflowPendingVerifications();
    this.loadDisposalData();
  }

  private setupWorkflowSubscriptions(): void {
    this.workflowService.getRequestUpdates().subscribe(() => {
      this.loadWorkflowData();
      this.loadWorkflowPendingVerifications();
    });
    this.workflowService.getNotificationUpdates().subscribe(() => {
      this.loadWorkflowData();
    });
  }

  private loadWorkflowData(): void {
    const requests = this.workflowService.getRequestsForManagerAll('storekeeper_queue');
    this.workflowRequests.set(requests);


    const storekeeperNotes = this.workflowService.getNotificationsForUser(
      'storekeeper_001',
      'Storekeeper'
    );

    const managerNotes = this.workflowService.getNotificationsForUser('storekeeper_001', 'Manager');

    this.workflowNotifications.set([...storekeeperNotes, ...managerNotes]);
  }

  refreshWorkflowData(): void {
    this.loadWorkflowData();
  }


  loadPendingVerifications(): void {
    this.loadingVerifications.set(true);
    this.srService.getAll({ status: 'Pending', pageSize: 50 }).subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          const pending = res.data.filter(
            (sr) => sr.stockVerificationStatus?.toLowerCase() === 'pending'
          );
          this.pendingVerifications.set(pending);
        }
        this.loadingVerifications.set(false);
      },
      error: () => {
        this.loadingVerifications.set(false);
      },
    });
  }

  refreshPendingVerifications(): void {
    this.loadPendingVerifications();
  }

  loadWorkflowPendingVerifications(): void {
    this.loadingWorkflowVerifications.set(true);
    const pending = this.workflowService.getRequestsForStockVerification();
    this.workflowPendingVerifications.set(pending);
    this.loadingWorkflowVerifications.set(false);
  }

  verifyStockWorkflow(requestId: string): void {
    if (!confirm('Confirm stock is available for this workflow request?')) return;
    const storekeeperName = 'Storekeeper';
    this.workflowService.confirmStockAvailable(requestId, storekeeperName, 'Stock confirmed available');
    this.verificationNotifications.set({ type: 'success', message: 'Stock verified successfully' });
    this.loadWorkflowPendingVerifications();
    this.loadWorkflowData();
  }

  markStockInsufficientWorkflow(requestId: string): void {
    const notes = prompt('Enter notes about the insufficient stock:');
    if (notes === null) return;
    if (!confirm('Mark stock as insufficient for this workflow request?')) return;
    const storekeeperName = 'Storekeeper';
    this.workflowService.confirmStockInsufficient(requestId, storekeeperName, notes || undefined);
    this.verificationNotifications.set({ type: 'success', message: 'Marked as insufficient' });
    this.loadWorkflowPendingVerifications();
    this.loadWorkflowData();
  }

  loadDisposalData(): void {
    this.disposalService.getAll({ pageSize: 5 }).subscribe({
      next: (res) => {
        if (res.success !== false && res.data) {
          const items = (res.data as any)?.items || (Array.isArray(res.data) ? res.data : []);
          this.recentDisposals.set(items);
        }
      },
    });
  }

  createDisposal(): void {
    this.router.navigate(['/storekeeper/disposal']);
  }

  verifyStock(id: string): void {
    if (!confirm('Confirm stock is available for this request?')) return;
    this.srService.verifyStock({ id, isAvailable: true }).subscribe({
      next: (res) => {
        if (res.success) {
          this.verificationNotifications.set({ type: 'success', message: 'Stock verified successfully' });
          this.loadPendingVerifications();
          this.loadWorkflowData();
        } else {
          this.verificationNotifications.set({ type: 'error', message: res.message || 'Verification failed' });
        }
      },
      error: (err) => {
        let msg = 'Failed to verify stock.';
        if (err?.error?.message) msg = err.error.message;
        else if (err?.error?.title) msg = err.error.title;
        if (err?.status) msg = `[${err.status}] ${msg}`;
        this.verificationNotifications.set({ type: 'error', message: msg });
      },
    });
  }

  markStockInsufficient(id: string): void {
    const notes = prompt('Enter notes about the insufficient stock:');
    if (notes === null) return;
    if (!confirm('Mark stock as insufficient for this request?')) return;
    this.srService.verifyStock({ id, isAvailable: false, notes: notes || undefined }).subscribe({
      next: (res) => {
        if (res.success) {
          this.verificationNotifications.set({ type: 'success', message: 'Marked as insufficient' });
          this.loadPendingVerifications();
          this.loadWorkflowData();
        } else {
          this.verificationNotifications.set({ type: 'error', message: res.message || 'Operation failed' });
        }
      },
      error: (err) => {
        let msg = 'Failed to mark insufficient.';
        if (err?.error?.message) msg = err.error.message;
        else if (err?.error?.title) msg = err.error.title;
        if (err?.status) msg = `[${err.status}] ${msg}`;
        this.verificationNotifications.set({ type: 'error', message: msg });
      },
    });
  }

  private loadSectionData(): void {
    this.loadStockCategories();
    this.loadPendingIssues();
    this.loadPendingReceivings();
    this.loadRecentIssues();
    this.loadRecentReceivings();
    this.loadRecentGRNs();

  }

  loadDashboardData(): void {
    this.isLoading.set(true);
    this.dashboardService.getStatistics().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.statistics.set(response.data);
          this.updateKPICards(response.data);
          this.updateTrendsFromStats(response.data);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  refreshData(): void {
    this.loadDashboardData();
    this.loadSectionData();
  }

  private updateKPICards(stats: DashboardStatistics): void {
    this.kpiCards.set([
      { title: 'Total Items in Stock', value: stats.totalItems.toLocaleString(), secondary: 'Items in inventory', trend: '---', color: 'orange', icon: 'bi bi-boxes', route: '/storekeeper/inventory' },
      { title: 'Pending Issues', value: (stats.pendingRequisitions + stats.approvedRequisitions).toString(), secondary: 'Awaiting fulfillment', trend: stats.pendingRequisitions > 0 ? 'Needs attention' : 'All clear', color: 'red', icon: 'bi bi-arrow-up-circle', route: '/storekeeper/issuing' },
      { title: 'Pending Receivings', value: stats.pendingInspections.toString(), secondary: 'Awaiting inspection', trend: stats.pendingInspections > 0 ? 'Pending' : 'No items', color: 'yellow', icon: 'bi bi-arrow-down-circle', route: '/storekeeper/receiving' },
      { title: 'Low Stock Alerts', value: stats.lowStockItemsCount.toString(), secondary: 'Items need reordering', trend: stats.lowStockItemsCount > 0 ? 'Action required' : 'Stock healthy', color: 'red', icon: 'bi bi-exclamation-triangle', route: '/storekeeper/inventory/low-stock' },
      { title: 'Issued This Week', value: stats.issuedRequisitions.toString(), secondary: 'Items issued', trend: '---', color: 'green', icon: 'bi bi-check-circle', route: '/storekeeper/reports' },
    ]);
  }

  private updateTrendsFromStats(stats: DashboardStatistics): void {
    const months = stats.stockMovementsByMonth ?? [];
    if (months.length > 0) {
      const trends = months.map((m, i) => ({
        label: m.label.length <= 3 ? m.label : m.label.slice(0, 3),
        total: m.value,
        electronics: Math.round(m.value * 0.42),
        furniture: Math.round(m.value * 0.28),
      }));
      this.weeklyTrends.set(trends);
    }
  }

  private loadStockCategories(): void {
    this.reportsService.getInventoryValuation().subscribe({
      next: (resp) => {
        if (resp.success && resp.data?.byCategory) {
          const cats: StockCategory[] = resp.data.byCategory.map((c: any, i: number) => ({
            name: c.categoryName || 'Unknown',
            percentage: Math.round(c.percentageOfTotal * 100) / 100,
            units: c.totalQuantity,
            color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
          }));
          this.stockCategories.set(cats);
        }
      },
    });
  }

  private loadPendingIssues(): void {
    this.requisitionsService.getAllServiceRequests({ status: 'Approved' }).subscribe({
      next: (resp) => {
        if (resp.success && resp.data) {
          const issues: PendingIssue[] = resp.data.slice(0, 6).map((sr: any) => ({
            id: sr.requestNumber || sr.srNumber || sr.id,
            priority: 'Medium' as Priority,
            item: sr.itemName || sr.item?.name || 'Item',
            quantity: sr.quantity || sr.totalQuantity,
            waitTime: 'Pending',
          }));
          this.pendingIssues.set(issues);
        }
      },
    });
  }

  private loadPendingReceivings(): void {
    this.receivingNotesService.getAll({ status: 'Pending', pageSize: 10 }).subscribe({
      next: (resp) => {
        if (resp.success && resp.data?.items) {
          const receivings: PendingReceiving[] = resp.data.items.map((r: any) => ({
            id: r.id,
            grnNo: r.grnNumber || r.grnNo || `GRN-${r.id}`,
            supplier: r.supplierName || 'Unknown',
            items: `${r.totalQuantity} item(s)`,
            receivedTime: r.receivedDate ? new Date(r.receivedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--',
          }));
          this.pendingReceivings.set(receivings);
        }
      },
    });
  }

  private loadRecentIssues(): void {
    this.requisitionsService.getAllSIVs({ pageSize: 5 }).subscribe({
      next: (resp) => {
        if (resp.success && resp.data) {
          const issues: RecentIssue[] = resp.data.map((siv: StoreIssueVoucherDto) => ({
            sivNo: siv.voucherNumber,
            item: siv.items?.[0]?.itemName || siv.items?.[0]?.name || 'Item',
            quantity: siv.items?.length || 0,
            department: siv.issuedBy || 'Unknown',
            time: siv.issueDate ? new Date(siv.issueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--',
          }));
          this.recentIssues.set(issues);
        }
      },
    });
  }

  private loadRecentReceivings(): void {
    this.receivingNotesService.getAll({ pageSize: 5 }).subscribe({
      next: (resp) => {
        if (resp.success && resp.data?.items) {
          const receivings: RecentReceiving[] = resp.data.items.map((r: any) => ({
            grnNo: r.grnNumber || `GRN-${r.id}`,
            item: `${r.totalQuantity} units`,
            quantity: r.totalQuantity,
            supplier: r.supplierName || 'Unknown',
            time: r.receivedDate ? new Date(r.receivedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--',
          }));
          this.recentReceivings.set(receivings);
        }
      },
    });
  }

  private loadRecentGRNs(): void {
    this.receivingNotesService.getAll({ pageSize: 5 }).subscribe({
      next: (resp) => {
        if (resp.success && resp.data?.items) {
          const grns: GRN[] = resp.data.items.map((r: any) => ({
            id: r.id,
            grnNo: r.grnNumber || `GRN-${r.id}`,
            supplier: r.supplierName || 'Unknown',
            items: `${r.itemCount} item(s)`,
            date: r.receivedDate ? new Date(r.receivedDate).toLocaleDateString() : '--',
            status: r.status || 'Pending',
          }));
          this.recentGRNs.set(grns);
        }
      },
    });
  }

  get trendChartOpts(): Record<string, unknown> {
    const trends = this.weeklyTrends();
    const labels = trends.map(w => w.label);
    const totals = trends.map(w => w.total);
    const electronics = trends.map(w => w.electronics);
    const furniture = trends.map(w => w.furniture);

    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
      legend: { data: ['Total Stock', 'Electronics', 'Furniture'], bottom: 0, textStyle: { color: '#64748b', fontSize: 11 } },
      grid: { left: '2%', right: '2%', bottom: '20%', top: '3%', containLabel: true },
      xAxis: { type: 'category', data: labels, axisLabel: { color: '#94a3b8', fontSize: 10 }, axisLine: { show: false }, axisTick: { show: false } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8', fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)', type: 'dashed' } } },
      series: [
        {
          name: 'Total Stock', type: 'line', smooth: true,
          data: totals,
          lineStyle: { width: 3, color: '#6366f1' },
          itemStyle: { color: '#6366f1' },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(99,102,241,0.3)' }, { offset: 1, color: 'rgba(99,102,241,0.02)' }]) as any },
          symbol: 'circle', symbolSize: 6,
          animationDuration: 1000,
        },
        {
          name: 'Electronics', type: 'line', smooth: true,
          data: electronics,
          lineStyle: { width: 2, color: '#10b981' },
          itemStyle: { color: '#10b981' },
          symbol: 'diamond', symbolSize: 5,
          animationDuration: 1200,
        },
        {
          name: 'Furniture', type: 'line', smooth: true,
          data: furniture,
          lineStyle: { width: 2, color: '#f59e0b' },
          itemStyle: { color: '#f59e0b' },
          symbol: 'triangle', symbolSize: 5,
          animationDuration: 1400,
        },
      ]
    };
  }

  get categoryChartOpts(): Record<string, unknown> {
    const cats = this.stockCategories();
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
        data: cats.map(c => ({ name: c.name, value: c.units, itemStyle: { color: c.color } })),
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

  getStatusClass(status: string): string {
    const s = (status || '').toLowerCase();
    if (s.includes('pending') || s === 'submitted') return 'status-pending';
    if (s.includes('received') || s.includes('approved') || s.includes('completed')) return 'status-received';
    if (s.includes('rejected')) return 'status-rejected';
    return '';
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

  viewAllGRNs(): void {
    this.router.navigate(['/storekeeper/receiving']);
  }

  receiveGRN(id: string): void {
    this.router.navigate(['/storekeeper/receiving']);
  }

  viewGRN(grn: GRN): void {
    this.router.navigate(['/storekeeper/receiving']);
  }

  formatNumber(n: number): string {
    return n.toLocaleString();
  }

  getVerificationUrgencyColor(urgency: string | undefined): string {
    const u = (urgency || 'normal').toLowerCase();
    switch (u) {
      case 'critical': case 'urgent': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'normal': case 'low': return '#10b981';
      default: return '#10b981';
    }
  }
}
