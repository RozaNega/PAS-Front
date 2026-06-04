import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { take } from 'rxjs';
import { CurrentUserService, CurrentUser } from '../../../../core/services/current-user.service';
import { initDashboardProfilePhoto } from '../../../../core/utils/dashboard-profile-photo.util';
import {
  WorkflowService,
  ServiceRequest,
  ApiServiceRequestRow,
} from '../../../../core/services/workflow.service';
import { ServiceRequestService } from '../../../requisition/service-requests/services/service-request.service';

export interface KeyMetric {
  title: string;
  subtitle: string;
  value: number;
  trend: string;
  tone: 'red' | 'green' | 'blue' | 'yellow';
}

export interface RequestTrendData {
  month: string;
  submitted: number;
  approved: number;
  rejected: number;
}

@Component({
  selector: 'app-manager-approval-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manager-approval-dashboard.component.html',
  styleUrl: './manager-approval-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManagerApprovalDashboardComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly workflowService = inject(WorkflowService);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly serviceRequestService = inject(ServiceRequestService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly subs: Subscription[] = [];
  private clockInterval?: ReturnType<typeof setInterval>;

  currentDate = new Date();
  greeting = this.getGreeting();
  managerName = signal('Manager');
  readonly currentDateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  readonly currentTime = signal<string>(this.getCurrentTime());
  readonly currentLocation = signal<string>('Addis Ababa, Ethiopia');
  
  readonly profilePhoto = signal<SafeUrl | string | null>(null);
  readonly isValidatingPhoto = signal(false);

  readonly managerQueueId = computed(() => this.workflowService.getManagerQueueIdForCurrentUser());

  readonly pendingRequests = computed(() =>
    this.workflowService.getRequestsForManager(this.managerQueueId()),
  );

  readonly pendingSummary = computed(() => {
    const pr = this.pendingRequests();
    let urgent = 0;
    let medium = 0;
    let normal = 0;
    let totalValue = 0;
    let waitSumDays = 0;
    const now = Date.now();
    for (const r of pr) {
      if (r.priority === 'Urgent' || r.priority === 'High') urgent++;
      else if (r.priority === 'Medium') medium++;
      else normal++;
      totalValue += r.estimatedCost || 0;
      waitSumDays += (now - new Date(r.submittedDate).getTime()) / 86400000;
    }
    return {
      urgent,
      medium,
      normal,
      totalValue,
      avgWaitDays: pr.length ? waitSumDays / pr.length : 0,
    };
  });

  readonly keyMetrics = computed<KeyMetric[]>(() => {
    const mgr = this.managerQueueId();
    const pending = this.pendingRequests();
    const all = this.workflowService.getRequestsForManagerAll(mgr);
    const urgentCount = pending.filter((r) => r.priority === 'Urgent' || r.priority === 'High').length;

    const weekAgo = Date.now() - 7 * 86400000;
    const approvedWeek = all.filter(
      (r) =>
        r.status === 'Manager Approved' &&
        r.managerReviewDate &&
        new Date(r.managerReviewDate).getTime() >= weekAgo,
    ).length;
    const rejectedWeek = all.filter(
      (r) =>
        r.status === 'Manager Rejected' &&
        r.managerReviewDate &&
        new Date(r.managerReviewDate).getTime() >= weekAgo,
    ).length;

    return [
      {
        title: 'Pending Approvals',
        subtitle: '',
        value: pending.length,
        trend: `🔴 Urgent / High: ${urgentCount}`,
        tone: urgentCount > 0 ? 'red' : 'blue',
      },
      {
        title: 'Approved (7 days)',
        subtitle: '',
        value: approvedWeek,
        trend: 'From workflow',
        tone: 'green',
      },
      {
        title: 'Rejected (7 days)',
        subtitle: '',
        value: rejectedWeek,
        trend: 'From workflow',
        tone: 'red',
      },
      {
        title: 'Total in queue (all statuses)',
        subtitle: '',
        value: all.length,
        trend: 'Assigned to this manager id',
        tone: 'blue',
      },
      {
        title: 'Pending value (est.)',
        subtitle: '',
        value: Math.round(this.pendingSummary().totalValue),
        trend: 'Sum of pending estimates',
        tone: 'yellow',
      },
    ];
  });

  readonly requestTrendData = computed<RequestTrendData[]>(() => {
    const mgr = this.managerQueueId();
    const all = this.workflowService.getRequestsForManagerAll(mgr);
    const now = new Date();
    const rows: RequestTrendData[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('en-US', { month: 'short' });
      const inMonth = (r: ServiceRequest) => {
        const sd = new Date(r.submittedDate);
        return sd.getFullYear() === d.getFullYear() && sd.getMonth() === d.getMonth();
      };
      rows.push({
        month: label,
        submitted: all.filter((r) => inMonth(r)).length,
        approved: all.filter(
          (r) => inMonth(r) && r.status === 'Manager Approved',
        ).length,
        rejected: all.filter(
          (r) => inMonth(r) && r.status === 'Manager Rejected',
        ).length,
      });
    }
    return rows;
  });

  getGreeting(): string {
    const hour = this.currentDate.getHours();
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

  submittedPoints(): string {
    const list = this.requestTrendData();
    return list.map((data, i) => `${50 + i * 45},${180 - Math.min(data.submitted * 10, 160)}`).join(' ');
  }

  approvedPoints(): string {
    const list = this.requestTrendData();
    return list.map((data, i) => `${50 + i * 45},${180 - Math.min(data.approved * 10, 160)}`).join(' ');
  }

  rejectedPoints(): string {
    const list = this.requestTrendData();
    return list.map((data, i) => `${50 + i * 45},${180 - Math.min(data.rejected * 10, 160)}`).join(' ');
  }

  ngOnInit(): void {
    this.subs.push(
      initDashboardProfilePhoto(this.currentUserService, this.sanitizer, this.profilePhoto),
    );

    this.subs.push(
      this.currentUserService.getCurrentUser().subscribe((user: CurrentUser | null) => {
        if (user) {
          this.managerName.set(user.fullName || user.username || 'Manager');
        }
        this.cdr.markForCheck();
      }),
    );

    this.pullPendingFromApi();

    this.subs.push(
      this.workflowService.getRequestUpdates().subscribe(() => {
        this.cdr.markForCheck();
      }),
      this.workflowService.getNotificationUpdates().subscribe(() => {
        this.cdr.markForCheck();
      }),
    );

    this.clockInterval = setInterval(() => {
      this.currentTime.set(this.getCurrentTime());
      this.cdr.markForCheck();
    }, 1000);
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  private pullPendingFromApi(): void {
    this.serviceRequestService
      .getServiceRequests()
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          const items = (res as { data?: { items?: ApiServiceRequestRow[] } })?.data?.items ?? [];
          this.workflowService.mergeApiServiceRequests(items, {
            managerQueueId: this.workflowService.getManagerQueueIdForCurrentUser(),
          });
          this.cdr.markForCheck();
        },
        error: () => {
          this.cdr.markForCheck();
        },
      });
  }

  getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'Urgent':
        return '🔴';
      case 'High':
        return '🔴';
      case 'Medium':
        return '🟡';
      case 'Normal':
      case 'Low':
        return '🟢';
      default:
        return '⚪';
    }
  }

  approveRequest(requestId: string): void {
    const managerId = this.workflowService.getDefaultManagerQueueId();
    const managerName = this.managerName();

    this.workflowService.managerReviewRequest(
      requestId,
      'approve',
      'Approved via dashboard quick action',
      managerId,
      managerName,
    );

    this.serviceRequestService
      .approveServiceRequest({ id: requestId, remarks: 'Approved via manager dashboard' })
      .pipe(take(1))
      .subscribe({ error: () => {} });
  }

  rejectRequest(requestId: string): void {
    const managerId = this.workflowService.getDefaultManagerQueueId();
    const managerName = this.managerName();
    const reason = prompt('Please enter a reason for rejection:');
    if (reason === null) return;

    this.workflowService.managerReviewRequest(
      requestId,
      'reject',
      reason || 'Rejected via dashboard',
      managerId,
      managerName,
    );

    this.serviceRequestService
      .reject({ id: requestId, reason: reason || 'Rejected via manager dashboard' })
      .pipe(take(1))
      .subscribe({ error: () => {} });
  }
  viewRequestDetails(requestId: string): void {
    void this.router.navigate(['/manager/approvals/pending']);
  }

  viewAllRequests(): void {
    void this.router.navigate(['/manager/approvals/pending']);
  }
}
