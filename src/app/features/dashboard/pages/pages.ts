import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { AuthService, DASHBOARD_ROLES, DashboardRole } from '../../../core/services/auth.service';

type Period = '7D' | '30D' | '90D';
interface StatCard {
  title: string;
  value: number;
  caption: string;
  icon: string;
}

interface BarDatum {
  label: string;
  value: number;
}

interface DonutDatum {
  label: string;
  value: number;
  color: string;
}

interface RoleDashboardConfig {
  label: string;
  heading: string;
  subtitle: string;
  statCards: StatCard[];
  barTitle: string;
  barSeries: BarDatum[];
  donutTitle: string;
  donutSeries: DonutDatum[];
  responsibilities: string[];
  flowFocus: string[];
}

@Component({
  selector: 'app-pages',
  imports: [DecimalPipe],
  templateUrl: './pages.html',
  styleUrl: './pages.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pages {
  private readonly roleStorageKey = 'pas-auth-role';
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly currentUser = toSignal(this.authService.currentUser$, {
    initialValue: this.authService.getCurrentUser(),
  });
  private readonly roleFromRoute = toSignal(
    this.route.data.pipe(
      map((data) =>
        String(
          data['dashboardRole'] ?? this.route.snapshot.paramMap.get('role') ?? '',
        ).toLowerCase(),
      ),
    ),
    {
      initialValue: String(
        this.route.snapshot.data['dashboardRole'] ?? this.route.snapshot.paramMap.get('role') ?? '',
      ).toLowerCase(),
    },
  );

  readonly selectedPeriod = signal<Period>('30D');
  readonly selectedRole = computed<DashboardRole>(() => {
    const rawRole = this.roleFromRoute();

    if (this.authService.isDashboardRole(rawRole)) {
      return rawRole;
    }

    return this.readInitialRole();
  });
  readonly isRoleLocked = computed(() => this.currentUser() !== null);

  readonly roleOptions: ReadonlyArray<{ slug: DashboardRole; label: string }> = [
    { slug: 'admin', label: 'Property Admin' },
    { slug: 'storekeeper', label: 'Storekeeper' },
    { slug: 'employee', label: 'Employee' },
    { slug: 'manager', label: 'Manager' },
    { slug: 'compliance-officer', label: 'Compliance Officer' },
  ];

  readonly periods: Period[] = ['7D', '30D', '90D'];

  readonly periodFactors: Record<Period, number> = {
    '7D': 0.82,
    '30D': 1,
    '90D': 1.18,
  };

  readonly trends = [
    { direction: 'up', value: '+4.2%' },
    { direction: 'up', value: '+2.1%' },
    { direction: 'up', value: '+5.0%' },
    { direction: 'down', value: '-1.3%' },
  ];

  setPeriod(period: Period): void {
    this.selectedPeriod.set(period);
  }

  setRole(role: DashboardRole): void {
    if (this.isRoleLocked()) {
      return;
    }

    this.persistRole(role);
  }

  readonly roleConfig = computed<RoleDashboardConfig>(
    () => this.dashboardConfigs[this.selectedRole()],
  );

  readonly summaryCards = computed(() => {
    const factor = this.periodFactors[this.selectedPeriod()];
    const cards = this.roleConfig().statCards;

    return cards.map((card) => ({ ...card, value: Math.round(card.value * factor) }));
  });

  readonly barSeries = computed(() => {
    const factor = this.periodFactors[this.selectedPeriod()];

    return this.roleConfig().barSeries.map((item) => ({
      ...item,
      value: Math.round(item.value * factor),
    }));
  });

  readonly maxBarValue = computed(() => Math.max(...this.barSeries().map((item) => item.value), 1));

  readonly donutSeries = computed(() => this.roleConfig().donutSeries);

  readonly donutGradient = computed(() => {
    const series = this.donutSeries();
    const total = series.reduce((sum, item) => sum + item.value, 0) || 1;
    let current = 0;
    const segments = series.map((item) => {
      const start = (current / total) * 100;
      current += item.value;
      const end = (current / total) * 100;
      return `${item.color} ${start}% ${end}%`;
    });

    return `conic-gradient(${segments.join(', ')})`;
  });

  private readonly dashboardConfigs: Record<DashboardRole, RoleDashboardConfig> = {
    admin: {
      label: 'Property Admin',
      heading: 'Property Admin Command Center',
      subtitle: 'Control the full lifecycle from receiving to disposal with cross-unit visibility.',
      statCards: [
        {
          title: 'Total Properties',
          value: 1245,
          caption: 'Assets under governance',
          icon: 'bi bi-building-fill-gear',
        },
        {
          title: 'Open Requests',
          value: 38,
          caption: 'Across all departments',
          icon: 'bi bi-hourglass-split',
        },
        {
          title: 'Role Assignments',
          value: 96,
          caption: 'Active access mappings',
          icon: 'bi bi-person-badge-fill',
        },
        {
          title: 'Lifecycle Alerts',
          value: 12,
          caption: 'Transfer/disposal exceptions',
          icon: 'bi bi-exclamation-triangle-fill',
        },
      ],
      barTitle: 'Lifecycle Throughput by Stage',
      barSeries: [
        { label: 'Receiving', value: 128 },
        { label: 'Transfer', value: 92 },
        { label: 'Disposal', value: 61 },
      ],
      donutTitle: 'Request Portfolio Status',
      donutSeries: [
        { label: 'Pending', value: 32, color: '#3b97d3' },
        { label: 'Approved', value: 54, color: '#16a34a' },
        { label: 'Rejected', value: 14, color: '#f65f83' },
      ],
      responsibilities: [
        'Manage property types, categories, and location structures.',
        'Assign role and permission controls across property operations.',
        'Monitor receiving, issuing, transfer, and disposal lifecycles.',
      ],
      flowFocus: [
        'Employee requests',
        'Manager decision',
        'Storekeeper issuance',
        'Admin oversight',
        'Compliance review',
      ],
    },
    storekeeper: {
      label: 'Storekeeper',
      heading: 'Storekeeper Inventory Control Board',
      subtitle: 'Track physical stock movement, shelf position, and issue readiness in real time.',
      statCards: [
        {
          title: 'Items in Stock',
          value: 782,
          caption: 'Available units in store',
          icon: 'bi bi-boxes',
        },
        { title: 'Today Received', value: 49, caption: 'GRN/FARN completed', icon: 'bi bi-truck' },
        {
          title: 'Today Issued',
          value: 34,
          caption: 'SIV/FAIV processed',
          icon: 'bi bi-box-arrow-right',
        },
        {
          title: 'Low Stock Lines',
          value: 11,
          caption: 'Need replenishment',
          icon: 'bi bi-clipboard2-pulse-fill',
        },
      ],
      barTitle: 'Stock Movement by Warehouse',
      barSeries: [
        { label: 'Main', value: 146 },
        { label: 'Annex', value: 103 },
        { label: 'Field', value: 74 },
      ],
      donutTitle: 'Issue Ticket Status',
      donutSeries: [
        { label: 'Pending Pick', value: 41, color: '#3b97d3' },
        { label: 'Issued', value: 46, color: '#16a34a' },
        { label: 'On Hold', value: 13, color: '#f79b3f' },
      ],
      responsibilities: [
        'Receive items into store and confirm GRN/FARN records.',
        'Issue approved items and update stock balance immediately.',
        'Maintain shelf, safety box, and quantity controls.',
      ],
      flowFocus: [
        'Request received',
        'Availability check',
        'Pick and issue',
        'Stock update',
        'Handover confirmation',
      ],
    },
    employee: {
      label: 'Employee',
      heading: 'Employee Requisition Workspace',
      subtitle:
        'Create requests quickly and monitor approval progress without leaving your workflow.',
      statCards: [
        {
          title: 'My Open Requests',
          value: 7,
          caption: 'Submitted and in process',
          icon: 'bi bi-journal-check',
        },
        {
          title: 'Approved This Month',
          value: 14,
          caption: 'Ready for pickup/use',
          icon: 'bi bi-patch-check-fill',
        },
        {
          title: 'Rejected Requests',
          value: 2,
          caption: 'Needs adjustment',
          icon: 'bi bi-x-octagon-fill',
        },
        {
          title: 'Avg. Approval Time',
          value: 3,
          caption: 'Days to decision',
          icon: 'bi bi-stopwatch-fill',
        },
      ],
      barTitle: 'Requests by Category',
      barSeries: [
        { label: 'IT', value: 36 },
        { label: 'Office', value: 52 },
        { label: 'Field', value: 28 },
      ],
      donutTitle: 'My Request Outcomes',
      donutSeries: [
        { label: 'Pending', value: 27, color: '#3b97d3' },
        { label: 'Approved', value: 61, color: '#16a34a' },
        { label: 'Rejected', value: 12, color: '#f65f83' },
      ],
      responsibilities: [
        'Submit store requests with item, quantity, and justification.',
        'Monitor request progression through approval stages.',
        'Adjust rejected requests and resubmit with correct details.',
      ],
      flowFocus: [
        'Create request',
        'Provide justification',
        'Track status',
        'Receive decision',
        'Collect issued item',
      ],
    },
    manager: {
      label: 'Manager',
      heading: 'Manager Approval Console',
      subtitle:
        'Validate necessity and budget alignment before forwarding requests to fulfillment.',
      statCards: [
        {
          title: 'Pending Approvals',
          value: 24,
          caption: 'Awaiting your decision',
          icon: 'bi bi-clipboard2-check-fill',
        },
        {
          title: 'Approved Today',
          value: 18,
          caption: 'Forwarded to store',
          icon: 'bi bi-check2-circle',
        },
        {
          title: 'Rejected Today',
          value: 4,
          caption: 'Returned with comments',
          icon: 'bi bi-x-circle-fill',
        },
        {
          title: 'Budget Exceptions',
          value: 6,
          caption: 'Require escalation',
          icon: 'bi bi-cash-stack',
        },
      ],
      barTitle: 'Approval Volume by Team',
      barSeries: [
        { label: 'Ops', value: 88 },
        { label: 'Admin', value: 64 },
        { label: 'Finance', value: 42 },
      ],
      donutTitle: 'Decision Mix',
      donutSeries: [
        { label: 'Pending', value: 35, color: '#3b97d3' },
        { label: 'Approved', value: 49, color: '#16a34a' },
        { label: 'Rejected', value: 16, color: '#f65f83' },
      ],
      responsibilities: [
        'Review request necessity and validate budget availability.',
        'Approve or reject with actionable comments for requesters.',
        'Forward approved requests to operational fulfillment.',
      ],
      flowFocus: [
        'Receive queue',
        'Validate budget',
        'Approve or reject',
        'Forward to store',
        'Track execution',
      ],
    },
    'compliance-officer': {
      label: 'Compliance Officer',
      heading: 'Compliance and Audit Oversight',
      subtitle: 'Detect process gaps, missing approvals, and policy exceptions across operations.',
      statCards: [
        {
          title: 'Audit Trails Reviewed',
          value: 189,
          caption: 'Transactions inspected',
          icon: 'bi bi-journal-text',
        },
        {
          title: 'Policy Violations',
          value: 5,
          caption: 'Requires remediation',
          icon: 'bi bi-shield-fill-exclamation',
        },
        {
          title: 'Missing Approvals',
          value: 8,
          caption: 'Incomplete workflow chains',
          icon: 'bi bi-file-earmark-break-fill',
        },
        {
          title: 'Resolved Findings',
          value: 27,
          caption: 'Closed this month',
          icon: 'bi bi-patch-check-fill',
        },
      ],
      barTitle: 'Findings by Process Area',
      barSeries: [
        { label: 'Requisition', value: 47 },
        { label: 'Issuance', value: 31 },
        { label: 'Transfer', value: 19 },
      ],
      donutTitle: 'Compliance Case Status',
      donutSeries: [
        { label: 'Open', value: 39, color: '#f65f83' },
        { label: 'In Review', value: 34, color: '#3b97d3' },
        { label: 'Closed', value: 27, color: '#16a34a' },
      ],
      responsibilities: [
        'Monitor workflow integrity and approval completeness.',
        'Review audit trails for misuse, gaps, or fraud signals.',
        'Issue corrective findings and track remediation closure.',
      ],
      flowFocus: [
        'Observe activities',
        'Flag anomalies',
        'Request evidence',
        'Record findings',
        'Close after remediation',
      ],
    },
  };

  private readInitialRole(): DashboardRole {
    const currentUser = this.currentUser();

    if (currentUser) {
      return this.authService.mapUserToDashboardRole(currentUser);
    }

    if (typeof localStorage === 'undefined') {
      return 'admin';
    }

    const stored = localStorage.getItem(this.roleStorageKey);
    if (stored && DASHBOARD_ROLES.includes(stored as DashboardRole)) {
      return stored as DashboardRole;
    }

    return 'admin';
  }

  private persistRole(role: DashboardRole): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(this.roleStorageKey, role);
  }
}
