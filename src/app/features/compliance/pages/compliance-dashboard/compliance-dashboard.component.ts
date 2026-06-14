import { Component, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart, PieChart, LineChart, GaugeChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';
import { CurrentUserService, CurrentUser } from '../../../../core/services/current-user.service';
import { ProfileService } from '../../../../core/services/profile.service';
import {
  STALE_PENDING_DAYS,
  WorkflowService,
  ServiceRequest,
} from '../../../../core/services/workflow.service';
import { ComplianceDataService } from '../../../../core/services/compliance-data.service';
import { initDashboardProfilePhoto } from '../../../../core/utils/dashboard-profile-photo.util';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';

try { echarts.use([BarChart, PieChart, LineChart, GaugeChart, TooltipComponent, GridComponent, LegendComponent, TitleComponent, CanvasRenderer]); } catch {};

export interface ComplianceScore {
  category: string;
  percentage: number;
}

export interface RiskSummary {
  severity: string;
  count: number;
  open: number;
}

export interface ViolationTrend {
  month: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface RecentActivity {
  date: string;
  description: string;
  icon: string;
}

export interface QuickStat {
  label: string;
  value: string;
  subtitle: string;
}

@Component({
  selector: 'app-compliance-dashboard',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './compliance-dashboard.component.html',
  styleUrl: './compliance-dashboard.component.scss',
})
export class ComplianceDashboardComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly profileService = inject(ProfileService);
  private readonly workflowService = inject(WorkflowService);
  private readonly complianceData = inject(ComplianceDataService);
  private readonly sanitizer = inject(DomSanitizer);
  private subscriptions: Subscription[] = [];

  readonly stalePendingDays = STALE_PENDING_DAYS;
  readonly oversightRequests = signal<ServiceRequest[]>([]);
  readonly stalePendingCount = computed(() =>
    this.oversightRequests().filter((r) =>
      ['Submitted', 'Under Review'].includes(r.status),
    ).length,
  );

  readonly selectedRequest = signal<ServiceRequest | null>(null);

  approveRequest(request: ServiceRequest): void {
    const officer = this.currentUserService.getCurrentUserValue()?.fullName || 'Compliance Officer';
    const officerId = this.currentUserService.getCurrentUserValue()?.id || 'compliance_01';
    this.workflowService.complianceReviewRequest(
      request.id, 'approve', 'Compliance check passed successfully.', officerId, officer
    );
    alert(`Service Request ${request.srNumber} approved by Compliance.`);
    this.loadOversightRequests();
  }

  rejectRequest(request: ServiceRequest): void {
    const officer = this.currentUserService.getCurrentUserValue()?.fullName || 'Compliance Officer';
    const officerId = this.currentUserService.getCurrentUserValue()?.id || 'compliance_01';
    this.workflowService.complianceReviewRequest(
      request.id, 'reject', 'Compliance check failed.', officerId, officer
    );
    alert(`Service Request ${request.srNumber} rejected by Compliance.`);
    this.loadOversightRequests();
  }

  viewDetails(request: ServiceRequest): void {
    this.selectedRequest.set(request);
  }

  closeDetails(): void {
    this.selectedRequest.set(null);
  }

  currentScore = 0;
  scoreLabel = 'Loading';
  readonly currentDateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  readonly currentTime = signal<string>(this.getCurrentTime());
  readonly currentLocation = signal<string>('Addis Ababa, Ethiopia');

  readonly profilePhoto = signal<SafeUrl | string | null>(null);
  readonly isValidatingPhoto = signal(false);
  readonly officerName = signal('Compliance Officer');
  readonly isLoading = signal(true);
  greeting = this.getGreeting();
  private clockInterval?: any;

  complianceScores: ComplianceScore[] = [];
  riskSummary: RiskSummary[] = [];
  totalViolations = 0;

  violationTrends: ViolationTrend[] = [];

  recentActivities: RecentActivity[] = [];
  quickStats: QuickStat[] = [];

  viewAllActivity(event?: Event): void {
    if (event) event.preventDefault();
    void this.router.navigate(['/compliance-officer/risk-alerts']);
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }

  getCurrentTime(): string {
    return new Date().toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
    });
  }

  // ─── Chart Options ──────────────────────────────────────

  get gaugeOption(): EChartsOption {
    return {
      series: [{
        type: 'gauge', startAngle: 220, endAngle: -40,
        min: 0, max: 100,
        center: ['50%', '55%'], radius: '85%',
        progress: { show: true, width: 12, itemStyle: { color: this.currentScore >= 90 ? '#22c55e' : this.currentScore >= 75 ? '#f59e0b' : '#ef4444' } },
        axisLine: { lineStyle: { width: 12, color: [[this.currentScore / 100, this.currentScore >= 90 ? '#22c55e' : this.currentScore >= 75 ? '#f59e0b' : '#ef4444'], [1, '#e2e8f0']] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: { show: false },
        title: { show: false },
        data: [{ value: this.currentScore }],
      }],
    };
  }

  get scorePieOption(): EChartsOption {
    const colors: Record<string, string> = {
      'Request Compliance': '#6366f1',
      'Inspection Readiness': '#22c55e',
      'Stock Health': '#f59e0b',
      'Fulfillment': '#3b82f6',
    };
    return {
      tooltip: { trigger: 'item', formatter: (p: unknown) => {
        const item = p as { name: string; value: number; percent: number };
        return `${item.name}: ${item.value}%`;
      } },
      series: [{
        type: 'pie', radius: ['55%', '75%'],
        center: ['50%', '50%'],
        label: { show: true, position: 'outside', formatter: (p: unknown) => {
          const item = p as { name: string; value: number };
          return `${item.name}\n${item.value}%`;
        }, fontSize: 10, color: '#64748b', lineHeight: 14 },
        labelLine: { length: 8, length2: 12, smooth: true },
        data: this.complianceScores.map(s => ({
          name: s.category, value: s.percentage,
          itemStyle: { color: colors[s.category] || '#6366f1' },
        })),
      }],
    };
  }

  get trendLineOption(): EChartsOption {
    const months = this.violationTrends.map(t => t.month);
    const maxVal = Math.max(
      ...this.violationTrends.flatMap(t => [t.critical, t.high, t.medium, t.low]), 10
    );
    return {
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, textStyle: { fontSize: 11, color: '#64748b' } },
      grid: { left: 40, right: 16, top: 16, bottom: 40 },
      xAxis: { type: 'category', data: months, axisLabel: { fontSize: 10, color: '#94a3b8' } },
      yAxis: { type: 'value', max: maxVal + 2, axisLabel: { fontSize: 10, color: '#94a3b8' } },
      series: [
        { name: 'Critical', type: 'line', smooth: true, data: this.violationTrends.map(t => t.critical), lineStyle: { width: 2, color: '#ef4444' }, itemStyle: { color: '#ef4444' }, symbol: 'circle', symbolSize: 6 },
        { name: 'High', type: 'line', smooth: true, data: this.violationTrends.map(t => t.high), lineStyle: { width: 2, color: '#f97316' }, itemStyle: { color: '#f97316' }, symbol: 'circle', symbolSize: 6 },
        { name: 'Medium', type: 'line', smooth: true, data: this.violationTrends.map(t => t.medium), lineStyle: { width: 2, color: '#eab308' }, itemStyle: { color: '#eab308' }, symbol: 'circle', symbolSize: 6 },
        { name: 'Low', type: 'line', smooth: true, data: this.violationTrends.map(t => t.low), lineStyle: { width: 2, color: '#22c55e' }, itemStyle: { color: '#22c55e' }, symbol: 'circle', symbolSize: 6 },
      ],
    };
  }

  // ─── Lifecycle ─────────────────────────────────────────

  ngOnInit(): void {
    this.clockInterval = setInterval(() => {
      this.currentTime.set(this.getCurrentTime());
    }, 1000);

    const photoSub = initDashboardProfilePhoto(
      this.currentUserService, this.sanitizer, this.profilePhoto,
    );
    const userSub = this.currentUserService.getCurrentUser().subscribe((user: CurrentUser | null) => {
      if (user) {
        this.officerName.set(user.fullName || user.username || 'Compliance Officer');
      }
    });
    this.subscriptions.push(photoSub, userSub);

    this.workflowService.escalateStalePendingRequests(STALE_PENDING_DAYS);
    this.loadOversightRequests();
    this.loadBackendComplianceMetrics();

    this.subscriptions.push(
      this.workflowService.getRequestUpdates().subscribe(() => this.loadOversightRequests()),
      this.workflowService.getNotificationUpdates().subscribe(() => this.loadOversightRequests()),
    );
  }

  loadOversightRequests(): void {
    this.oversightRequests.set(
      this.workflowService.getComplianceOversightRequests(STALE_PENDING_DAYS),
    );
  }

  private loadBackendComplianceMetrics(): void {
    this.isLoading.set(true);
    this.complianceData.getDashboardStatistics().subscribe((stats) => {
      this.isLoading.set(false);
      if (!stats) {
        this.scoreLabel = 'Unavailable';
        return;
      }

      const totalRequests =
        stats.pendingRequisitions + stats.approvedRequisitions +
        stats.issuedRequisitions + stats.completedRequisitions + stats.rejectedRequisitions;
      const compliantRequests =
        stats.approvedRequisitions + stats.issuedRequisitions + stats.completedRequisitions;
      const score = this.percent(compliantRequests, totalRequests);

      this.currentScore = score;
      this.scoreLabel =
        score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 60 ? 'Needs Review' : 'At Risk';
      this.totalViolations =
        stats.rejectedRequisitions + stats.pendingInspections +
        stats.lowStockItemsCount + stats.outOfStockItemsCount;

      this.complianceScores = [
        { category: 'Request Compliance', percentage: score },
        {
          category: 'Inspection Readiness',
          percentage: this.percent(
            stats.approvedReceiving,
            stats.approvedReceiving + stats.rejectedReceiving + stats.pendingInspections,
          ),
        },
        {
          category: 'Stock Health',
          percentage: this.percent(
            stats.totalItems - stats.lowStockItemsCount - stats.outOfStockItemsCount,
            stats.totalItems,
          ),
        },
        {
          category: 'Fulfillment',
          percentage: this.percent(stats.completedRequisitions + stats.issuedRequisitions, totalRequests),
        },
      ];

      this.riskSummary = [
        { severity: 'Critical', count: stats.outOfStockItemsCount, open: stats.outOfStockItemsCount },
        { severity: 'High', count: stats.rejectedRequisitions, open: stats.rejectedRequisitions },
        { severity: 'Medium', count: stats.pendingInspections, open: stats.pendingInspections },
        { severity: 'Low', count: stats.lowStockItemsCount, open: stats.lowStockItemsCount },
      ];

      // Generate violation trends from available data or use defaults
      if (stats.monthlyTrend && stats.monthlyTrend.length > 0) {
        this.violationTrends = stats.monthlyTrend.map(m => ({
          month: m.month?.slice(0, 3) || m.month || '---',
          critical: Math.round(m.requests * 0.15),
          high: Math.round(m.requests * 0.25),
          medium: Math.round(m.requests * 0.35),
          low: Math.max(0, m.requests - Math.round(m.requests * 0.15) - Math.round(m.requests * 0.25) - Math.round(m.requests * 0.35)),
        }));
      } else {
        this.violationTrends = [
          { month: 'Jul', critical: 5, high: 7, medium: 10, low: 12 },
          { month: 'Aug', critical: 4, high: 6, medium: 9, low: 11 },
          { month: 'Sep', critical: 4, high: 7, medium: 8, low: 10 },
          { month: 'Oct', critical: 3, high: 6, medium: 9, low: 9 },
          { month: 'Nov', critical: 3, high: 5, medium: 8, low: 8 },
          { month: 'Dec', critical: 3, high: 5, medium: 8, low: 7 },
        ];
      }

      this.quickStats = [
        { label: 'Total Requests', value: String(totalRequests), subtitle: 'From backend' },
        { label: 'Completed Requests', value: String(stats.completedRequisitions), subtitle: 'Closed' },
        { label: 'Pending Inspections', value: String(stats.pendingInspections), subtitle: 'Open' },
        { label: 'Low Stock Items', value: String(stats.lowStockItemsCount), subtitle: 'Needs action' },
      ];

      this.recentActivities = (stats.recentActivities || []).slice(0, 5).map((activity) => ({
        date: activity.timeAgo || new Date(activity.actionDate).toLocaleDateString(),
        description: `${activity.action}: ${activity.entityName}`,
        icon: activity.icon || 'pi pi-info-circle',
      }));
    });
  }

  private percent(part: number, total: number): number {
    if (!total || total <= 0) return 100;
    return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
  }

  remindManager(request: ServiceRequest): void {
    const officer = this.currentUserService.getCurrentUserValue()?.fullName || 'Compliance Officer';
    const sent = this.workflowService.remindManagerForPendingRequest(request.id, officer);
    if (sent) {
      alert(`Reminder sent to the manager for ${request.srNumber}.`);
      this.loadOversightRequests();
    } else {
      alert('Could not send reminder — request may no longer be pending.');
    }
  }

  pendingDays(request: ServiceRequest): number {
    return this.workflowService.getPendingDays(request);
  }

  viewNotifications(): void {
    void this.router.navigate(['/compliance-officer/risk-alerts']);
  }

  ngOnDestroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
