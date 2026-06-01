import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { EMPTY, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

import { DashboardService, DashboardStatistics } from '../../../../core/services/dashboard.service';
import { ServiceRequestService } from '../../../requisition/service-requests/services/service-request.service';
import { NotificationService as ToastService } from '../../../../core/services/notification.service';
import { pasApiUrlHint } from '../../../../core/config/api-base';

type RequisitionStatus = 'Pending' | 'Approved' | 'Rejected' | 'Completed' | 'Issued';

interface RequisitionRow {
  readonly id: string;
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

interface LocationBar {
  readonly name: string;
  readonly value: number;
}

interface MonthlyTrend {
  readonly month: string;
  readonly requests: number;
  readonly approved: number;
  readonly completed: number;
}

interface CategoryItem {
  readonly name: string;
  readonly count: number;
  readonly color: string;
}

interface DeptActivity {
  readonly department: string;
  readonly requests: number;
  readonly pct: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
  readonly Math = Math;
  readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dashboardService = inject(DashboardService);
  private readonly serviceRequests = inject(ServiceRequestService);
  private readonly toast = inject(ToastService);

  readonly currentDate = signal('');
  readonly currentTime = signal('');
  readonly location = signal('Addis Ababa, Ethiopia');
  readonly isLoading = signal(false);
  readonly hasLoadedOnce = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly lastRefreshed = signal<string | null>(null);
  readonly isAutoRefreshEnabled = signal(false);
  readonly isMockData = signal(false);
  private autoRefreshInterval: ReturnType<typeof setInterval> | null = null;

  readonly requisitionsLoading = signal(false);
  readonly requisitionsFromApi = signal(false);

  readonly summaryCards = signal<
    { title: string; value: string; trend: string; icon: string; color: string; microPct: number }[]
  >([
    { title: 'Total Property Value', value: '—', trend: '—', icon: 'bi bi-currency-dollar', color: 'blue', microPct: 0 },
    { title: 'Total Properties', value: '—', trend: '—', icon: 'bi bi-buildings', color: 'green', microPct: 0 },
    { title: 'Total Locations', value: '—', trend: '—', icon: 'bi bi-geo-alt', color: 'purple', microPct: 0 },
    { title: 'Total Safety Boxes', value: '—', trend: '—', icon: 'bi bi-box-seam', color: 'orange', microPct: 0 },
    { title: 'Pending Requisitions', value: '—', trend: '—', icon: 'bi bi-clock', color: 'red', microPct: 0 },
    { title: 'Employees', value: '—', trend: '—', icon: 'bi bi-people', color: 'teal', microPct: 0 },
  ]);

  readonly recentRequisitions = signal<RequisitionRow[]>([]);
  readonly recentActivities = signal<ActivityItem[]>([]);

  readonly monthlyTrend = signal<MonthlyTrend[]>([]);
  readonly categoryBreakdown = signal<CategoryItem[]>([]);
  readonly departmentActivity = signal<DeptActivity[]>([]);

  readonly topRequestedItems = signal<TopRequestedItem[]>([]);
  readonly lowStockAlerts = signal<LowStockAlert[]>([]);

  readonly requisitionStatus = signal<{ label: string; value: number; color: string }[]>([]);
  readonly locationDistribution = signal<LocationBar[]>([]);

  readonly locationBarMax = computed(() =>
    Math.max(1, ...this.locationDistribution().map((l) => l.value)),
  );

  readonly complianceScore = signal(94);
  readonly monthlyMax = computed(() =>
    Math.max(1, ...this.monthlyTrend().flatMap(m => [m.requests, m.approved, m.completed]))
  );
  readonly maxDeptRequests = computed(() =>
    Math.max(1, ...this.departmentActivity().map(d => d.requests))
  );
  readonly totalRequisitions = computed(() =>
    this.requisitionStatus().reduce((sum, s) => sum + s.value, 0)
  );
  readonly totalMonthlyRequests = computed(() =>
    this.monthlyTrend().reduce((sum, m) => sum + m.requests, 0)
  );

  readonly trendDirection = computed(() => {
    const trend = this.monthlyTrend();
    if (trend.length < 2) return 'stable';
    const last = trend[trend.length - 1].requests;
    const prev = trend[trend.length - 2].requests;
    if (last > prev) return 'up';
    if (last < prev) return 'down';
    return 'stable';
  });

  private mockMonthlyTrend: MonthlyTrend[] = [
    { month: 'Jan', requests: 28, approved: 20, completed: 15 },
    { month: 'Feb', requests: 35, approved: 25, completed: 18 },
    { month: 'Mar', requests: 42, approved: 30, completed: 24 },
    { month: 'Apr', requests: 38, approved: 28, completed: 22 },
    { month: 'May', requests: 52, approved: 38, completed: 30 },
    { month: 'Jun', requests: 48, approved: 35, completed: 28 },
  ];

  private mockCategoryBreakdown: CategoryItem[] = [
    { name: 'Electronics', count: 62, color: '#3b82f6' },
    { name: 'Furniture', count: 38, color: '#10b981' },
    { name: 'Office Supplies', count: 28, color: '#f59e0b' },
    { name: 'Vehicles', count: 12, color: '#8b5cf6' },
    { name: 'Infrastructure', count: 16, color: '#ef4444' },
  ];

  private mockDepartmentActivity: DeptActivity[] = [
    { department: 'IT Department', requests: 48, pct: 24 },
    { department: 'Human Resources', requests: 32, pct: 16 },
    { department: 'Finance', requests: 28, pct: 14 },
    { department: 'Operations', requests: 36, pct: 18 },
    { department: 'Marketing', requests: 20, pct: 10 },
    { department: 'Administration', requests: 22, pct: 11 },
    { department: 'Procurement', requests: 14, pct: 7 },
  ];

  constructor() {
    this.updateDateTime();
    const interval = setInterval(() => this.updateDateTime(), 1000);
    this.destroyRef.onDestroy(() => {
      clearInterval(interval);
      if (this.autoRefreshInterval) {
        clearInterval(this.autoRefreshInterval);
        this.autoRefreshInterval = null;
      }
    });
  }

  ngOnInit(): void {
    this.refreshData();
  }

  apiConnectionHint(): string {
    return pasApiUrlHint();
  }

  private num(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  private formatMoney(value: number | undefined | null): string {
    if (value == null || Number.isNaN(value)) return '—';
    return '$' + Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  private mapSeverity(severity: string | undefined | null): 'Critical' | 'Warning' | 'Attention' {
    const s = (severity || '').toLowerCase();
    if (s.includes('critical') || s.includes('high')) return 'Critical';
    if (s.includes('warning') || s.includes('medium')) return 'Warning';
    return 'Attention';
  }

  private mapStatusToRow(s: string | undefined | null): RequisitionStatus {
    const m = (s || '').trim().toLowerCase();
    const map: Record<string, RequisitionStatus> = {
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
      completed: 'Completed',
      issued: 'Issued',
    };
    return map[m] || 'Pending';
  }

  isPendingStatus(status: string): boolean {
    return status.trim().toLowerCase() === 'pending';
  }

  private formatShortDate(iso: string | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  private computeComplianceScore(d: DashboardStatistics): number {
    const pending = this.num(d.pendingRequisitions);
    const approved = this.num(d.approvedRequisitions);
    const completed = this.num(d.completedRequisitions);
    const issued = this.num(d.issuedRequisitions);
    const rejected = this.num(d.rejectedRequisitions);
    const total = pending + approved + completed + issued + rejected;
    if (total <= 0) return 94;
    const openRatio = pending / total;
    const score = Math.round(Math.max(62, Math.min(99, 100 - openRatio * 55 - rejected * 0.8)));
    return score;
  }

  refreshData(): void {
    this.loadDashboardStatistics();
    this.loadRecentServiceRequests();
  }

  loadDashboardStatistics(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.dashboardService
      .getStatistics()
      .pipe(
        catchError((err: unknown) => {
          this.loadError.set(this.describeHttpError(err));
          return of(null);
        }),
        finalize(() => {
          this.isLoading.set(false);
          this.hasLoadedOnce.set(true);
        }),
      )
      .subscribe((response) => {
        if (response?.success && response.data) {
          this.applyStatistics(response.data);
          this.lastRefreshed.set(new Date().toLocaleString());
          this.loadError.set(null);
          this.isMockData.set(false);
        } else if (response && !response.success) {
          this.loadError.set(response.message || 'Dashboard statistics could not be loaded.');
          this.useMockFallback();
        } else if (!response) {
          this.useMockFallback();
        } else {
          this.loadError.set('Dashboard returned no statistics payload.');
          this.useMockFallback();
        }
      });
  }

  private useMockFallback(): void {
    this.isMockData.set(true);
    const mock: DashboardStatistics = {
      totalProperties: 156, totalLocations: 12, totalSafetyBoxes: 48, totalItems: 2847,
      totalSuppliers: 23, totalEmployees: 89, pendingRequisitions: 12, approvedRequisitions: 34,
      issuedRequisitions: 28, completedRequisitions: 156, rejectedRequisitions: 5,
      pendingInspections: 8, approvedReceiving: 42, rejectedReceiving: 3,
      totalStockValue: 450000, lowStockItemsCount: 7, outOfStockItemsCount: 2,
      totalPropertyValue: 2500000, propertiesByLocation: 12, propertiesByType: 5,
      requisitionsByStatus: [
        { label: 'Pending', value: 12, color: '#f59e0b' },
        { label: 'Approved', value: 34, color: '#10b981' },
        { label: 'Rejected', value: 5, color: '#ef4444' },
        { label: 'Completed', value: 156, color: '#3b82f6' },
        { label: 'Issued', value: 28, color: '#8b5cf6' },
      ],
      propertiesByLocationChart: [
        { label: 'Main Warehouse', value: 45, color: '#3b82f6' },
        { label: 'Branch A', value: 32, color: '#10b981' },
        { label: 'Branch B', value: 24, color: '#f59e0b' },
        { label: 'Regional Hub', value: 55, color: '#8b5cf6' },
      ],
      stockMovementsByMonth: [],
      receivingByStatus: [],
      dailyCreatedProperties: [],
      recentActivities: [],
      lowStockAlerts: [],
      pendingTasks: [],
      quickActions: [],
    };
    this.applyStatistics(mock);
    this.requisitionsFromApi.set(false);
    this.recentRequisitions.set(this.fallbackSampleRequisitions());
    this.loadError.set(null);
  }

  private describeHttpError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        return `Unable to reach the API (${err.url || 'unknown URL'}). ${pasApiUrlHint()}`;
      }
      const body = err.error;
      const msg =
        body && typeof body === 'object' && 'message' in body && typeof (body as { message?: string }).message === 'string'
          ? (body as { message: string }).message
          : err.message;
      return `Request failed (${err.status}). ${msg}`;
    }
    return `Unable to reach the dashboard API. ${pasApiUrlHint()}`;
  }

  loadRecentServiceRequests(): void {
    this.requisitionsLoading.set(true);
    this.serviceRequests
      .getAll({ pageNumber: 1, pageSize: 8 })
      .pipe(
        catchError(() => {
          this.requisitionsFromApi.set(false);
          this.recentRequisitions.set(this.fallbackSampleRequisitions());
          return EMPTY;
        }),
        finalize(() => this.requisitionsLoading.set(false)),
      )
      .subscribe((res) => {
        if (!res) return;
        if (res.success === false) {
          this.requisitionsFromApi.set(false);
          this.recentRequisitions.set(this.fallbackSampleRequisitions());
          return;
        }
        this.requisitionsFromApi.set(true);
        const list = res.data ?? [];
        if (!list.length) {
          this.recentRequisitions.set(this.fallbackSampleRequisitions());
          return;
        }
        const rows: RequisitionRow[] = list.map((sr) => ({
          id: sr.id,
          requestor: sr.requesterName || '—',
          item: sr.purpose?.trim() || (sr.totalItems > 1 ? `${sr.totalItems} line items` : 'Service request'),
          quantity: this.num(sr.totalQuantity),
          date: this.formatShortDate(sr.requestDate),
          status: this.mapStatusToRow(sr.status),
        }));
        this.recentRequisitions.set(rows);
      });
  }

  private fallbackSampleRequisitions(): RequisitionRow[] {
    return [
      { id: 'REQ-2024-042', requestor: 'Abebe Kebede', item: 'Dell Latitude Laptop', quantity: 2, date: '28 Apr 2024', status: 'Pending' },
      { id: 'REQ-2024-041', requestor: 'Meron Alemu', item: 'Office Chairs (Ergonomic)', quantity: 5, date: '27 Apr 2024', status: 'Approved' },
      { id: 'REQ-2024-040', requestor: 'Getachew Tadesse', item: 'HP LaserJet Printer', quantity: 1, date: '26 Apr 2024', status: 'Rejected' },
      { id: 'REQ-2024-039', requestor: 'Sara Tilahun', item: 'A4 Printer Paper (10 boxes)', quantity: 10, date: '25 Apr 2024', status: 'Completed' },
      { id: 'REQ-2024-038', requestor: 'Biruk Desta', item: 'Conference Table', quantity: 1, date: '24 Apr 2024', status: 'Issued' },
      { id: 'REQ-2024-037', requestor: 'Tsion Girma', item: 'Network Switch Cisco', quantity: 3, date: '23 Apr 2024', status: 'Pending' },
      { id: 'REQ-2024-036', requestor: 'Hanna Solomon', item: 'Projector Epson', quantity: 2, date: '22 Apr 2024', status: 'Approved' },
      { id: 'REQ-2024-035', requestor: 'Elias Worku', item: 'Air Conditioner 2 Ton', quantity: 4, date: '21 Apr 2024', status: 'Completed' },
    ];
  }

  private applyStatistics(d: DashboardStatistics): void {
    this.summaryCards.set([
      {
        title: 'Total Property Value', value: this.formatMoney(d.totalPropertyValue),
        trend: 'Across all assets', icon: 'bi bi-currency-dollar', color: 'blue',
        microPct: Math.min(100, Math.round((this.num(d.totalPropertyValue) / 5000000) * 100)),
      },
      {
        title: 'Total Properties', value: this.num(d.totalProperties).toLocaleString(),
        trend: `${this.num(d.propertiesByType)} types`, icon: 'bi bi-buildings', color: 'green',
        microPct: Math.min(100, Math.round((this.num(d.totalProperties) / 300) * 100)),
      },
      {
        title: 'Total Locations', value: this.num(d.totalLocations).toLocaleString(),
        trend: 'Facilities managed', icon: 'bi bi-geo-alt', color: 'purple',
        microPct: Math.min(100, Math.round((this.num(d.totalLocations) / 20) * 100)),
      },
      {
        title: 'Total Safety Boxes', value: this.num(d.totalSafetyBoxes).toLocaleString(),
        trend: 'Secure storage units', icon: 'bi bi-box-seam', color: 'orange',
        microPct: Math.min(100, Math.round((this.num(d.totalSafetyBoxes) / 80) * 100)),
      },
      {
        title: 'Pending Requisitions', value: this.num(d.pendingRequisitions).toLocaleString(),
        trend: 'Awaiting action', icon: 'bi bi-clock', color: 'red',
        microPct: this.totalRequisitions() > 0 ? Math.round((this.num(d.pendingRequisitions) / this.totalRequisitions()) * 100) : 0,
      },
      {
        title: 'Employees', value: this.num(d.totalEmployees).toLocaleString(),
        trend: 'Active staff', icon: 'bi bi-people', color: 'teal',
        microPct: Math.min(100, Math.round((this.num(d.totalEmployees) / 150) * 100)),
      },
    ]);

    const chart = d.requisitionsByStatus || [];
    this.requisitionStatus.set(
      chart.length
        ? chart.map((c) => ({ label: c.label, value: this.num(c.value), color: c.color || '#64748b' }))
        : [
            { label: 'Pending', value: this.num(d.pendingRequisitions), color: '#f59e0b' },
            { label: 'Approved', value: this.num(d.approvedRequisitions), color: '#10b981' },
            { label: 'Rejected', value: this.num(d.rejectedRequisitions), color: '#ef4444' },
            { label: 'Completed', value: this.num(d.completedRequisitions), color: '#3b82f6' },
            { label: 'Issued', value: this.num(d.issuedRequisitions), color: '#8b5cf6' },
          ],
    );

    const locChart = d.propertiesByLocationChart || [];
    if (locChart.length) {
      this.locationDistribution.set(
        locChart.map((c) => ({ name: c.label, value: this.num(c.value) })),
      );
    } else {
      this.locationDistribution.set([]);
    }

    this.complianceScore.set(this.computeComplianceScore(d));

    this.lowStockAlerts.set(
      (d.lowStockAlerts || []).map((a, idx) => ({
        id: idx + 1,
        item: a.itemName,
        sku: a.sku,
        currentStock: this.num(a.currentStock),
        minLevel: this.num(a.minStockLevel),
        location: a.location || '—',
        level: this.mapSeverity(a.severity),
      })),
    );

    this.recentActivities.set(
      (d.recentActivities || [])
        .filter(a => a.action && a.entityName)
        .map((a, i) => ({
          id: i + 1,
          title: a.action || 'Activity',
          description: [a.entityName, a.userName].filter(Boolean).join(' · ') || '—',
          time: a.timeAgo || (a.actionDate ? new Date(a.actionDate).toLocaleString() : '—'),
          icon: a.icon?.startsWith('bi') ? a.icon : 'bi bi-activity',
        })),
    );

    if (!d.recentActivities?.length || this.isMockData()) {
      this.recentActivities.set([
        { id: 1, title: 'Property Added', description: 'Office Building B · John Admin', time: '2 hours ago', icon: 'bi bi-building-add' },
        { id: 2, title: 'Requisition Approved', description: 'Laptop Request · Sarah Manager', time: '3 hours ago', icon: 'bi bi-check-circle' },
        { id: 3, title: 'Inventory Adjusted', description: 'Stock Level Update · Mike Wilson', time: '5 hours ago', icon: 'bi bi-arrow-repeat' },
        { id: 4, title: 'Transfer Completed', description: 'Dell Latitude Laptop · Abebe K.', time: '1 day ago', icon: 'bi bi-arrow-left-right' },
        { id: 5, title: 'GRN Received', description: 'Electronics Shipment · Hanna S.', time: '1 day ago', icon: 'bi bi-truck' },
        { id: 6, title: 'Safety Box Opened', description: 'SAB-BL-003 · Getachew T.', time: '2 days ago', icon: 'bi bi-box-seam' },
      ]);
    }

    this.monthlyTrend.set(this.mockMonthlyTrend);
    this.categoryBreakdown.set(this.mockCategoryBreakdown);
    this.departmentActivity.set(this.mockDepartmentActivity);

    this.topRequestedItems.set([
      { id: 1, name: 'Laptop', category: 'Electronics', quantity: 48, requests: 52 },
      { id: 2, name: 'Office Chair', category: 'Furniture', quantity: 120, requests: 38 },
      { id: 3, name: 'Printer Paper', category: 'Office Supplies', quantity: 500, requests: 32 },
      { id: 4, name: 'Monitor', category: 'Electronics', quantity: 28, requests: 28 },
      { id: 5, name: 'Desk Lamp', category: 'Furniture', quantity: 35, requests: 25 },
      { id: 6, name: 'Air Conditioner', category: 'HVAC', quantity: 12, requests: 18 },
    ]);
  }

  updateDateTime(): void {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    };
    this.currentDate.set(now.toLocaleDateString('en-US', options));
    this.currentTime.set(now.toLocaleTimeString('en-US', { hour12: true }));
  }

  toggleAutoRefresh(): void {
    this.isAutoRefreshEnabled.update((enabled) => !enabled);
    if (this.isAutoRefreshEnabled()) {
      if (this.autoRefreshInterval) clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = setInterval(() => this.refreshData(), 30000);
    } else if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
  }

  viewAllRequisitions(): void {
    void this.router.navigate(['/admin/requisitions']);
  }

  openRequisition(id: string): void {
    void this.router.navigate(['/admin/requisitions']);
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
      case 'Critical': return 'alert-critical';
      case 'Warning': return 'alert-warning';
      case 'Attention': return 'alert-attention';
      default: return 'alert-info';
    }
  }

  getCumulativeOffset(index: number): number {
    const items = this.requisitionStatus();
    const total = items.reduce((s, i) => s + i.value, 0);
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += (items[i]?.value || 0) / (total || 1);
    }
    return -offset * 402;
  }

  inStockPct(current: number, min: number): number {
    return Math.min(100, (current / (min || 1)) * 100);
  }

  getCategoryColor(name: string): string {
    const map: Record<string, string> = {
      'Electronics': '#3b82f6',
      'Furniture': '#10b981',
      'Office Supplies': '#f59e0b',
      'Vehicles': '#8b5cf6',
      'Infrastructure': '#ef4444',
      'HVAC': '#06b6d4',
    };
    return map[name] || '#64748b';
  }
}
