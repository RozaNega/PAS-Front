import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { DashboardService, DashboardStatistics } from '../../../../core/services/dashboard.service';
import { WorkflowService } from '../../../../core/services/workflow.service';
import { NotificationService as ToastService } from '../../../../core/services/notification.service';
import { pasApiUrlHint } from '../../../../core/config/api-base';

interface HighValueRequisition {
  id: string;
  srNumber: string;
  employeeName: string;
  estimatedCost: number;
  status: string;
  submittedDate: string;
  pendingDays: number;
}

interface CriticalAlert {
  id: number;
  title: string;
  description: string;
  severity: 'Critical' | 'High' | 'Normal';
  time: string;
}

@Component({
  selector: 'app-director-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './director-dashboard.component.html',
  styleUrl: './director-dashboard.component.scss',
})
export class DirectorDashboardComponent implements OnInit {
  readonly Math = Math;
  readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dashboardService = inject(DashboardService);
  private readonly workflowService = inject(WorkflowService);
  private readonly toast = inject(ToastService);

  readonly currentDate = signal('');
  readonly currentTime = signal('');
  readonly isLoading = signal(false);
  readonly hasLoadedOnce = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly lastRefreshed = signal<string | null>(null);
  readonly isMockData = signal(false);

  readonly summaryCards = signal<
    { title: string; value: string; trend: string; icon: string; color: string; microPct: number }[]
  >([
    { title: 'Total Stock Value', value: '—', trend: '—', icon: 'bi bi-currency-dollar', color: 'blue', microPct: 0 },
    { title: 'Total Requisitions', value: '—', trend: '—', icon: 'bi bi-file-earmark-text', color: 'green', microPct: 0 },
    { title: 'Pending Approvals', value: '—', trend: '—', icon: 'bi bi-clock', color: 'red', microPct: 0 },
    { title: 'Critical Alerts', value: '—', trend: '—', icon: 'bi bi-exclamation-triangle', color: 'orange', microPct: 0 },
  ]);

  readonly highValueRequisitions = signal<HighValueRequisition[]>([]);
  readonly criticalAlerts = signal<CriticalAlert[]>([]);

  readonly trendDirection = computed(() => 'stable');
  readonly totalCriticalAlerts = computed(() => this.criticalAlerts().length);

