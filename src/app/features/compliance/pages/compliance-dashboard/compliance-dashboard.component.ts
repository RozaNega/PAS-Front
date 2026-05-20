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

  currentScore = 92;
  scoreLabel = 'Excellent';
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

  complianceScores: ComplianceScore[] = [
    { category: 'Policy Adherence', percentage: 94 },
    { category: 'Documentation', percentage: 89 },
    { category: 'Approval Chain', percentage: 96 },
    { category: 'Audit Readiness', percentage: 91 },
    { category: 'Data Integrity', percentage: 95 },
  ];

  riskSummary: RiskSummary[] = [
    { severity: 'Critical', count: 3, open: 2 },
    { severity: 'High', count: 5, open: 3 },
    { severity: 'Medium', count: 8, open: 5 },
    { severity: 'Low', count: 7, open: 4 },
  ];

  totalViolations = 23;

  violationTrends: ViolationTrend[] = [
    { month: 'Jul', critical: 5, high: 7, medium: 10, low: 12 },
    { month: 'Aug', critical: 4, high: 6, medium: 9, low: 11 },
    { month: 'Sep', critical: 4, high: 7, medium: 8, low: 10 },
    { month: 'Oct', critical: 3, high: 6, medium: 9, low: 9 },
    { month: 'Nov', critical: 3, high: 5, medium: 8, low: 8 },
    { month: 'Dec', critical: 3, high: 5, medium: 8, low: 7 },
  ];

  recentActivities: RecentActivity[] = [
    { date: 'Dec 15, 2024', description: 'Critical violation detected: Missing documentation for TAG-001', icon: '🔴' },
    { date: 'Dec 14, 2024', description: 'High risk alert: Approval chain violation in SR-2024-122', icon: '🟠' },
    { date: 'Dec 13, 2024', description: 'Medium risk: Incomplete audit trail in GRN-2024-045', icon: '🟡' },
    { date: 'Dec 12, 2024', description: 'Low risk: Policy violation resolved - User access review completed', icon: '🟢' },
    { date: 'Dec 11, 2024', description: 'Compliance score improved to 92% (+2% from last month)', icon: '✅' },
  ];

  quickStats: QuickStat[] = [
    { label: 'Audit Coverage', value: '100%', subtitle: 'All modules' },
    { label: 'Compliance Score Trend', value: '▲ +2%', subtitle: 'Improving' },
    { label: 'Open Investigations', value: '3', subtitle: 'Active' },
    { label: 'Resolved This Month', value: '12', subtitle: 'Completed' },
  ];

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
