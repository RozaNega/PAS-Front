import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

type ActivityAction = 'Created' | 'Approved' | 'Rejected' | 'Deleted';
type ActivityStatus = 'Normal' | 'Flagged';
type ActivityFilter = 'All Activities' | 'Approvals' | 'Rejections' | 'Suspicious / Flagged';

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
export class ComplianceOfficerDashboardComponent {
  readonly officerName = signal('Compliance Officer');
  readonly filters: ActivityFilter[] = [
    'All Activities',
    'Approvals',
    'Rejections',
    'Suspicious / Flagged',
  ];
  readonly selectedFilter = signal<ActivityFilter>('All Activities');

  readonly activityLogs = signal<ActivityLogEntry[]>([
    {
      id: 1,
      userName: 'Emma Collins',
      action: 'Created',
      module: 'Request',
      dateTime: 'Apr 25, 2026 08:15 AM',
      status: 'Normal',
    },
    {
      id: 2,
      userName: 'Mark Reid',
      action: 'Approved',
      module: 'Request',
      dateTime: 'Apr 25, 2026 08:42 AM',
      status: 'Normal',
    },
    {
      id: 3,
      userName: 'Lara Chen',
      action: 'Rejected',
      module: 'Inventory',
      dateTime: 'Apr 25, 2026 09:05 AM',
      status: 'Flagged',
    },
    {
      id: 4,
      userName: 'Noah Bright',
      action: 'Deleted',
      module: 'Request',
      dateTime: 'Apr 25, 2026 09:18 AM',
      status: 'Flagged',
    },
    {
      id: 5,
      userName: 'Sophia Reed',
      action: 'Approved',
      module: 'Inventory',
      dateTime: 'Apr 25, 2026 09:40 AM',
      status: 'Normal',
    },
  ]);

  readonly alerts = signal<AlertItem[]>([
    {
      title: 'Request approved without proper role',
      description: 'Review the approval trail for request #123 and confirm the approver role.',
      severity: 'High',
    },
    {
      title: 'Multiple rejections by same user',
      description: 'User Lara Chen has triggered repeated rejection events in a short time window.',
      severity: 'Medium',
    },
    {
      title: 'Unusual activity detected',
      description: 'Deleted request activity increased above the normal daily baseline.',
      severity: 'High',
    },
  ]);

  readonly summaryCards = computed<SummaryCard[]>(() => {
    const logs = this.activityLogs();

    return [
      { title: 'Total Activities', value: logs.length },
      {
        title: 'Approved Requests',
        value: logs.filter((item) => item.action === 'Approved').length,
      },
      {
        title: 'Rejected Requests',
        value: logs.filter((item) => item.action === 'Rejected').length,
      },
      { title: 'Flagged Issues', value: logs.filter((item) => item.status === 'Flagged').length },
    ];
  });

  readonly filteredLogs = computed(() => {
    const filter = this.selectedFilter();
    const logs = this.activityLogs();

    if (filter === 'All Activities') {
      return logs;
    }

    if (filter === 'Approvals') {
      return logs.filter((item) => item.action === 'Approved');
    }

    if (filter === 'Rejections') {
      return logs.filter((item) => item.action === 'Rejected');
    }

    return logs.filter((item) => item.status === 'Flagged');
  });

  readonly dailyActivityOverview = computed(() => {
    const logs = this.activityLogs();

    return [
      { label: 'Created', value: logs.filter((item) => item.action === 'Created').length },
      { label: 'Approved', value: logs.filter((item) => item.action === 'Approved').length },
      { label: 'Rejected', value: logs.filter((item) => item.action === 'Rejected').length },
      { label: 'Deleted', value: logs.filter((item) => item.action === 'Deleted').length },
    ];
  });

  setFilter(filter: ActivityFilter): void {
    this.selectedFilter.set(filter);
  }
}