  constructor() {
    this.updateDateTime();
    const interval = setInterval(() => this.updateDateTime(), 1000);
    this.destroyRef.onDestroy(() => clearInterval(interval));
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

  refreshData(): void {
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
        } else {
          this.useMockFallback();
        }
      });

    this.loadHighValueRequisitions();
  }

  private loadHighValueRequisitions(): void {
    const allRequests = this.workflowService.getAllRequests();
    const highValue = allRequests
      .filter((r) => (r.estimatedCost || 0) > 5000)
      .map((r) => ({
        id: r.id,
        srNumber: r.srNumber,
        employeeName: r.employeeName,
        estimatedCost: r.estimatedCost || 0,
        status: r.status,
        submittedDate: r.submittedDate.toISOString(),
        pendingDays: this.workflowService.getPendingDays(r),
      }))
      .sort((a, b) => b.estimatedCost - a.estimatedCost);

    this.highValueRequisitions.set(highValue.length > 0 ? highValue.slice(0, 10) : this.fallbackHighValue());
  }

  private fallbackHighValue(): HighValueRequisition[] {
    return [
      { id: '1', srNumber: 'SR-2026-001', employeeName: 'Abebe Kebede', estimatedCost: 15000, status: 'Pending Admin', submittedDate: '2026-05-28', pendingDays: 8 },
      { id: '2', srNumber: 'SR-2026-002', employeeName: 'Meron Alemu', estimatedCost: 12000, status: 'Pending Admin', submittedDate: '2026-05-30', pendingDays: 6 },
      { id: '3', srNumber: 'SR-2026-003', employeeName: 'Getachew Tadesse', estimatedCost: 8500, status: 'Pending', submittedDate: '2026-06-01', pendingDays: 4 },
    ];
  }

  private useMockFallback(): void {
    this.isMockData.set(true);
    this.summaryCards.set([
      { title: 'Total Stock Value', value: '$450,000', trend: 'Across all items', icon: 'bi bi-currency-dollar', color: 'blue', microPct: 75 },
      { title: 'Total Requisitions', value: '235', trend: 'All time', icon: 'bi bi-file-earmark-text', color: 'green', microPct: 60 },
      { title: 'Pending Requiring Director', value: '3', trend: 'High-value >$5K', icon: 'bi bi-clock', color: 'red', microPct: 30 },
      { title: 'Critical Alerts', value: '7', trend: 'Requires attention', icon: 'bi bi-exclamation-triangle', color: 'orange', microPct: 45 },
    ]);
    this.highValueRequisitions.set(this.fallbackHighValue());
    this.criticalAlerts.set([
      { id: 1, title: 'Critical Low Stock', description: 'Dell Latitude Laptop - only 2 units remaining', severity: 'Critical', time: '1 hour ago' },
      { id: 2, title: 'Policy Violation', description: 'Unauthorized stock adjustment attempt detected', severity: 'Critical', time: '3 hours ago' },
      { id: 3, title: 'Stale Pending Requisition', description: 'SR-2026-001 pending for 8 days without manager action', severity: 'High', time: '5 hours ago' },
      { id: 4, title: 'Quality Issue Reported', description: 'Inspection failed for GRN-2026-042', severity: 'High', time: '1 day ago' },
    ]);
    this.loadError.set(null);
  }

  private describeHttpError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        return `Unable to reach the API (${err.url || 'unknown URL'}). ${pasApiUrlHint()}`;
      }
      const body = err.error;
      const msg = body && typeof body === 'object' && 'message' in body ? (body as { message: string }).message : err.message;
      return `Request failed (${err.status}). ${msg}`;
    }
    return `Unable to reach the dashboard API. ${pasApiUrlHint()}`;
  }

  private applyStatistics(d: DashboardStatistics): void {
    this.summaryCards.set([
      {
        title: 'Total Stock Value', value: this.formatMoney(d.totalStockValue),
        trend: 'Across all items', icon: 'bi bi-currency-dollar', color: 'blue',
        microPct: Math.min(100, Math.round((this.num(d.totalStockValue) / 1000000) * 100)),
      },
      {
        title: 'Total Requisitions', value: (this.num(d.pendingRequisitions) + this.num(d.approvedRequisitions) + this.num(d.completedRequisitions)).toLocaleString(),
        trend: 'All time', icon: 'bi bi-file-earmark-text', color: 'green',
        microPct: Math.min(100, Math.round(((this.num(d.pendingRequisitions) + this.num(d.approvedRequisitions) + this.num(d.completedRequisitions)) / 500) * 100)),
      },
      {
        title: 'Pending Requiring Director', value: this.num(d.pendingRequisitions).toLocaleString(),
        trend: 'High-value >$5K', icon: 'bi bi-clock', color: 'red',
        microPct: this.num(d.pendingRequisitions) > 0 ? Math.min(100, this.num(d.pendingRequisitions) * 8) : 0,
      },
      {
        title: 'Critical Alerts', value: (this.num(d.lowStockItemsCount) + this.num(d.pendingInspections)).toLocaleString(),
        trend: 'Requires attention', icon: 'bi bi-exclamation-triangle', color: 'orange',
        microPct: Math.min(100, (this.num(d.lowStockItemsCount) + this.num(d.pendingInspections)) * 10),
      },
    ]);

    this.criticalAlerts.set([
      ...(d.lowStockAlerts || []).filter(a => (a.severity || '').toLowerCase().includes('critical')).map((a, i) => ({
        id: i + 1,
        title: 'Critical Low Stock',
        description: `${a.itemName} - only ${a.currentStock} units remaining`,
        severity: 'Critical' as const,
        time: 'Now',
      })),
      ...(d.pendingInspections > 0 ? [{
        id: 999,
        title: 'Pending Inspections',
        description: `${d.pendingInspections} inspections awaiting completion`,
        severity: 'High' as const,
        time: 'Current',
      }] : []),
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

  getStatusClass(status: string): string {
    const s = status.toLowerCase();
    if (s.includes('approved') || s.includes('completed')) return 'status-success';
    if (s.includes('pending') || s.includes('submitted') || s.includes('review')) return 'status-warning';
    if (s.includes('rejected') || s.includes('cancelled')) return 'status-danger';
    return 'status-info';
  }

  getAlertClass(severity: string): string {
    switch (severity) {
      case 'Critical': return 'alert-critical';
      case 'High': return 'alert-warning';
      default: return 'alert-info';
    }
  }

  viewAllRequisitions(): void {
    void this.router.navigate(['/director/requisitions']);
  }

  viewRequisitionDetail(id: string): void {
    void this.router.navigate(['/admin/requisitions', id]);
  }
}
