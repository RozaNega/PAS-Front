import { ChangeDetectionStrategy, Component, computed, signal, inject, OnInit } from '@angular/core';
import { DashboardService, DashboardStatistics } from '../../../../core/services/dashboard.service';
import { finalize } from 'rxjs';

type ActivityAction = 'Created' | 'Approved' | 'Rejected' | 'Deleted';
type ActivityStatus = 'Normal' | 'Flagged';
type ActivityFilter =
  | 'All Activities'
  | 'Suspicious / Flagged'
  | 'Access Control'
  | 'Policy Violations';

interface ActivityLogEntry {
  readonly id: number;
  readonly userName: string;
  readonly action: ActivityAction;
  readonly module: string;
  readonly dateTime: string;
  readonly status: ActivityStatus;
}

interface SummaryCard {
  readonly title: string;
  readonly value: number;
}

interface AlertItem {
  readonly title: string;
  readonly description: string;
  readonly severity: 'High' | 'Medium' | 'Low';
}

@Component({
  selector: 'app-compliance-officer-dashboard',
  templateUrl: './compliance-officer-dashboard.component.html',
  styleUrl: './compliance-officer-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComplianceOfficerDashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  readonly isLoading = signal(false);
  readonly statistics = signal<DashboardStatistics | null>(null);

  readonly officerName = signal('Compliance Officer');
  readonly filters: ActivityFilter[] = [
    'All Activities',
    'Access Control',
    'Policy Violations',
    'Suspicious / Flagged',
  ];
  readonly selectedFilter = signal<ActivityFilter>('All Activities');

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading.set(true);
    this.dashboardService.getStatistics().pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.statistics.set(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
      }
    });
  }

  readonly activityLogs = signal<ActivityLogEntry[]>([
    {
      id: 1,
      userName: 'Emma Collins',
      action: 'Created',
      module: 'AuditTrail',
      dateTime: 'Apr 25, 2026 08:15 AM',
      status: 'Normal',
    },
    {
      id: 2,
      userName: 'Mark Reid',
      action: 'Deleted',
      module: 'AccessControl',
      dateTime: 'Apr 25, 2026 08:42 AM',
      status: 'Normal',
    },
    {
      id: 3,
      userName: 'Lara Chen',
      action: 'Rejected',
      module: 'Policy',
      dateTime: 'Apr 25, 2026 09:05 AM',
      status: 'Flagged',
    },
    {
      id: 4,
      userName: 'Noah Bright',
      action: 'Deleted',
      module: 'AccessControl',
      dateTime: 'Apr 25, 2026 09:18 AM',
      status: 'Flagged',
    },
    {
      id: 5,
      userName: 'Sophia Reed',
      action: 'Created',
      module: 'AuditTrail',
      dateTime: 'Apr 25, 2026 09:40 AM',
      status: 'Normal',
    },
  ]);

  readonly alerts = signal<AlertItem[]>([
    {
      title: 'Unauthorized access attempt',
      description: 'Review the account and source for the failed access event.',
      severity: 'High',
    },
    {
      title: 'Policy exception detected',
      description: 'User Lara Chen triggered repeated policy exceptions in a short time window.',
      severity: 'Medium',
    },
    {
      title: 'Audit trail spike',
      description: 'AuditTrail activity increased above the normal daily baseline.',
      severity: 'High',
    },
  ]);

  readonly summaryCards = computed<SummaryCard[]>(() => {
    const stats = this.statistics();
    const logs = this.activityLogs();

    if (stats) {
      return [
        { title: 'Total Activities', value: stats.pendingRequisitions + stats.approvedRequisitions + stats.rejectedRequisitions },
        {
          title: 'Suspicious Actions',
          value: logs.filter((item) => item.status === 'Flagged').length,
        },
        {
          title: 'Violations Detected',
          value: logs.filter((item) => item.module === 'Policy').length,
        },
        {
          title: 'Audit Logs Reviewed',
          value: logs.filter((item) => item.module === 'AuditTrail').length,
        },
      ];
    }

    return [
      { title: 'Total Activities', value: logs.length },
      {
        title: 'Suspicious Actions',
        value: logs.filter((item) => item.status === 'Flagged').length,
      },
      {
        title: 'Violations Detected',
        value: logs.filter((item) => item.module === 'Policy').length,
      },
      {
        title: 'Audit Logs Reviewed',
        value: logs.filter((item) => item.module === 'AuditTrail').length,
      },
    ];
  });

  readonly filteredLogs = computed(() => {
    const filter = this.selectedFilter();
    const logs = this.activityLogs();

    if (filter === 'All Activities') {
      return logs;
    }

    if (filter === 'Access Control') {
      return logs.filter((item) => item.module === 'AccessControl');
    }

    if (filter === 'Policy Violations') {
      return logs.filter((item) => item.module === 'Policy' || item.status === 'Flagged');
    }

    return logs.filter((item) => item.status === 'Flagged');
  });

  readonly dailyActivityOverview = computed(() => {
    const logs = this.activityLogs();

    return [
      { label: 'AuditTrail', value: logs.filter((item) => item.module === 'AuditTrail').length },
      {
        label: 'AccessControl',
        value: logs.filter((item) => item.module === 'AccessControl').length,
      },
      { label: 'Policy', value: logs.filter((item) => item.module === 'Policy').length },
      {
        label: 'Flagged',
        value: logs.filter((item) => item.status === 'Flagged').length,
      },
    ];
  });

  setFilter(filter: ActivityFilter): void {
    this.selectedFilter.set(filter);
  }
}
