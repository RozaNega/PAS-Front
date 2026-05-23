import { Component, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
  imports: [CommonModule],
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
      request.id,
      'approve',
      'Compliance check passed successfully.',
      officerId,
      officer
    );
    alert(`Service Request ${request.srNumber} approved by Compliance.`);
    this.loadOversightRequests();
  }

  rejectRequest(request: ServiceRequest): void {
    const officer = this.currentUserService.getCurrentUserValue()?.fullName || 'Compliance Officer';
    const officerId = this.currentUserService.getCurrentUserValue()?.id || 'compliance_01';
    this.workflowService.complianceReviewRequest(
      request.id,
      'reject',
      'Compliance check failed.',
      officerId,
      officer
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
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  readonly currentTime = signal<string>(this.getCurrentTime());
  readonly currentLocation = signal<string>('Addis Ababa, Ethiopia');
  
  readonly profilePhoto = signal<SafeUrl | string | null>(null);
  readonly isValidatingPhoto = signal(false);
  readonly officerName = signal('Compliance Officer');
  greeting = this.getGreeting();
  private clockInterval?: any;

  complianceScores: ComplianceScore[] = [];

  riskSummary: RiskSummary[] = [];

  totalViolations = 0;

  violationTrends: ViolationTrend[] = [
    { month: 'Jul', critical: 5, high: 7, medium: 10, low: 12 },
    { month: 'Aug', critical: 4, high: 6, medium: 9, low: 11 },
    { month: 'Sep', critical: 4, high: 7, medium: 8, low: 10 },
    { month: 'Oct', critical: 3, high: 6, medium: 9, low: 9 },
    { month: 'Nov', critical: 3, high: 5, medium: 8, low: 8 },
    { month: 'Dec', critical: 3, high: 5, medium: 8, low: 7 },
  ];

  recentActivities: RecentActivity[] = [];

  quickStats: QuickStat[] = [];

  viewAllActivity(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
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
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }

  ngOnInit(): void {
    this.clockInterval = setInterval(() => {
      this.currentTime.set(this.getCurrentTime());
    }, 1000);

    const photoSub = initDashboardProfilePhoto(
      this.currentUserService,
      this.sanitizer,
      this.profilePhoto,
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
    this.complianceData.getDashboardStatistics().subscribe((stats) => {
      if (!stats) {
        this.scoreLabel = 'Unavailable';
        return;
      }

      const totalRequests =
        stats.pendingRequisitions +
        stats.approvedRequisitions +
        stats.issuedRequisitions +
        stats.completedRequisitions +
        stats.rejectedRequisitions;
      const compliantRequests =
        stats.approvedRequisitions + stats.issuedRequisitions + stats.completedRequisitions;
      const score = this.percent(compliantRequests, totalRequests);

      this.currentScore = score;
      this.scoreLabel =
        score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 60 ? 'Needs Review' : 'At Risk';
      this.totalViolations =
        stats.rejectedRequisitions +
        stats.pendingInspections +
        stats.lowStockItemsCount +
        stats.outOfStockItemsCount;

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

      this.quickStats = [
        { label: 'Total Requests', value: String(totalRequests), subtitle: 'From backend' },
        { label: 'Completed Requests', value: String(stats.completedRequisitions), subtitle: 'Closed' },
        { label: 'Pending Inspections', value: String(stats.pendingInspections), subtitle: 'Open' },
        { label: 'Low Stock Items', value: String(stats.lowStockItemsCount), subtitle: 'Needs action' },
      ];

      this.recentActivities = (stats.recentActivities || []).slice(0, 5).map((activity) => ({
        date: activity.timeAgo || new Date(activity.actionDate).toLocaleDateString(),
        description: `${activity.action}: ${activity.entityName}`,
        icon: activity.icon || 'i',
      }));
    });
  }

  private percent(part: number, total: number): number {
    if (!total || total <= 0) {
      return 100;
    }
    return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
  }

  remindManager(request: ServiceRequest): void {
    const officer =
      this.currentUserService.getCurrentUserValue()?.fullName || 'Compliance Officer';
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
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}

