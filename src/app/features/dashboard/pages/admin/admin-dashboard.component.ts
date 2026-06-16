import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { EMPTY } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { DashboardService, DashboardStatistics } from '../../../../core/services/dashboard.service';
import { ServiceRequestService } from '../../../requisition/service-requests/services/service-request.service';
import { NotificationService as ToastService } from '../../../../core/services/notification.service';


type RequisitionStatus = 'Pending' | 'Approved' | 'Rejected' | 'Completed' | 'Issued';

interface RequisitionRow {
  readonly id: string;
  readonly srNumber: string;
  readonly requestor: string;
  readonly department: string;
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
    this.dashboardService.getStatistics().subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.hasLoadedOnce.set(true);
        if (response?.success && response.data) {
          this.applyStatistics(response.data);
          this.lastRefreshed.set(new Date().toLocaleString());
          this.loadError.set(null);
        } else {
          this.loadError.set(response?.message || 'Dashboard statistics are currently unavailable.');
        }
      },
      error: (err: unknown) => {
        this.isLoading.set(false);
        this.hasLoadedOnce.set(true);
        this.loadError.set(this.describeHttpError(err));
      },
    });
  }

  private describeHttpError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        return `Unable to reach the API (${err.url || 'unknown URL'}). Ensure the backend is running on port 5028.`;
      }
      const body = err.error;
      const msg =
        body && typeof body === 'object' && 'message' in body && typeof (body as { message?: string }).message === 'string'
          ? (body as { message: string }).message
          : err.message;
      return `Request failed (${err.status}). ${msg}`;
    }
    return `Unable to reach the dashboard API. Ensure the backend is running on port 5028.`;
  }

  loadRecentServiceRequests(): void {
    this.requisitionsLoading.set(true);
    this.serviceRequests
      .getAll({ pageNumber: 1, pageSize: 8 })
      .pipe(
        catchError(() => {
          this.requisitionsFromApi.set(false);
          return EMPTY;
        }),
        finalize(() => this.requisitionsLoading.set(false)),
      )
      .subscribe((res) => {
        if (!res) return;
        if (res.success === false) {
          this.requisitionsFromApi.set(false);
          return;
        }
        this.requisitionsFromApi.set(true);
        const list = res.data ?? [];
        if (!list.length) {
          return;
        }
        const rows: RequisitionRow[] = list.map((sr) => ({
          id: sr.id,
          srNumber: sr.srNumber || '—',
          requestor: sr.requesterName || '—',
          department: sr.department || '—',
          item: sr.purpose?.trim() || (sr.totalItems > 1 ? `${sr.totalItems} line items` : 'Service request'),
          quantity: this.num(sr.totalQuantity),
          date: this.formatShortDate(sr.requestDate),
          status: this.mapStatusToRow(sr.status),
        }));
        this.recentRequisitions.set(rows);
      });
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

    this.monthlyTrend.set(d.monthlyTrend || []);
    this.categoryBreakdown.set(
      d.categoryBreakdown?.map(c => ({ name: c.label, count: c.value, color: c.color })) ||
      d.propertiesByLocationChart?.map(c => ({ name: c.label, count: c.value, color: c.color })) ||
      []
    );
    this.departmentActivity.set(d.departmentActivity || []);
    this.topRequestedItems.set(d.topRequestedItems || []);
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
    void this.router.navigate(['/admin/requisitions', id]);
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
